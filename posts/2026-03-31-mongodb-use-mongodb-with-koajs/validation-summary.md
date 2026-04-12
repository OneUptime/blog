# Validation Summary: How to Use MongoDB with Koa.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (ODM)
- Koa.js
- koa-router
- koa-bodyparser
- TypeScript

## Sources Consulted
- Koa.js official documentation — https://koajs.com/
- Koa.js middleware guide (middleware execution order / onion model) — https://github.com/koajs/koa/blob/master/docs/guide.md
- Mongoose official documentation (connect, Schema, model, models) — https://mongoosejs.com/docs/
- koa-router documentation — https://github.com/koajs/router
- koa-bodyparser documentation — https://github.com/koajs/bodyparser

## Issues Found

1. **Error handling middleware registered after routes (bug):** In Koa's onion-model middleware stack, middleware wraps all middleware registered after it via `await next()`. The error handler was registered after `router.routes()` and `router.allowedMethods()`, meaning it would never catch errors thrown in route handlers. Moved the Error Handling Middleware section to before the Route Handlers section so the `app.use` for the error handler executes before routes are mounted.

2. **Introduction and description inaccurately described connection middleware:** The introduction stated "MongoDB integrates through a connection middleware that attaches the database client to the Koa context" and the description mentioned "middleware for connection management," but the actual code uses `mongoose.connect` at startup with no custom middleware or context attachment. Updated both to accurately describe the Mongoose startup-connection pattern used in the code.

3. **Unused default import in model file:** The model file had `import mongoose, { Schema, model, models } from 'mongoose'` but only used the named exports. Removed the unused `mongoose` default import.

## Review Notes
- The packages `koa-router` and `koa-bodyparser` are functional but have been superseded by their scoped equivalents `@koa/router` and `@koa/bodyparser`, which are the actively maintained versions under the Koa organization. A future update could migrate to those packages.
- The `models.Product ?? model<IProduct>('Product', schema)` pattern in the model file is commonly used in Next.js to handle hot-reload re-compilation. It works fine in Koa but is not strictly necessary since Koa does not hot-reload modules the same way. Not an error, just a note.
- `ctx.query.category` is typed as `string | string[]` in koa-router, so the cast to `string | undefined` is a simplification that works for single-value queries but would silently ignore array values if a user passes `?category=a&category=b`.
