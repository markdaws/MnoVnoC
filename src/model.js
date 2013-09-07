var events = require('events'),
    util = require('util'),
    Utils = require('./utils');

/**
 * The building block of any model.  Models provide a way to have a 
 * consistent way to validate input and support regular CRUD operations
 */
function Model(properties, callback) {

    properties = properties || {};

    this._clearDirty();
    var key;

    // Set defaults if specified
    for (key in this.defaults) {
        if (this.defaults.hasOwnProperty(key)) {
            this.set(key, this.defaults[key]);
        }
    }

    for (key in properties) {
        if (properties.hasOwnProperty(key)) {
            this.set(key, properties[key]);
        }
    }
    
    // any property a user wants to pass in to the constructor
    // should be marked as dirty, unless the caller has passed
    // in an id value, in which case it is assumed the user is
    // creating this model from current data from the backing
    // store so we don't mark any fields as changed
    var dontMarkDirty = properties.id != null;
    if (dontMarkDirty) {
        this._clearDirty();
    }
    this.init.apply(this, arguments);
}
var EMPTY_DIRTY = {};

/**
 * Add basic event semantics to a model
 */
util.inherits(Model, events.EventEmitter);

/**
 * Each model has a "data" property, this is where you override
 * fetch/create
 */
Model.prototype.data = {
    destroy: function(model, options, callback) {
        process.nextTick(function() {
            callback({ notImplemented: true });
        });
    },
    fetch: function(model, options, callback) {
        process.nextTick(function() {
            callback({ notImplemented: true });
        });
    },
    create: function(model, options, callback) {
        process.nextTick(function() {
            callback({ notImplemented: true });
        });
    },
    update: function(model, options, callback) {
        process.nextTick(function() {
            callback({ notImplemented: true });
        });
    }
};

Model.prototype.destroy = function(options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    var self = this;
    this.data.destroy(this, options, function(error) {
        callback && callback(error);
    });
};

Model.prototype.fetch = function(options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    var self = this;
    this.data.fetch(this, options, function(error) {
        if (!error) {
            // Callers can look for the presence of this value to see if
            // the model has ever been fetched from the database
            self.refreshedAt = new Date();
            self._clearDirty();
        }

        callback && callback(error);
    });
};

Model.prototype.save = function(options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    var self = this;

    this.validate(function(errors) {
        if (errors.length > 0) {
            process.nextTick(function() {
                callback({ validationErrors: errors });
            });
            return;
        }

        if (self.id != null) {
            self.data.update(self, options, function(error) {
                if (!error) {
                    self._clearDirty();
                }
                callback && callback(error);
            });
        }
        else {
            self.data.create(self, options, function(error) {
                if (!error && self.id == null) {
                    error = {
                        badImplementation: true,
                        message: 'id property should have been set after create was called'
                    };
                }

                if (!error) {
                    self._clearDirty();
                }
                callback && callback(error);
            });
        }
    });
};

Model.prototype.isNew = function() {
    return this.id == null;
};

Model.prototype.hasChanged = function() {
    return this._dirtyFields !== EMPTY_DIRTY;
};

Model.prototype.changed = function() {
    if (!this.hasChanged()) {
        return {};
    }
    return this._dirtyFields;
};

Model.prototype.set = function(propertyName, value) {

    // User can pass an object that will set multiple values at once
    if (typeof propertyName === 'object') {
        var properties = propertyName;
        var hasId = false;
        for(var key in properties) {
            this.set(key, properties[key]);
            if (key === 'id') {
                hasId = true;
            }
        }
        if (hasId) {
            // If the caller did a multi set with an id then 
            // assume they are populating an existing object
            this._clearDirty();
        }
        return;
    }
    
    if (this[propertyName] === value) {
        return;
    }

    // Check if this is the first dirty property, since this is how we 
    // tell if there are any dirty fields or not
    if (!this.hasChanged()) {
        this._dirtyFields = {};
    }
    
    var dirtyName = propertyName;
    if (propertyName[0] === '_') {
        dirtyName = propertyName.substr(1);
    }    
    this._dirtyFields[dirtyName] = value;
    
    this[propertyName] = value;
};

Model.prototype._clearDirty = function() {
    this._dirtyFields = EMPTY_DIRTY;
};

Model.prototype.init = function() {
};

/**
 * Override to check the validity of a model at any point in time
 */
Model.prototype.validate = function(callback) {
    process.nextTick(function() {
        callback([]);
    });
};

Model.prototype.toJson = function() {
    throw 'not implemented';
};

Model.derive = function(instanceProperties) {
    // e.g. this is function Model()
    var base = this;

    var derived = function() { 
        // this is the executing function, so base.apply
        // calls Model() with the passed in arguments
        base.apply(this, arguments); 
    };

    // Copy across static properties
    Utils.extend(derived, base);

    // Make derived inherit the base
    Utils.extend(derived.prototype, base.prototype);
    
    // Overwrite any instance properties the user may have passed in
    Utils.extend(derived.prototype, instanceProperties);

    // Give callers access the the base init
    derived.super_ = base.prototype;

    return derived;
};

module.exports = Model;