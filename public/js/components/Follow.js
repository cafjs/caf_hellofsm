'use strict';

const React = require('react');
const rB = require('react-bootstrap');
const cE = React.createElement;
const AppActions = require('../actions/AppActions');

class Follow extends React.Component {

    constructor(props) {
        super(props);
        this.doLink = this.doLink.bind(this);
        this.doUnlink = this.doUnlink.bind(this);
        this.doReset = this.doReset.bind(this);
        this.keyDown = this.keyDown.bind(this);
        this.handleFollow = this.handleFollow.bind(this);
        this.state = {target: ''};
    }

    handleFollow(ev) {
        this.setState({target: ev.target.value});
    }

    keyDown(ev) {
        if (ev.key === 'Enter') {
            ev.preventDefault();
            this.doLink(ev);
        }
    }

    doLink(ev) {
        if (this.state.target) {
            AppActions.follow(this.props.ctx, this.state.target);
            this.setState({target: ''});
        } else {
            AppActions.setError(this.props.ctx, new Error('Invalid name'));
        }
    }

    doUnlink(ev) {
        AppActions.unfollow(this.props.ctx);
        this.setState({target: ''});
    }

    doReset(ev) {
        AppActions.reset(this.props.ctx);
        this.setState({target: ''});
    }

    render() {
        return cE(rB.Form, {horizontal: true},
                  cE(rB.FormGroup, {controlId: 'followId', bsSize: 'large'},
                     cE(rB.Col, {sm:2, xs: 12},
                        cE(rB.ControlLabel, null, 'Link To')
                       ),
                     cE(rB.Col, {sm:4, xs: 12},
                        cE(rB.FormControl, {
                            type: 'text',
                            value: this.state.target,
                            placeholder: 'foo-bar',
                            onKeyPress: this.keyDown,
                            onChange: this.handleFollow
                        })
                       )
                    ),
                  cE(rB.FormGroup, {controlId: 'buttonsId', bsSize: 'large'},
                     cE(rB.Col, {smOffset:2 ,sm:6, xs: 12},
                        cE(rB.ButtonGroup, null,
                           cE(rB.Button, {
                               bsStyle: 'danger',
                               onClick: this.doReset
                           }, 'Reset'),
                           cE(rB.Button, {
                               bsStyle: 'default',
                               onClick: this.doUnlink
                           }, 'Unlink'),
                           cE(rB.Button, {
                               bsStyle: 'primary',
                               onClick: this.doLink
                           }, 'Link')
                          )
                       )
                    )
                 );
    }
}

module.exports = Follow;
