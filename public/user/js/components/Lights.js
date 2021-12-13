'use strict';

const React = require('react');
const rB = require('react-bootstrap');
const cE = React.createElement;
const AppActions = require('../actions/AppActions');

class Lights extends React.Component {

    constructor(props) {
        super(props);
        this.doTick = this.doTick.bind(this);
    }

    doTick() {
        AppActions.tick(this.props.ctx);
    }

    render() {
        const [r, y, g] = this.props.light === 'RED' ? [true, false, false] :
              (this.props.light === 'YELLOW' ? [false, true, false] :
               [false, false, true]);

        return cE(rB.Form, {horizontal: true},
                  cE(rB.FormGroup, {controlId: 'redId'},
                     cE(rB.Col, {sm:4, xs: 12},
                        cE('span', {className: r ? 'reddot' : 'graydot'})
                       )
                    ),
                  cE(rB.FormGroup, {controlId: 'yellowId'},
                     cE(rB.Col, {sm:4, xs: 12},
                        cE('span', {className: y ? 'yellowdot' : 'graydot'})
                       )
                    ),
                  cE(rB.FormGroup, {controlId: 'greenId'},
                     cE(rB.Col, {sm:4, xs: 12},
                        cE('span', {className: g ? 'greendot' : 'graydot'})
                       )
                    ),
                  cE(rB.FormGroup, {controlId: 'tickId'},
                     cE(rB.Col, {sm:4, xs: 12},
                         cE(rB.Button, {
                               bsStyle: 'primary',
                               onClick: this.doTick
                           }, 'Tick'),
                       )
                    )
                 );
    }
}

module.exports = Lights;
