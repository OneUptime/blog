# How to Use Mongoose Schema Types and Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, Schema, Validation, Node.js

Description: Learn how to define Mongoose schema types and apply built-in and custom validators to enforce data integrity in your MongoDB collections.

---

## Overview

Mongoose schemas define the shape of documents in a MongoDB collection. Schema types provide type casting and built-in validation, while custom validators let you enforce business rules before data ever reaches the database.

## Defining a Schema

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name:     { type: String, required: true, trim: true, maxlength: 100 },
  email:    { type: String, required: true, unique: true, lowercase: true },
  age:      { type: Number, min: 0, max: 120 },
  role:     { type: String, enum: ['admin', 'user', 'guest'], default: 'user' },
  joinedAt: { type: Date, default: Date.now },
  active:   { type: Boolean, default: true }
});
```

## Available Schema Types

```text
String   - Unicode text
Number   - 64-bit float
Date     - JavaScript Date object (stored as ISODate)
Boolean  - true/false
Buffer   - Binary data
ObjectId - MongoDB ObjectId (Schema.Types.ObjectId)
Array    - Array of any type
Map      - Key-value pairs with typed values
Mixed    - Any value (Schema.Types.Mixed)
Decimal128 - High-precision decimal
```

## Built-In Validators

```javascript
const productSchema = new Schema({
  title:    { type: String, required: [true, 'Title is required'], minlength: 3 },
  price:    { type: Number, required: true, min: [0, 'Price must be positive'] },
  sku:      { type: String, match: /^[A-Z]{3}-\d{4}$/ },
  category: { type: String, enum: { values: ['electronics', 'clothing'], message: '{VALUE} is not valid' } }
});
```

## Custom Validators

Add a `validate` property for more complex rules:

```javascript
const orderSchema = new Schema({
  quantity: {
    type: Number,
    validate: {
      validator: (v) => Number.isInteger(v) && v > 0,
      message: (props) => `${props.value} must be a positive integer`
    }
  },
  couponCode: {
    type: String,
    validate: {
      validator: async function(code) {
        const Coupon = mongoose.model('Coupon');
        const coupon = await Coupon.findOne({ code });
        return !!coupon;
      },
      message: 'Invalid coupon code'
    }
  }
});
```

## Nested Schemas and Subdocuments

```javascript
const addressSchema = new Schema({
  street: String,
  city:   { type: String, required: true },
  zip:    { type: String, match: /^\d{5}$/ }
}, { _id: false });

const customerSchema = new Schema({
  name:    String,
  address: addressSchema
});
```

## Running Validation Manually

```javascript
const User = mongoose.model('User', userSchema);
const user = new User({ name: '', age: -1 });

try {
  await user.validate();
} catch (err) {
  console.error(err.errors.name.message);
  console.error(err.errors.age.message);
}
```

## Summary

Mongoose schema types handle automatic casting and provide built-in validators like `required`, `min`, `max`, `enum`, `match`, `minlength`, and `maxlength`. Custom validators support synchronous and async logic. Nested schemas enforce structure on embedded subdocuments. Trigger validation manually with `document.validate()` to catch errors before saving.
