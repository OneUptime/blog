# Validation Summary: How to Use Mongoose Virtuals for Computed Fields

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- Node.js
- JavaScript (ES6+)

## Sources Consulted
- Mongoose Virtuals documentation: https://mongoosejs.com/docs/guide.html#virtuals
- Mongoose Populate Virtuals documentation: https://mongoosejs.com/docs/populate.html#populate-virtuals
- Mongoose Schema options (`toJSON`, `toObject`): https://mongoosejs.com/docs/guide.html#toJSON
- Mongoose API reference for `Schema.prototype.virtual()`: https://mongoosejs.com/docs/api/schema.html#Schema.prototype.virtual()

## Issues Found
No technical issues found.

## Review Notes
- The age calculation uses `365.25` days per year as a leap-year approximation. This is a standard and widely accepted approach for computing approximate age, though it can be off by a day in rare edge cases. This is fine for a tutorial context.
- The populate virtuals example references a `Post` model that is not defined in the snippet. This is a common tutorial convention and not an error — the surrounding context makes the intent clear.
- All APIs used (`virtual().get()`, `virtual().set()`, populate virtuals with `ref`/`localField`/`foreignField`/`justOne`, schema options `toJSON`/`toObject` with `{ virtuals: true }`) are current and stable across Mongoose 6.x, 7.x, and 8.x.
