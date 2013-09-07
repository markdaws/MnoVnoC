var should = require('should'),
    Model = require('../').Model;

// Change this to true to get the versioner to print out
// extra debug information during the tests
var log;
if (true) {
    log = {
        verbose: function(message) {
            console.log('[VERBOSE]: ' + message);
        },
        error: function(message, error) {
            error = error || {};
            console.error('[ERROR]: ' + message + ' : ' + JSON.stringify(error));
        }
    };
}

describe('model', function() {
    it('base model should support events', function(done) {
        var model = new Model();

        var eventParam;
        model.on('foo', function(param) {
            eventParam = param;
        });

        model.emit('foo', 12345);
        eventParam.should.equal(12345);
        done();
    });

    it('derived model should support events', function(done) {
        var ExtModel = Model.derive({});
        var model = new ExtModel();

        var eventParam;
        model.on('foo', function(param) {
            eventParam = param;
        });
        model.emit('foo', 12345);
        eventParam.should.equal(12345);
        done();
    });

    it('validate should not return any errors by default', function(done) {
        var TestModel = Model.derive({});
        var model = new TestModel();

        model.validate(function(errors) {
            errors.length.should.equal(0);
            done();
        });
    });

    it('derived model should call correct validate method', function(done) {
        var User = Model.derive({
            validate: function(callback) {
                callback(['there was an error']);
            }
        });

        var u = new User();
        u.validate(function(errors) {
            errors.length.should.equal(1);
            errors[0].should.equal('there was an error');
            done();
        });
    });

    it('init should be called in derived models, with correct args', function(done) {
        
        var User = Model.derive({
            init: function(parameters) {
                this.name.should.equal('frank');
                this.age.should.equal(55);

                parameters.name.should.equal(this.name);
                parameters.age.should.equal(this.age);
            }
        });

        var u = new User({ name:'frank', age:55 });
        u.name.should.equal('frank');
        u.age.should.equal(55);
        done();
    });

    it('getters and setters are preserved correctly', function(done) {

        var getterCalled = false, setterCalled = false;

        var Person = Model.derive({
            _name: 'frank',

            get name() {
                getterCalled = true;
                return this._name;
            },
            set name(value) {
                setterCalled = true;
                this._name = value;
            }
        });

        var p = new Person();
        p.name.should.equal('frank');
        getterCalled.should.equal(true);

        p.name = 'bob';
        p.name.should.equal('bob');
        setterCalled.should.equal(true);
        done();
    });

    it('data destroy is called', function(done) {
        var destroyModel,
            error = {};

        var Person = Model.derive({
            data: {
                destroy: function(model, options, callback) {
                    destroyModel = model;
                    process.nextTick(function() {
                        callback(error);
                    });
                }
            }
        });

        var p = new Person({});
        p.destroy(function(_error) {
            destroyModel.should.equal(p);
            _error.should.equal(error);
            done();
        });
    });

    it('destroy options passed correctly', function(done) {
        var destroyOptions;

        var Person = Model.derive({
            data: {
                destroy: function(model, options, callback) {
                    destroyOptions = options;
                    process.nextTick(function() {
                        callback();
                    });
                }
            }
        });

        var p = new Person({}),
            options = {};
        p.destroy(options, function(_error) {
            destroyOptions.should.equal(options);
            done();
        });
    });

    it('data fetch is called', function(done) {
        var fetchModel, error = {};
        var Person = Model.derive({
            data: {
                fetch: function(model, options, callback) {
                    fetchModel = model;
                    process.nextTick(function() {
                        callback(error);
                    });
                }
            }
        });

        var p = new Person({});
        p.fetch(function(_error) {
            fetchModel.should.equal(p);
            _error.should.equal(error);
            done();
        });
    });

    it('fetch options passed correctly', function(done) {
        var fetchModel, error = {};
        var Person = Model.derive({
            data: {
                fetch: function(model, options, callback) {
                    fetchModel = model;
                    process.nextTick(function() {
                        callback(error);
                    });
                }
            }
        });

        var p = new Person({});
        p.fetch(function(_error) {
            fetchModel.should.equal(p);
            _error.should.equal(error);
            done();
        });
    });

    it('data fetch options passed correctly', function(done) {
        var fetchOptions;
        var Person = Model.derive({
            data: {
                fetch: function(model, options, callback) {
                    fetchOptions = options;
                    process.nextTick(function() {
                        callback();
                    });
                }
            }
        });

        var p = new Person({}),
            options = {};
        p.fetch(options, function(_error) {
            fetchOptions.should.equal(options);
            done();
        });
    });

    it('refreshedAt field updated on successful fetch', function(done) {
        var fetchModel;
        var Person = Model.derive({
            data: {
                fetch: function(model, options, callback) {
                    fetchModel = model;
                    process.nextTick(function() {
                        callback();
                    });
                }
            }
        });

        var p = new Person({});
        should.not.exist(p.refreshedAt);
        p.fetch(function(error) {
            should.not.exist(error);
            fetchModel.should.equal(p);
            should.exist(p.refreshedAt);
            done();
        });
    });

    it('refreshedAt field not updated if fetch has error', function(done) {
        var fetchModel, error = {};
        var Person = Model.derive({
            data: {
                fetch: function(model, options, callback) {
                    fetchModel = model;
                    process.nextTick(function() {
                        callback(error);
                    });
                }
            }
        });

        var p = new Person({});
        should.not.exist(p.refreshedAt);

        p.fetch(function(_error) {
            fetchModel.should.equal(p);
            _error.should.equal(error);
            should.not.exist(p.refreshedAt);
            done();
        });
    });

    it('save should return an error if there are validation errors', function(done) {
        var fetchModel, error = {};
        var Person = Model.derive({
            validate: function(callback) {
                callback(['an error']);
            }
        });

        var p = new Person({});
        p.save(function(error) {
            should.exist(error);
            error.validationErrors[0].should.equal('an error');
            done();
        });
    });

    it('data create is called for new models', function(done) {
        var Person = Model.derive({
            data: {
                create: function(model, options, callback) {
                    process.nextTick(function() {
                        // Models should have ids after create was called, since the id is
                        // the value that determines if the model should be created or updated
                        // when save() is called
                        model.id = 12345;
                        callback();
                    });
                }
            }
        });

        var p = new Person({});
        should.not.exist(p.id);
        p.save(function(_error) {
            should.not.exist(_error);
            p.id.should.equal(12345);
            done();
        });
    });

    it('create options passed correctly', function(done) {
        var fetchOptions,
            Person = Model.derive({
                data: {
                    create: function(model, options, callback) {
                        fetchOptions = options;
                        process.nextTick(function() {
                            callback();
                        });
                    }
                }
            });

        var p = new Person({}),
            options = {};
        should.not.exist(p.id);
        p.save(options, function(_error) {
            fetchOptions.should.equal(options);
            done();
        });
    });

    it('not having an id after create was called should return an error', function(done) {
        // You should make sure a unique id is set on the model once it has been
        // created, not doing so is an implementation error

        var Person = Model.derive({
            data: {
                create: function(model, options, callback) {
                    process.nextTick(function() {
                        callback();
                    });
                }
            }
        });

        var p = new Person({});
        should.not.exist(p.id);
        p.save(function(_error) {
            _error.badImplementation.should.equal(true);
            done();
        });
    });

    it('data update is called for existing models', function(done) {
        var createCalled = false, updateModel;
        var Person = Model.derive({
            data: {
                create: function(model, options, callback) {
                    createCalled = true;
                    process.nextTick(function() {
                        callback();
                    });
                },
                update: function(model, options, callback) {
                    updateModel = model;
                    process.nextTick(function() {
                        callback();
                    });
                }
            }
        });
        
        var p = new Person({
            // indicates this model exists in the backing store
            id: 5678
        });
        p.id.should.equal(5678);

        p.save(function(_error) {
            updateModel.should.equal(p);

            // this is an update, create should never have been called
            createCalled.should.equal(false);
            should.not.exist(_error);
            done();
        });
    });

    it('update options passed correctly', function(done) {
        var updateOptions;
        var Person = Model.derive({
            data: {
                update: function(model, options, callback) {
                    updateOptions = options;
                    process.nextTick(function() {
                        callback();
                    });
                }
            }
        });
        
        var p = new Person({ id: 5678 }),
            options = {};
        p.save(options, function(_error) {
            updateOptions.should.equal(options);
            done();
        });
    });

    it('allow callback in object creation', function(done) {
        // Sometimes you might need to do async things when creating an object
        // generating random numbers that require callbacks etc.  Make sure we
        // can handle this scenario

        var error = {};
        var Person = Model.derive({

            init: function(parameters, callback) {
                var self = this;
                process.nextTick(function() {
                    self.delayedProperty = 'asdf';
                    callback(error);
                });
            }
        });

        var p = new Person(
            {
                name: 'foo'
            }, 

            // Passing a callback indicates object creation should 
            // call this after init has been called
            function(_error) {
                _error.should.equal(error);
                p.delayedProperty.should.equal('asdf');
                done();
            }
        );
        p.name.should.equal('foo');
    });

    it('parameters passed to constructor should be set by the time init is called', function(done) {
        var Person = Model.derive({
            init: function(parameters, callback) {
                // since no callback passed to the construcotr, this should not be set
                should.not.exist(callback);

                this.yyy.should.equal(12345);
                this.zzz.should.equal('asdf');
            }
        });

        var p = new Person({ yyy: 12345, zzz: 'asdf' });
        done();
    });

    it('fields to constructor should be in changed set', function(done) {
        var Person = Model.derive({
        });

        var p = new Person({
            foo: 123,
            bar: 456,
            baz: 789
        });

        // new objects should be considered changed, if there was no id specified
        p.hasChanged().should.equal(true);
        var changed = p.changed();
        changed.foo.should.equal(123);
        changed.bar.should.equal(456);
        changed.baz.should.equal(789);

        p.foo.should.equal(123);
        p.bar.should.equal(456);
        p.baz.should.equal(789);
        done();
    });

    it('if id passed to constructor, no fields should be marked as changed', function(done) {
        // It is assumed if you pass an id to the constructor the data is fresh from
        // the backing store, so all fields are up to date and should not be in the
        // changed collection

        var Person = Model.derive({
        });

        var p = new Person({
            id: 111,
            foo: 123,
            bar: 456,
            baz: 789
        });

        p.hasChanged().should.equal(false);
        var changed = p.changed();
        should.not.exist(changed.foo);
        should.not.exist(changed.bar);
        should.not.exist(changed.baz);

        p.id.should.equal(111);
        p.foo.should.equal(123);
        p.bar.should.equal(456);
        p.baz.should.equal(789);
        done();
    });

    it('should be no values in changed, after a successful save', function(done) {
        var Person = Model.derive({
            data: {
                create: function(model, options, callback) {           
                    model.hasChanged().should.equal(true);
                    var changed = model.changed();
                    changed.foo.should.equal(123);
                    changed.bar.should.equal(456);
                    changed.baz.should.equal(789);

                    // Need to give this item an id since it has been created
                    model.id = 'foo';
                    process.nextTick(function() {
                        callback();
                    });
                }
            }
        });

        var p = new Person({
            foo: 123,
            bar: 456,
            baz: 789
        });
        p.save(function(error) {
            should.not.exist(error);

            // Saved fields should not be marked as changed
            p.hasChanged().should.equal(false);
            var changed = p.changed();
            should.not.exist(changed.foo);
            should.not.exist(changed.bar);
            should.not.exist(changed.baz);
            done();
        });
    });

    it('failed saves should not clear changed values', function(done) {
        var Person = Model.derive({
            data: {
                create: function(model, options, callback) {           
                    model.hasChanged().should.equal(true);
                    var changed = model.changed();
                    changed.foo.should.equal(123);
                    changed.bar.should.equal(456);
                    changed.baz.should.equal(789);

                    process.nextTick(function() {
                        callback({ msg: 'an error' });
                    });
                }
            }
        });

        var p = new Person({
            foo: 123,
            bar: 456,
            baz: 789
        });
        p.save(function(error) {
            should.exist(error);

            p.hasChanged().should.equal(true);
            var changed = p.changed();
            changed.foo.should.equal(123);
            changed.bar.should.equal(456);
            changed.baz.should.equal(789);
            done();
        });
    });

    it('defaults property values are set', function(done) {
        // You can specify defaults for model properties
        var Person = Model.derive({
            defaults: {
                name: 'frank',
                age: 99
            }
        });

        var p = new Person();
        p.name.should.equal('frank');
        p.age.should.equal(99);
        done();
    });

    it('default values overriden by values passed to constructor', function(done) {
        var Person = Model.derive({
            defaults: {
                name: 'frank',
                age: 99,
                bio: 'foo bar'
            }
        });

        var p = new Person({ name: 'bob', age: 100 });
        p.name.should.equal('bob');
        p.age.should.equal(100);
        p.bio.should.equal('foo bar');
        done();
    });

    it('set passed an _ parameter name sets changed name correctly', function(done) {
        
        var Person = Model.derive({
            // getters / setters are the preferred way of 
            // exposing fields that are on the model.
            get name() {
                return this._name;
            },
            set name(value) {
                // When calling set with a propertyName starting with
                // an _ it will set the name with the new value, but 
                // it updates the changed collection to have the name
                // without the underscore, since you most likely want
                // to have an object you can directly pass to your
                // datastore.
                this.set('_name', value);
            }
        });

        var p = new Person({
            id: 12345,
            name: 'frank'
        });

        p.name.should.equal('frank');
        // id was specified, so considered an existing model
        p.hasChanged().should.equal(false);

        p.name = 'bob';
        p.name.should.equal('bob');
        p.hasChanged().should.equal(true);
        var changed = p.changed();
        changed.name.should.equal('bob');

        done();
    });

    it('can pass an object to set with multiple name/value pairs', function(done) {
        var Person = Model.derive({
        });

        var p = new Person({});

        p.set({
            name: 'billy',
            age: 40,
            title: 'boss'
        });

        p.name.should.equal('billy');
        p.age.should.equal(40);
        p.title.should.equal('boss');
        done();
    });

    it('setting the same value as existing should do nothing', function(done) {
        var Person = Model.derive({});
        var p = new Person({
            id: 123,
            name: 'frank'
        });

        p.hasChanged().should.equal(false);
        p.set('name', 'frank');
        p.hasChanged().should.equal(false);
        done();
    });

    it('after a fetch there shouldn\'t be any dirty values', function(done) {
        var Person = Model.derive({
            data: {
                fetch: function(model, options, callback) {
                    model.set('name', 'frank');
                    model.set('age', 99);

                    model.hasChanged().should.equal(true);
                    process.nextTick(callback);
                }
            }
        });

        var p = new Person({
            id: 123
        });
        p.fetch(function(error) {
            should.not.exist(error);
            p.hasChanged().should.equal(false);
            done();
        });
    });

    it('init works for multiple levels of deriviation', function(done) {
        var personInitCalled = false, employedInitCalled = false;

        var Person = Model.derive({
            init: function(params) {
                personInitCalled = true;
                this.name = params.name;
                this.age = params.age;
            }
        });
        var EmployedPerson = Person.derive({
            init: function(params) {
                employedInitCalled = true;
                EmployedPerson.super_.init.call(this, params);
                this.salary = params.salary;
            }
        });

        var p = new EmployedPerson({
            name: 'frank', 
            age: 55, 
            salary: 10000
        });
        personInitCalled.should.equal(true);
        employedInitCalled.should.equal(true);
        p.name.should.equal('frank');
        p.age.should.equal(55);
        p.salary.should.equal(10000);
        done();
    });

});