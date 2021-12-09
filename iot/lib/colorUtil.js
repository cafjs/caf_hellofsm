/*!
Copyright 2020 Caf.js Labs and contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

/* Color Philips Hue Bluetooth: estimating gamut with a color triangle*/
const RED_X = 0.704;
const RED_Y = 0.296;
const GREEN_X = 0.17294;
const GREEN_Y = 0.74383;
const BLUE_X = 0.167;
const BLUE_Y= 0.04;

/* Philips hue color min/max values of color temperature for white light.*/
const MIN_TEMP = 150;
const MAX_TEMP = 500;

/* Philips hue color min/max values of brightness.*/
const MIN_BRIGHTNESS = 1;
const MAX_BRIGHTNESS = 254;

/* Philips hue color min/max values of color.*/
const MIN_COLOR = 1;
const MAX_COLOR = 254;


const isLeft = function(sX, sY, dX, dY, pX, pY) {
    return (((dX-sX)*(pY-sY)-(dY-sY)*(pX-sX)) > 0);
};

/*
  Find point in a segment of the triangle that is closest to the given external
  point, i.e., a best approximation for the color gamut of the bulb.

  y = m*(x-sX) +sY
  y = -1/m *(x -pX) + pY //perpendicular passing by point pX,pY

  Solve both together...

  But it may still be outside the segment...

  So we need to calculate distances of the projected point Q
  |SQ|, |QD| and |SD|

  if (|SQ| < |SD|) and (|QD| < |SD|) => in the segment
     otherwise  if (|SQ| < |QD|) pick S
                  else pick D
*/
const closestInSegment = function(sX, sY, dX, dY, pX, pY) {
    const distance = (aX,aY, bX, bY) => ((bX-aX)*(bX-aX) + (bY-aY) *(bY-aY));
    const m = (dY-sY)/(dX-sX);
    const x = (pX/m + m*sX + pY - sY)/(m + 1.0/m);
    const y = m*(x-sX) + sY;

    const sq = distance(sX, sY, x, y);
    const qd = distance(x, y, dX, dY);
    const sd = distance(sX, sY, dX, dY);

    if ((sq < sd) && (qd < sd)) {
        // in segment
        return [x,y];
    } else {
        return sq < qd ? [sX, sY] : [dX, dY];
    }
};

/* Three vectors, clockwise BG, GR, RB

   The three lines containing these vectors divide the space in 7 regions.

   Evaluate whether the point is on the left or right plane for each line to
    identify the region the point belongs to.

   Going clockwise:
   -Region 1 (top most):
     [L,L,R] -> Map to G
   -Region 2
     [R, L, R] -> Map to closest to GR
   -Region 3
     [R, L, L] -> Map to R
   -Region 4
     [R,R,L] -> Map to closest to RB
   -Region 5
     [L,R,L] -> Map to B
   -Region 6
     [L,R,R] -> Map to closest to BG
   -Region 7 (inside triangle)
     [R,R,R] -> leave it as it is...

   To check left/righ we use the sign of the vector cross product.

   To map to the closest point we project on the closest segment.
*/
const mapPointInTriangle = function(x,y) {
    const isLeftBG = isLeft(BLUE_X, BLUE_Y, GREEN_X, GREEN_Y, x, y);
    const isLeftGR = isLeft(GREEN_X, GREEN_Y, RED_X, RED_Y, x, y);
    const isLeftRB = isLeft(RED_X, RED_Y, BLUE_X, BLUE_Y, x, y);

    if (isLeftBG && isLeftGR && !isLeftRB) {
        // Region 1
        return [GREEN_X, GREEN_Y];
    } else if (!isLeftBG && isLeftGR && !isLeftRB) {
        // Region 2
        return closestInSegment(GREEN_X, GREEN_Y, RED_X, RED_Y, x ,y);
    } else if (!isLeftBG && isLeftGR && isLeftRB) {
        // Region 3
        return [RED_X, RED_Y];
    } else if (!isLeftBG && !isLeftGR && isLeftRB) {
        // Region 4
        return closestInSegment(RED_X, RED_Y, BLUE_X, BLUE_Y, x, y);
    } else if (isLeftBG && !isLeftGR && isLeftRB) {
        // Region 5
        return [BLUE_X, BLUE_Y];
    }  else if (isLeftBG && !isLeftGR && !isLeftRB) {
        // Region 6
        return  closestInSegment(BLUE_X, BLUE_Y, GREEN_X, GREEN_Y, x, y);
    } else if (!isLeftBG && !isLeftGR && !isLeftRB) {
        // Region 7
        // Inside the triangle!
        return  [x, y];
    } else {
        throw new Error('Bug: Cannot be all left orientation');
    }
};

const rgbToXY = exports.rgbToXY = function (r,g,b) {
    const gammaCorrect = (x) => (x > 0.04045) ?
          Math.pow((x + 0.055) / 1.055, 2.4) :
          x / 12.92;

    const all = [r/255.0, g/255.0, b/255.0];
    [r, g, b] = all.map(gammaCorrect);

    const X = r * 0.649926 + g * 0.103455 + b * 0.197109;
    const Y = r * 0.234327 + g * 0.743075 + b * 0.022598;
    const Z = r * 0.0 + g * 0.053077 + b * 1.035763;

    let x = X/(X+Y+Z);
    let y = Y/(X+Y+Z);
    [x, y] = mapPointInTriangle(x, y);
    // console.log('x:' +x + ' y:' + y + ' newX:' + newX + ' newY:' + newY);
    return [Math.trunc(x*65535), Math.trunc(y*65535), Y];
};

const clipBrightness = exports.clipBrightness = function(level) {
    return level < MIN_BRIGHTNESS ?
        MIN_BRIGHTNESS :
        (level > MAX_BRIGHTNESS ? MAX_BRIGHTNESS : level);
};

const clipColor = exports.clipColor = function(color) {
    const clipOne = (level) => level < MIN_COLOR ?
          MIN_COLOR :
          (level > MAX_COLOR ? MAX_COLOR : level);
    return {r: clipOne(color.r), g: clipOne(color.g), b: clipOne(color.b)};
};
