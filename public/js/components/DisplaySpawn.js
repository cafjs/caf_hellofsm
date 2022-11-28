'use strict';

const React = require('react');
const rB = require('react-bootstrap');
const cE = React.createElement;
const AppActions = require('../actions/AppActions');
const url = require('url');

class DisplaySpawn extends React.Component {

    constructor(props) {
        super(props);
        this.standaloneURL = null;
        if (typeof window !== 'undefined') {
            const parsedURL = url.parse(window.location.href);
             /* Web Bluetooth can only be used with https or localhost.
              *  Chrome allows subdomains in localhost, i.e.,
              *  root-helloiot.localhost, and wih local debugging the app
              *  is also exposed on host port 3003 by default.
              *
              */
            parsedURL.host = parsedURL.host.replace('localtest.me',
                                                    'localhost:3003');
            delete parsedURL.search; // no cache
            this.standaloneURL = url.format(parsedURL);
        }

        this.doDismiss = this.doDismiss.bind(this);
        this.doStandalone = this.doStandalone.bind(this);
    }

    doDismiss(ev) {
        AppActions.setLocalState(this.props.ctx, {displaySpawn: false});
    }

    doStandalone(ev) {
        window.open(this.standaloneURL);
        this.doDismiss();
    }

    render() {
        return cE(rB.Modal, {show: !!this.props.displaySpawn,
                             onHide: this.doDismiss,
                             animation: false},
                  cE(rB.Modal.Header, {
                      className : 'bg-warning text-warning',
                      closeButton: true},
                     cE(rB.Modal.Title, null, 'Error')
                    ),
                  cE(rB.ModalBody, null,
                     cE('p', null, 'Web Bluetooth APIs are not available ' +
                        'on a cross-origin iframe.'),
                     cE('p', null, 'Do you want to open a new tab?' ),
                    ),
                  cE(rB.Modal.Footer, null,
                     cE(rB.ButtonGroup, null,
                        cE(rB.Button, {onClick: this.doDismiss}, 'Ignore'),
                        cE(rB.Button, {
                            bsStyle: 'danger',
                            onClick: this.doStandalone
                        }, 'Open')
                       )
                    )
                 );
    }
};

module.exports = DisplaySpawn;
