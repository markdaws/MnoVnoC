/**
 * This example shows how you can derive to multiple levels
 */

var Model = require('../').Model;

var Person = Model.derive({
    init: function(params) {
        console.log('hmmm');
        console.log('Person::init');

        this.name = params.name;
        this.age = params.age;
    },

    validate: function(callback) {
        
        var errors = [];
        if (this.name === 'frank') {
            errors.push('you can\'t be called frank');
        }
        if (this.age > 80) {
            errors.push('you\'re too old');
        }

        process.nextTick(function() {
            callback(errors);
        });
    }
});

var EmployedPerson = Person.derive({
    init: function(params) {
        EmployedPerson.super_.init.call(this, params);
        this.salary = params.salary;
    },

    validate: function(callback) {
        
        var self = this;
        EmployedPerson.super_.validate.call(this, function(errors) {
            
            if (self.salary > 5000) {
                errors.push('you\'re paid too much');
            }
            callback(errors);
        });
    }

    //TODO: Validate
});

var p = new EmployedPerson({
    name: 'frank',
    age: 95,
    salary: 10000
});

console.log(p.name);
console.log(p.age);
console.log(p.salary);

p.validate(function(errors) {
    console.dir(errors);
});
