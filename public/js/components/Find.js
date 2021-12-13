'use strict';

const React = require('react');
const rB = require('react-bootstrap');
const cE = React.createElement;
const AppActions = require('../actions/AppActions');
const url = require('url');

class Find extends React.Component {

    constructor(props) {
        super(props);
        this.doFind = this.doFind.bind(this);
        this.doURL = this.doURL.bind(this);
        this.doReset = this.doReset.bind(this);
    }

    doReset() {
        AppActions.hue_reset(this.props.ctx);
    }

    doFind() {
        AppActions.setLocalState(this.props.ctx, {displaySelectDevice: true});
        AppActions.hue_findDevices(this.props.ctx);
    }

    doURL() {
        AppActions.setLocalState(this.props.ctx, {displayURL: true});
    }

    render() {
        const info = this.props.selectedDevice &&
              this.props.devicesInfo[this.props.selectedDevice]  &&
              this.props.devicesInfo[this.props.selectedDevice].advertisement ||
              null;

        const disableFind = this.props.daemon &&
              (this.props.inIframe ||
               (this.props.devicesInfo &&
                (Object.keys(this.props.devicesInfo).length > 0))
              );

        return cE(rB.Form, {horizontal: true},
                  [
                      cE(rB.FormGroup, {controlId: 'findControlId', key:111},
                         cE(rB.Col, {sm:6, xs: 12},
                            cE(rB.ControlLabel, null, disableFind ? 'Manage' :
                              'Click Find to Start')
                           ),
                         cE(rB.Col, {sm:6, xs: 12},
                            cE(rB.ButtonGroup, null,
                               cE(rB.Button, {
                                   bsStyle: 'danger',
                                   onClick: this.doFind,
                                   disabled: !!disableFind
                               }, 'Find'),
                               cE(rB.Button, {
                                   bsStyle: 'primary',
                                   onClick: this.doURL,
                               }, 'URL'),
                               cE(rB.Button, {
                                   bsStyle: 'danger',
                                   onClick: this.doReset,
                               }, 'Reset')
                              )
                           )
                        ),
                      this.props.selectedDevice &&
                          cE(rB.FormGroup, {controlId: 'deviceId', key: 32},
                             cE(rB.Col, {componentClass: rB.ControlLabel, sm: 3,
                                         xs: 8},
                                'Device ID'),
                             cE(rB.Col, {sm: 3, xs: 8},
                                cE(rB.FormControl.Static, null,
                                   this.props.selectedDevice)
                               ),
                             cE(rB.Col, {componentClass: rB.ControlLabel, sm: 3,
                                         xs: 12},
                                'Info'),
                             cE(rB.Col, {sm: 3, xs: 12},
                                cE(rB.FormControl.Static,
                                   {style: {wordWrap: "break-word"}},
                                   info && JSON.stringify(info) || '')
                               )
                            )
                  ].filter(x => !!x)
                 );
    }
}

module.exports = Find;
