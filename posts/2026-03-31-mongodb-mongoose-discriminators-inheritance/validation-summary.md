# Validation Summary: How to Use Mongoose Discriminators for Inheritance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- JavaScript / Node.js

## Sources Consulted
- Mongoose Discriminators documentation: https://mongoosejs.com/docs/discriminators.html
- Mongoose Schema API documentation: https://mongoosejs.com/docs/api/schema.html

## Issues Found
- **Embedded discriminators used outdated API**: The embedded discriminators section used `Container.schema.path('shapes').discriminator('Circle', schema)`, which is the older method-based approach. Current Mongoose documentation (v9.x) exclusively shows the inline `discriminators` property within the schema definition. Updated to use the current inline syntax: `discriminators: { Circle: circleSchema, Rectangle: rectangleSchema }` within the array field definition.

## Review Notes
- All other code examples (base schema setup, discriminator model definition, document creation, querying) are correct and use current Mongoose APIs.
- The claim that the default `discriminatorKey` is `__t` is confirmed by official documentation.
- The explanation that Mongoose automatically adds the discriminator key filter when querying through a discriminator model is correct.
- The `discriminatorKey` option usage in schema options is correct.
- The post does not specify a Mongoose version, which is fine since the corrected code works with current versions.
