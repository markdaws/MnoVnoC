#Overview
A tiny framework for creating models in node.js based server code.

When writing server code that fetches and persists data to a backing store, be it
MySQL, Redis, Riak etc. there are several features you want and a certain amount of
boilerplate code that is needed.  MnoVnoC is a simple framework that provides the
following helper features:

 - Validate model state before persisting to the backend
 - Know if data has changed and needs saving
 - Make CRUD (Create, Read, Update and Delete) operations consistent
 - Abstract backend calls from you app code, so you can hide implementation
   details and centralize connection pooling, retry logic etc.

The Model follows an Active record pattern: http://en.wikipedia.org/wiki/Active_record_pattern

#Installing
```shell
npm install m-no-v-no-c
```

#Model
This is the meat of the module. The sections below explain how to declare, define
and use models.

##Defining a model and creating an instance
```javascript
var Model = require('MnoVnoC').Model;
var Person = Model.derive({
    init: function(parameters) {
        // At this point the parameters have been set on the model, you can
        // perform any extra init tasks you need
    }
});

var p = new Person({ name: 'bob', age: 55 });
p.name  // bob
p.age   // 55
```

At this point you have a working model, but you cannot perform any CRUD operations
using this mode, to do so see the CRUD section below.

##Settings defaults on a model
When you define a model you can specify defaults for the properties in the model.  If these
values are not passed in the constructor they will get set on the new model e.g.

```javascript
var Model = require('MnoVnoC').Model;
var Person = Model.derive({
    defaults: {
        name: 'frank',
        age: 50
    }
});

var p = new Person();
p.name // frank
p.age  // 50

var p2 = new Person({ name: 'bob' });
p.name // bob
p.age  // 50
```

##Validating a models state
One of the main things you want to be able to do in a model is validation of fields to make sure user
values conform to the business rules of your model. You can explicity
call validate() to do a check of the current state of the model, or when you call save() the validate()
method is called before the model tries to save the data, you can check the error parameter in the save
callback to see if there were any validation errors.

NOTE: you must always code validate() with a callback.

###Example model definition with validation function
```javascript
var Model = require('MnoVnoC').Model;
var Person = Model.derive({
    validate: function(callback) {

        // If there are no errors an empty array must be returned.  It's up to you
        // what you put in the errors array, string, objects, numbers
        // it doesn't matter since it will be your application code
        // that is reading the array so it will know what to do with
        // the content
        var errors = [];

        // Check our parameters
        if (this.name === 'joe') {
            errors.push('nobody can be called joe!');
        }

        if (this.age > 130) {
           errors.push('you are too old');
        }

        // I like to make all my functions with callbacks truly async, even if
        // they don't have to be, the keep them consistent.  But you could imagine
        // a validation function that needs to talk to a DB async that would be
        // truly asyncronous
        process.nextTick(function() {
            callback(errors);
        });
    }
});
```

###Explicit validation check
```javascript

var p = new Person({
    name: 'joe',
    age: 200
});

p.validate(function(errors) {
    console.dir(errors); // ['nobody can be called joe!', 'you are too old']
});
```

###Validation checks on save
```javascript
var p = new Person({
});

p.save(function(error) {
    if (error) {
        // If the save failed because the validation function failed, then
        // the error object will have the validationErrors field set on
        // the object
        if (error.validationErrors) {
            console.dir(error.validationErrors);
        }
        else {
            // unexpected error, maybe network etc
        }
    }
});
```

##CRUD - create, read, update, delete
When you define a model, it comes with a field called "data" which is an object
containing the following methods, create, fetch, update, destroy. If you try to
call these default methods an exception will be throw.  In your model definition
you can override the data object and set the methods to connect and handle whatever
backend store you are utilizing e.g.

```javascript
var Person = Model.derive({
    data: {
        create: function(model, options, callback) { },
        update: function(model, options, callback) { },
        fetch: function(model, options, callback) { },
        destroy: function(model, options, callback) { }
    }
});
```
IMPORTANT: You never call the data.XXX methods directly, they are called indirectly by
other methods on the model, as explained below.

### Model.fetch()
To fetch values from your backing store into a model you need to override the data.fetch function.

```javascript
var Model = require('MnoVnoC').Model;
var Person = Model.derive({
    data: {
        fetch: function(model, options, callback) {

            // model -> the instance of the model where fetch() is being
            // called on.

            // Fetch datafrom backing store, using model.id e.g.
            // 'select * from Users where id="' + model.id + '"'
            var fakeDBData = { age: 99, name: 'frank' };

            // Once you have the values from the backend, update the
            // state of the model
            model.set(fakeDBData);
            callback();
        }
    }
});

var p = new Person({ id: 123 });
p.fetch({ someOptions: 999 }, function(error) {
    // At this point the model if fully initialized from
    // the backing store
    p.name // frank
    p.age  // 99
});
```
NOTE: The options parameter is optional, but there may be cases where you want to
pass in optional data that gets passed through to the data.XXX methods

### Model.destroy()
To delete an instance of your model, you need to override the data.destroy method:
```javascript
var Person = Model.derive({
    data: {
        destroy: function(model, options, callback) {

            // delete from backing store using model.id as the key
            callback();
        }
    }
});

var p = new Person({ id: 1234 });
p.destroy({ someOptions: 999 }, function(error) {
    // Model deleted from the backing store
});
```

### Model.save()
To create or update an existing model, you call model.save(), it takes a callback
and an options parameter (optional).  Calling save can do one of two things, if the
model represents a "new" object on the backend then data.create will be called, if the
model represents an existing entity on the backend then data.update() will be called.

To distinguish between the two, if a model instance has a field called "id" then it is
assumed the model represents an existing data item and update() is called, if the model
instance does not have an "id" field, then it is assumed to be a new data item and
"create" will be called.

An example of creating a new model
```javascript
var Person = Model.derive({
    data: {
        create: function(model, options, callback) {

            // save model values to the backend
            // var newId = myDBObject.save(model.name, model.age)
            // model.id = newId;

            // Once model has been saved we can execute the callback
            // if it failed you can pass an error as the first parameter
            // of the callback
            callback();
        }
    }
});

// Because the model does not have an "id" value, it is assumed
// to be new and so data.create will be called
var p = new Person({ name: 'bob', age: 55 });
p.save(function(error) {
    // At this point the model has been saved to the backing store
});
```
NOTE: In the create method, you will want to set model.id with the ID of the data
from the backing store, before calling back from create so that the model instance
now has an id field. If you don't do this then if you reuse the model instance and
call save() again, create() will be called instead of update() since the model will
still be considered "new" without an id field.

An example of updating an existing model
```javascript
var Person = Model.derive({
    data: {
        update: function(model, options, callback) {

            // Save model fields to backing store
            // myDBObject.update(model.name, model.age);
            callback();
        }
    }
});

// Since the model has an "id" property, it is considered to exist already on
// the backend, hence any call to save() will direct to data.update() instead of
// data.create()
var p = new Person({ id: 1234, name: 'frank' });
p.save(function(error) {
    // Model now has updated fields
});
```

### Model.changed / Model.hasChanged
Sometimes you want to know if a model is dirty, meaning some of the fields
have changed since the model was last fetched, you may also want to know which
of the fields have changed since the last time.  You can access this information
via Model.hasChanged() which returns true if the model has changed since it was
last fetched, and Model.changed() is an object that contains the fields that have
changed.

HOWEVER... in order to get this information, you need to update fields using the
Model.set(name, value) function.  If you set a value directly on an object e.g.
```javascript
myPerson.name = 'Pete';
```
This will not update the changed event, so instead, you need to update the object
via the set() method e.g.
```javascript
myPerson.set('name', 'Pete');
```
If you do this inside the update method you will get the hasChanged() and changed()
information e.g.

### Use getters and setters on your models
The set() method is nice, but calling myPerson.set('name', 'Pete') is downright ugly,
instead I would recommend that you use JavaScript getters and setters.  If you haven't
used these before, they are just methods you can define that get called when you get/set
a field on an object.  Take 2 minutes to read this article: http://ejohn.org/blog/javascript-getters-and-setters/
before continuing if you don't know how to use getters/setters already.

By using getters/setters on your model, you can hide the ugly set(name, value) calls
behind normal myPerson.name = 'Frank' syntax and still get the benefit of the changed() and
hasChanged() information.

Below is an example of how you can use getters and setters.

```javascript
/**
 * This example shows you how you can use getters/setters to make your
 * model easy to use and get changed information
 */

var Model = require('MnoVnoC').Model;

var Person = Model.derive({
    data: {
        update: function(model, options, callback) {

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

            // Send only changed info to the backend ...

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
```
NOTE: Hopefully you read the comments, but if you call set() with a parameter name that
starts with _ when you call changed() the name of the fields in the changed() object has
the _ removed.

##Events
Any model you define that derives from Model, will have event support, since Models inherit from the
node.js EventEmitter class.

To trigger an event on your model use the "emit" method e.g.
```javascript
var Model = require('MnoVnoC');
var Person = Model.derive({
    foo: function() {
        this.emit('foo', 1234, 'hello');
    }
});

var p = new Person({ name: 'bob', age: 55 });
p.on('foo', function(val1, val2) {
    console.log('foo was fired');
});

p.foo();  // event raised at this point
```

##refreshedAt
One way to tell if a models data has been fetched from the backing store is to check for the
presence of a field called refreshedAt on the model. Every time fetch() is successfully called
the refreshedAt value contains an updated Date value e.g.

```javascript
var p = new Person({ id: 12345 });
console.log(p.refreshedAt) // undefined

p.fetch(function(error) {
    console.log(p.refreshedAt) // Sun Mar 31 2013 18:34:39 GMT-0700 (PDT)
});
```

#Collection
No collection support at the moment, if you need one you can add it :)

#More Examples
For more examples, see the [unit tests](tests/model-tests.js)

#Development
```shell
git clone git@github.com:markdaws/MnoVnoC.git
cd MnoVnoC
npm install
npm test
```
