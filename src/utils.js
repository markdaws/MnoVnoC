/**
 * Copied all of the properties from one object to another, including
 * getters and setters
 * 
 * Note: Taken from the underscore project, then copied from this
 * path: https://github.com/documentcloud/underscore/pull/275/files
 */
exports.extend = function(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function(source) {
        for (var prop in source) {
            var getter = source.__lookupGetter__(prop);
            var setter = source.__lookupSetter__(prop);
            
            if (getter || setter) {
                if (getter) obj.__defineGetter__(prop, getter);
                if (setter) obj.__defineSetter__(prop, setter);
            } else if (source[prop] !== undefined) {
                obj[prop] = source[prop];
            }
        }
    });
    return obj;
};