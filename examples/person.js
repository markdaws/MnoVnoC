var Async = require('async'),
    Model = require('../').Model;

/**
 * This is a fake DB for the example we use it to show how we
 * plug the model into the backend store, in reality this would
 * be mySQL, redis, mongo etc.
 */
var db = {
    // where we store the data fields
    data: {},
    uniqueId: 0,

    // helper wrappers
    get: function(id, callback) {
        var self = this;
        process.nextTick(function() {
            callback(null, self.data[id]);
        });
    },
    destroy: function(id, callback) {
        var self = this;
        process.nextTick(function() {
            delete self.data[id];
            callback();
        });
    },
    save: function(id, data, callback) {
        var self = this;
        process.nextTick(function() {
            self.data[id] = data;
            callback();
        });
    },

    getUniqueId: function() {
        return this.uniqueId++;
    }
};

/**
 * 
 */
var Person = Model.derive({

    // Settings defaults allows you to initialize properties
    // to a default value if they were not passed into the 
    // constructor
    defaults: {
        name: 'N/A'
    },

    init: function() {
        //TODO: These should not be explicitly set, the init should do that?
    },

    // The validate function allows you to add business rules to your model
    // It returns an array of errors, if there are no errors, an empty array
    // should be returned. validate() can be called explicitly, or it will
    // always be called before save is called automatically
    validate: function(callback) {
        
        // Validate must always return an array, if there are no
        // errors the array must be empty

        var errors = [];
        if (this.age < 0) {
            errors.push('age cannot be less than 0');
        }
        if (this.name === 'bob') {
            errors.push('bob is not a real name');
        }

        process.nextTick(function() {
            callback(errors);
        });
    },

    data: {
        create: function(model, callback) {

            var id = db.getUniqueId();

            // Get the JSON version of the model to save to backend
            db.save(id, model.toJson(), function(error) {

                // If everything was successful we set the id field in the
                // model, you have to do this, if a model has an id it 
                // indicates that it has been saved to the backend and
                // is not a new object
                model.id = id;

                callback(error);
            });
        },
        
        // Called when a user calls save() on a model that has an id, 
        // the presence of an id value indicates that the model already
        // exists in the backing store, hence we want to update it
        update: function(model, callback) {
            db.save(model.id, model.toJson(), function(error) {
                callback(error);
            });
        },

        // Called when a user calls fetch() on a model, this is where you
        // plumb into your backing store to get the model data
        fetch: function(model, callback) {
            db.get(model.id, function(error, modelData) {
                // In this example we saved a json object to the DB, so we 
                // now want to update the model to have all of its fields
                // set to the values from the DB, an easy way to do this
                // is to use the set() function                
                model.set(modelData);

                callback();
            });
        },

        // Called when destroy() is called on a model
        destroy: function(model, callback) {
            db.destroy(model.id, function(error) {
                callback(error);
            });
        }
    },

    // An explicit function to return a JSON version of the model,
    // you have to code this yourself
    toJson: function() {
        return {
            name: this.name,
            age: this.age,
            bio: this.bio
        };
    }
});

function runAllExamples() {
    Async.series([
        saveValidUser,
        failExplicitValidation,
        saveFailsValidation,
        fetchExistingPerson,
        updateExistingPerson
    ], function() {
        console.log('\n\nAll examples completed');
    });
}
runAllExamples();

var p1;
function saveValidUser(callback) {
    console.log('\n========== saveValidUser ==========');

    //Create a new person
    p1 = new Person({
        name: 'Frank',
        age: 50,
        bio: 'I like to make fun of dubstep'
    });

    // Save the person
    p1.save(function(error) {
        if (error) {
            console.dir(error);
        }
        else {
            // If the save was successful, the model will now have
            // an id from the backing store
            console.log('person saved, id:' + p1.id);
        }

        callback();
    });
}

function failExplicitValidation(callback) {
    console.log('\n========== failExplicitValidation ==========');

    // Create a new person that fails our validation rules
    var p2 = new Person({
        name: 'bob',
        age: -30
    });

    // We can explicitly validate input at this point
    p2.validate(function(errors) {
        if (errors.length > 0) {
            console.log('explicit validate failed:');
            console.dir(errors);
        }

        callback();
    });
}

function saveFailsValidation(callback) {
    console.log('\n========== saveFailsValidation ==========');

    // Create a new person that fails our validation rules
    var p2 = new Person({
        name: 'bob',
        age: -30
    });

    p2.save(function(error) {
        if (error) {

            // Two cases, could be a validation error or some other
            // error e.g. network issue trying to connect to the backend
            if (error.validationErrors) {
                console.log('Person save had validation errors');
                console.dir(error.validationErrors);
            }
            else {
                // Was some other type of error
                console.log('Save failed for unknown reason');
            }
        }

        callback();
    });
}

function fetchExistingPerson(callback) {
    console.log('\n========== fetchExistingPerson ==========');

    // Fetch an existing item from the backing store
    var p3 = new Person({
        id: p1.id
    });
    p3.fetch(function(error) {
        if (error) {
            console.log('Failed to fetch person');
        }
        else {
            console.log('Fetched existing person');
            console.dir(p3.toJson());
        }

        callback();
    });
}

function updateExistingPerson(callback) {
    console.log('\n========== updateExistingPerson ==========');

    // Fetch an existing item from the backing store
    var p4 = new Person({
        id: p1.id
    });
    p4.fetch(function(error) {
        if (error) {
            console.log('fetch failed');
            return;
        }

        // Set a new value for the bio
        p4.bio = 'This is an updated bio';

        p4.save(function(error) {
            if (error) {
                console.log('update save failed');
                return;
            }

            console.log('Person updated');
            console.dir(p4.toJson());
            callback(); 
        });
    });
}