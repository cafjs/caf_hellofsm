const cli = require('caf_cli');
const AppActions = require('../actions/AppActions');

exports.connect = function(ctx) {
    return new Promise((resolve, reject) => {
        const sessionId = `hue${cli.randomString(8)}`;
        window.location.href = cli.patchURL(window.location.href, {
            session: sessionId
        });

        AppActions.setLocalState(ctx, {sessionId});
        const session = new cli.Session(window.location.href);

        session.onopen = async function() {
            console.log('open session');
            try {
                resolve(await AppActions.init(ctx));
            } catch (err) {
                reject(err);
            }
        };

        session.onmessage = function(msg) {
            console.log('message:' + JSON.stringify(msg));
            AppActions.message(ctx, msg);
        };

        session.onclose = function(err) {
            console.log('Closing:' + JSON.stringify(err));
            AppActions.closing(ctx, err);
            err && reject(err); // no-op if session already opened
        };

        ctx.session = session;
    });
};
