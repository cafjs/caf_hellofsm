'use strict';

const React = require('react');
const cE = React.createElement;
const url = require('url');

class UserApp extends React.Component {

    constructor(props) {
        super(props);
        if (typeof window !== 'undefined') {
            const parsedURL = url.parse(window.location.href);
            parsedURL.pathname = '/user/index.html';
            delete parsedURL.search; // no cache
            this.url =  url.format(parsedURL);
        } else {
            this.url = 'about:blank';
        }
    }

    render() {
        return (typeof window !== 'undefined') ?
            cE('iframe', {
                id: 'userIframe',
                // disable top-navigation
                sandbox:'allow-same-origin allow-popups allow-scripts allow-forms allow-pointer-lock allow-modals allow-downloads',
                className: 'iframe-div',
                frameBorder: 0,
                src: this.url
            }, null) :
        cE('div');
    }
}

module.exports = UserApp;
