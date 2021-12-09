#!/bin/bash
#build app
pushd public
echo "browserify  -d js/main.js -o js/build.js"
browserify  -d js/main.js -o js/build.js &
pid1=$!
echo "browserify js/main.js | uglifyjs > js/build.min.js"
export NODE_ENV=production
browserify js/main.js | uglifyjs > js/build.min.js &
pid2=$!
unset NODE_ENV
popd
wait $pid1
wait $pid2

#build iot
pushd iot
cafjs pack true . ./app.tgz &&  mv ./app.tgz ../public/iot.tgz

# browserify iot
cafjs mkStatic
echo "browserify --ignore ws -d . -o ../public/js/build-iot.js"
browserify --ignore ws -d . -o ../public/js/build-iot.js &
pid1=$!

echo "browserify --ignore ws . | uglifyjs > ../public/js/build-iot.min.js"
export NODE_ENV=production
browserify  --ignore ws . | uglifyjs > ../public/js/build-iot.min.js &
pid2=$!

wait $pid1
wait $pid2

unset NODE_ENV
# rm staticArtifacts.js
rm -fr node_modules/*;
popd #iot
