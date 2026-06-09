# Validation Summary: How to Add Input Validation with express-validator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express.js
- express-validator (v7+ API)
- TypeScript (briefly)
- Mermaid (diagram)

## Sources Consulted
- express-validator official documentation: https://express-validator.github.io/docs/
- express-validator GitHub repository: https://github.com/express-validator/express-validator
- validator.js (underlying library) docs: https://github.com/validatorjs/validator.js
- Express.js routing/middleware docs: https://expressjs.com/

## Issues Found
No technical issues found.

Specifically verified:
- The error object shape used (`error.path`, `error.msg`, `error.value`) matches express-validator v7. (In v6 the field was `error.param`; the post correctly uses the current `path`.)
- All imports (`body`, `param`, `query`, `header`, `cookie`, `validationResult`, `checkSchema`, `ValidationChain`) are valid named exports.
- All chain methods used (`isEmail`, `normalizeEmail`, `isLength`, `isAlphanumeric`, `isInt`, `isFloat`, `isBoolean`, `isISO8601`, `isMongoId`, `isIn`, `isString`, `isArray`, `notEmpty`, `trim`, `escape`, `equals`, `matches`, `custom`, `customSanitizer`, `if`, `optional`, `withMessage`, `toInt`, `toFloat`, `toBoolean`, `toDate`, `run`) are part of the current API.
- The `checkSchema` syntax — including the `isIn: { options: [['S', 'M', 'L', 'XL']] }` double-array wrap — is correct (the wrap is required because validator.js's `isIn` takes the array as its first argument).
- The manual-run pattern `await Promise.all(validations.map(v => v.run(req)))` is still valid in v7.
- Async custom validators (`body('email').custom(async (email) => { ... })`) are supported.
- Conditional validation with `.if(body('isPremium').equals('true'))` uses the correct API.

## Review Notes
- The post uses CommonJS (`require`) for most examples and ESM/TypeScript (`import`) only in the TypeScript section. This is consistent with how most Express tutorials are written and is not an error.
- `header('content-type').equals('application/json')` is a valid example, though in practice browsers and many clients send `Content-Type: application/json; charset=utf-8`, which would fail an exact-equals check. This is a usage caveat rather than a technical inaccuracy in the post's claims about the API.
- The TypeScript example extends `Request` and overrides `body` with a custom shape. Express's `Request` type accepts body shape via generics (`Request<P, ResBody, ReqBody>`), so a more idiomatic pattern is `Request<{}, {}, { email: string; ... }>`. The pattern shown in the post still compiles and works; it is just less idiomatic. Not a technical error.
- The claim "70+ validators for common use cases" is consistent with the count exposed by validator.js (the underlying library exposes well over 70 validators).
- No deprecated APIs detected.
