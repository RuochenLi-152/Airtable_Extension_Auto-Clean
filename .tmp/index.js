
var ReactDOM = require('react-dom');
var React = require('react');
var ReactDOMServer = require('react-dom/server');

window['_airtableReact'] = React;
window['_airtableReactDOM'] = ReactDOM;
window['_airtableReactDOMServer'] = ReactDOMServer;
window['_airtableBlockCodeVersion'] = 'c50966b33a5290c9e39305574d9dae23ab912194';
var didRun = false;
window['_airtableRunBlock'] = function runBlock() {
    if (didRun) {
        console.log('Refusing to re-run block');
        return;
    }
    didRun = true;
    
    // Requiring the entry point file runs user code. Be sure to do any setup
    // above this line.
    require("./../frontend/index.js");
};
