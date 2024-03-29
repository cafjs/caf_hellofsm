const AppConstants = require('../constants/AppConstants');

const isInIframe = () =>  (typeof window !== 'undefined') &&
          (window.location !== window.parent.location);


const AppReducer = function(state, action) {
    if (typeof state === 'undefined') {
        return  {displayURL: false, displaySpawn: false,
                 inIframe: isInIframe(), isClosed: false,
                 hue_daemon : null, hue_devicesInfo: {}, hue_error : null,
                 hue_selectedDevice: null, sessionId: 'default'};
    } else {
        switch(action.type) {
        case AppConstants.APP_UPDATE:
        case AppConstants.APP_NOTIFICATION:
            return Object.assign({}, state, action.state);
        case AppConstants.APP_ERROR:
            return Object.assign({}, state, {error: action.error});
        case AppConstants.WS_STATUS:
            return Object.assign({}, state, {isClosed: action.isClosed});
        default:
            return state;
        }
    };
};

module.exports = AppReducer;
