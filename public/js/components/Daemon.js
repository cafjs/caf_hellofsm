'use strict';

const React = require('react');
const rB = require('react-bootstrap');
const cE = React.createElement;
const AppActions = require('../actions/AppActions');
const url = require('url');

class Daemon extends React.Component {

    constructor(props) {
        super(props);
        this.handleDaemon = this.handleDaemon.bind(this);

        this.iotURL = null;
        if ((typeof window !== 'undefined') && window.location) {
            const parsedURL = url.parse(window.location.href);
            delete parsedURL.search; // no cache
            parsedURL.pathname = 'index-iot.html';
           this.iotURL = url.format(parsedURL);
        }
    }

    handleDaemon(e) {
        if (e && !this.props.daemon) {
            if (this.props.inIframe) {
                AppActions.setLocalState(this.props.ctx, {displaySpawn : true});
            } else {
                AppActions.hue_setDaemon(this.props.ctx, e);
            }
        }

        if (!e && this.props.daemon) {
            AppActions.hue_setDaemon(this.props.ctx, e);
        }
    }

    render() {
        return cE(rB.Form, {horizontal: true},
                  [
                      cE(rB.FormGroup, {controlId: 'findControlId', key: 12},
                         cE(rB.Col, {sm:6, xs: 12},
                            cE(rB.ControlLabel, null, 'Browser Daemon')
                           ),
                         cE(rB.Col, {sm:6, xs: 12},
                            cE(rB.ToggleButtonGroup, {
                                type: 'radio',
                                name : 'daemon',
                                value: !!this.props.daemon,
                                onChange: this.handleDaemon
                            },
                               cE(rB.ToggleButton, {value: false}, 'Off'),
                               cE(rB.ToggleButton, {value: true}, 'On')
                              )
                           )
                        ),
                      !this.props.inIframe &&
                          (this.props.daemon === this.props.sessionId) &&
                          cE(rB.FormGroup, {controlId: 'iframeId', key: 122},
                             cE('iframe', {
                                 // disable top-navigation
                                 sandbox: 'allow-same-origin allow-popups ' +
                                     'allow-scripts allow-forms ' +
                                     'allow-pointer-lock',
                                 frameBorder: 8,
                                 style: {maxHeight: '85px'},
                                 src: this.iotURL
                             }, null)
                            )
                  ].filter(x => !!x)
                 );
    }
}

module.exports = Daemon;
