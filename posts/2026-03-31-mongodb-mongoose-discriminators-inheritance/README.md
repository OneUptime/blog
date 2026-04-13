# How to Use Mongoose Discriminators for Inheritance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, Discriminator, Inheritance, Schema

Description: Learn how to implement schema inheritance in Mongoose using discriminators to store multiple document types in a single MongoDB collection.

---

## Overview

Mongoose discriminators implement schema inheritance by storing different document types in the same MongoDB collection. A discriminator key field distinguishes each document type, and each discriminator model extends the base schema with its own fields.

## Base Schema Setup

Define a base schema and model first:

```javascript
const { Schema, model } = require('mongoose');

const eventSchema = new Schema(
  {
    createdAt:   { type: Date, default: Date.now },
    description: String
  },
  { discriminatorKey: 'kind', collection: 'events' }
);

const Event = model('Event', eventSchema);
```

The `discriminatorKey` option tells Mongoose which field to use as the type discriminator (defaults to `__t`).

## Defining Discriminator Models

Each discriminator extends the base model with additional fields:

```javascript
// Click event
const ClickEvent = Event.discriminator('ClickEvent', new Schema({
  url:    { type: String, required: true },
  button: String
}));

// Purchase event
const PurchaseEvent = Event.discriminator('PurchaseEvent', new Schema({
  itemId:  Schema.Types.ObjectId,
  amount:  { type: Number, required: true },
  currency: { type: String, default: 'USD' }
}));

// Login event
const LoginEvent = Event.discriminator('LoginEvent', new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  ip:     String
}));
```

## Creating Documents

Use the specific model to create typed documents:

```javascript
await ClickEvent.create({ url: 'https://example.com', button: 'CTA' });
await PurchaseEvent.create({ itemId: someId, amount: 49.99 });
await LoginEvent.create({ userId: userId, ip: '192.168.1.1' });
```

Each document gets a `kind` field set automatically:

```json
{ "kind": "ClickEvent", "url": "https://example.com", "button": "CTA", "createdAt": "..." }
```

## Querying Discriminators

Query the base model to get all event types, or a specific model to filter by type:

```javascript
// All events
const allEvents = await Event.find().sort({ createdAt: -1 });

// Only purchase events
const purchases = await PurchaseEvent.find({ amount: { $gte: 100 } });

// Mongoose adds { kind: 'PurchaseEvent' } automatically
```

## Embedded Document Discriminators

Discriminators also work on embedded arrays:

```javascript
const shapeSchema = new Schema({ color: String }, { discriminatorKey: 'type' });
const circleSchema = new Schema({ radius: Number });
const rectangleSchema = new Schema({ width: Number, height: Number });

const containerSchema = new Schema({
  shapes: [{
    type: shapeSchema,
    discriminators: {
      Circle:    circleSchema,
      Rectangle: rectangleSchema
    }
  }]
});
const Container = model('Container', containerSchema);

await Container.create({
  shapes: [
    { type: 'Circle', color: 'red', radius: 5 },
    { type: 'Rectangle', color: 'blue', width: 10, height: 4 }
  ]
});
```

## Summary

Mongoose discriminators enable polymorphic document storage in a single collection by using a `discriminatorKey` field to distinguish types. Define a base model, then call `BaseModel.discriminator('TypeName', schema)` for each subtype. Query the base model for all types or a discriminator model to automatically filter by type. This pattern avoids collection sprawl while maintaining type safety.
