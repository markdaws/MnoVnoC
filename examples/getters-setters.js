/**
 * This example shows you how you can use getters/setters to make your
 * model easy to use and get changed information
 */

var Model = require('../').Model;

var Person = Model.derive({

    data: {
        update: function(model, callback) {

            // Since we have change information, we can do a couple of
            // things, maybe we can check if nothing changed and short
            // circuit the update
            if (!model.hasChanged()) {
                process.nextTick(callback);
                return;
            }
            
            // We might want to only send the changed information to
            // our backing store, depending on how it's implemented
            var changed = model.changed();

            // Or you might want to send the complete model
            // state to your backing store
            var json = model.toJson();

            // pretend we save something
            process.nextTick(callback);
        }
    },

    // Using Javascript getters/setters provides some nice benefits that
    // we can keep track easily of the values that have been modified, by
    // using the set() function.  Calling set() updates the specified value
    // and also updates a changed collection that you have access to via
    // the changed() method. You can tell if things have changed by calling
    // the hasChanged() method
    get name() { return this._name; },
    set name(value) { 
        // There is a special naming convention you can use, if you prefix the
        // backing variable with an _ then the changed() collection will have
        // the variable name but without the _, so changing _name will show up
        // as "name" in the changed() collection.  This is nice since if you
        // want to pass the changed() collection to your backing store most
        // likely you won't want to have the _ in the names
        this.set('_name', value); 
    },

    get age() { return this._age; },
    set age(value) { this.set('_age', value); },

    get salary() { return this._salary; },
    set salary(value) { this.set('_salary', value); },

    toJson: function() {
        return {
            name: this.name,
            age: this.age,
            salary: this.salary
        };
    }
});

var p = new Person({
    id: 1234,
    name: 'frank',
    age: 95,
    salary: 10000
});

// Take a peek at the current state of the model
console.dir(p.toJson());

// Lets update something
p.age = 96;
p.salary = 15000;

// We can see what has changed
console.log('model changed:' + p.hasChanged());
console.dir(p.changed());

// save the updated model, since this model has an id, it is assumed
// it is an existing model that is being updated, so it goes into the 
// data.update method
p.save(function(error) {
    console.log('updated the model');

    // After a model has been successfully saved all of the changed
    // fields are cleared, so the changed state will have been reset
    console.log('after save, hasChanged: ' + p.hasChanged());
});

