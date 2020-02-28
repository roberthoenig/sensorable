export var LOG = function (...args) {
    if (LOG.enabled) {
        console.log(...args);
    }
}
LOG.enabled = true