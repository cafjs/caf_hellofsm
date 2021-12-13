'use strict';

const React = require('react');
const rB = require('react-bootstrap');
const AppActions = require('../actions/AppActions');
const AppStatus = require('./AppStatus');
const Find = require('./Find');
const UserApp = require('./UserApp');
const DisplayError = require('./DisplayError');
const DisplayURL = require('./DisplayURL');
const DisplaySpawn = require('./DisplaySpawn');
const DisplaySelectDevice = require('./DisplaySelectDevice');
const Daemon = require('./Daemon');

const cE = React.createElement;

class MyApp extends React.Component {
    constructor(props) {
        super(props);
        this.state = this.props.ctx.store.getState();
    }

    componentDidMount() {
        if (!this.unsubscribe) {
            this.unsubscribe = this.props.ctx.store
                .subscribe(this._onChange.bind(this));
            this._onChange();
        }
    }

    componentWillUnmount() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    _onChange() {
        if (this.unsubscribe) {
            this.setState(this.props.ctx.store.getState());
        }
    }

    render() {
        return cE('div', {className: 'container-fluid'},
                  cE(DisplayError, {
                      ctx: this.props.ctx,
                      hue_error: this.state.hue_error
                  }),
                  cE(DisplayURL, {
                      ctx: this.props.ctx,
                      displayURL: this.state.displayURL
                  }),
                  cE(DisplaySpawn, {
                      ctx: this.props.ctx,
                      displaySpawn: this.state.displaySpawn
                  }),
                  cE(DisplaySelectDevice, {
                      ctx: this.props.ctx,
                      devicesInfo: this.state.hue_devicesInfo,
                      selectedDevice: this.state.hue_selectedDevice,
                      displaySelectDevice: this.state.displaySelectDevice
                  }),
                  cE(rB.Panel, null,
                     cE(rB.Panel.Heading, null,
                        cE(rB.Panel.Title, null,
                           cE(rB.Grid, {fluid: true},
                              cE(rB.Row, null,
                                 cE(rB.Col, {sm:1, xs:1},
                                    cE(AppStatus, {
                                        isClosed: this.state.isClosed
                                    })
                                   ),
                                 cE(rB.Col, {
                                     sm: 5,
                                     xs:10,
                                     className: 'text-right'
                                 }, 'FSM Example'),
                                 cE(rB.Col, {
                                     sm: 5,
                                     xs:11,
                                     className: 'text-right'
                                 }, this.state.fullName)
                                )
                             )
                          )
                       ),
                     cE(rB.Panel.Body, null,
                        cE(rB.Panel, null,
                           cE(rB.Panel.Heading, null,
                              cE(rB.Panel.Title, null, 'Add Philips Hue bulb')
                             ),
                           cE(rB.Panel.Body, null,
                              cE(Daemon, {
                                  ctx: this.props.ctx,
                                  inIframe : this.state.inIframe,
                                  daemon: this.state.hue_daemon,
                                  sessionId: this.state.sessionId
                              }),
                              cE(Find, {
                                  ctx: this.props.ctx,
                                  inIframe : this.state.inIframe,
                                  daemon: this.state.hue_daemon,
                                  selectedDevice: this.state.hue_selectedDevice,
                                  devicesInfo: this.state.hue_devicesInfo,
                              })
                             )
                          ),
                        cE(UserApp, {
                            ctx: this.props.ctx
                        })
                       )
                    )
                 );
    }
};

module.exports = MyApp;
