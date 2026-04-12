# Validation Summary: How to Use Mongoose Validators (Built-In and Custom)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- Node.js
- JavaScript (ES6+ async/await)

## Sources Consulted
- Mongoose Validation documentation: https://mongoosejs.com/docs/validation.html
- Mongoose SchemaType API (built-in validators): https://mongoosejs.com/docs/schematypes.html
- Mongoose API docs for `findOneAndUpdate`: https://mongoosejs.com/docs/api/model.html#Model.findOneAndUpdate()
- Mongoose Custom Validators documentation: https://mongoosejs.com/docs/validation.html#custom-validators
- Mongoose Async Custom Validators: https://mongoosejs.com/docs/validation.html#async-custom-validators

## Issues Found
No technical issues found.

## Review Notes
- The post mentions that async validators can "use the `callback` parameter." While technically supported in some Mongoose versions for backward compatibility, callback-based async validators are deprecated in Mongoose 5+ in favor of returning Promises. The code examples correctly use the Promise-based approach, so no change is needed, but readers should be aware that the callback style is legacy.
- The async email uniqueness validator example has an inherent race condition (another document could be inserted between validation and save). The post implicitly acknowledges this by commenting "check uniqueness beyond the unique index," suggesting a unique index should also be in place. This is a reasonable pattern for tutorials.
- The post uses `minlength`/`maxlength` (all lowercase), which are valid Mongoose aliases for the camelCase `minLength`/`maxLength`. Both forms work correctly.
- The summary states validation provides "descriptive errors before any database round-trip," which is true for built-in validators but not for the async email validator example shown (which performs a `countDocuments` query). This is a minor inconsistency in the prose but not a technical error in the code.
