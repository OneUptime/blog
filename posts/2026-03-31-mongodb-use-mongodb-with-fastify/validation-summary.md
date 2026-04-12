# Validation Summary: How to Use MongoDB with Fastify

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Fastify (Node.js web framework)
- MongoDB (database)
- Mongoose (ODM for MongoDB)
- fastify-plugin (Fastify plugin wrapper)
- TypeScript
- JSON Schema validation (Ajv, built into Fastify)

## Sources Consulted
- Fastify official documentation — https://fastify.dev/docs/latest/
- Fastify plugin guide — https://fastify.dev/docs/latest/Reference/Plugins/
- fastify-plugin documentation — https://github.com/fastify/fastify-plugin
- Mongoose official documentation — https://mongoosejs.com/docs/
- Mongoose connections guide — https://mongoosejs.com/docs/connections.html
- Mongoose models API — https://mongoosejs.com/docs/api/mongoose.html#Mongoose.prototype.models

## Issues Found

1. **Introduction incorrectly claimed the plugin "decorates the Fastify instance"**: The plugin code never calls `fastify.decorate()`. The Mongoose connection is shared through Mongoose's module-level singleton pattern, not through Fastify's decoration system. The purpose of `fastify-plugin` here is to break encapsulation so the `onClose` hook registers at the application root level, not to expose decorations. Fixed the introduction to accurately describe what the plugin does: establishing the connection during Fastify's boot sequence and registering the disconnect hook at the root level.

2. **Unused `mongoose` default import in the model file**: The model file imported `mongoose` as a default import alongside the named exports `Schema`, `model`, and `models`, but `mongoose` was never referenced directly. Removed the unused default import to keep the code clean and accurate.

## Review Notes
- All Fastify APIs used (register, addHook, route generics, listen with callback) are current and correct for Fastify v4+.
- All Mongoose APIs used (connect, disconnect, Schema, model, models, findById, findByIdAndDelete, create, lean) are current and correct for Mongoose v7+/v8+.
- The `models.Product ?? model<IProduct>('Product', schema)` pattern in the model file is a good practice to prevent OverwriteModelError in HMR environments.
- The JSON Schema validation section correctly demonstrates Fastify's built-in Ajv-powered validation.
- The `app.listen({ port, host }, callback)` form is valid, though the modern async/await form (`await app.listen({ port, host })`) is more commonly seen in current Fastify examples.
