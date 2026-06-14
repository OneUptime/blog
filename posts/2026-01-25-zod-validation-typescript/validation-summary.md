# Validation Summary: How to Validate Data with Zod in TypeScript

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- Zod
- Node.js
- Express
- Runtime validation and schema inference

## Sources Consulted
- Zod Basic Usage documentation: https://zod.dev/basics
- Zod Defining Schemas documentation: https://zod.dev/api
- Zod Error Customization documentation: https://zod.dev/error-customization
- Zod Error Formatting documentation: https://zod.dev/error-formatting
- Zod 4 Migration Guide: https://zod.dev/v4/changelog
- Zod 4 Release Notes: https://zod.dev/v4
- Express 5 API Reference: https://expressjs.com/en/api/
- Express body-parser middleware documentation: https://expressjs.com/en/resources/middleware/body-parser/
- npm package metadata for zod, checked with `npm view zod version dependencies --json`

## Issues Found
- The post used Zod 3's `error.errors` property in several examples. Zod 4 removed `.errors`; the supported property is `.issues`. Updated all error-handling examples to use `.issues`.
- Several examples used deprecated Zod 4 custom-message forms such as `.min(2, 'message')`, `.regex(pattern, 'message')`, and `.refine(fn, 'message')`. Updated them to the current `{ error: 'message' }` form.
- Several string-format validators used deprecated method forms such as `z.string().email()`, `z.string().url()`, and `z.string().uuid()`. Updated them to current top-level Zod 4 APIs such as `z.email()`, `z.url()`, and `z.uuid()`.
- Integer examples used older `z.number().int()` patterns in multiple places. Updated representative integer schemas to `z.int()` and used `.pipe(z.int())` after numeric coercion where the input starts as unknown query-string data.
- The coercion example said `z.coerce.boolean()` converts string booleans. In Zod, this uses JavaScript `Boolean(input)`, so non-empty strings such as `"false"` become `true`. Updated the example to use `z.stringbool()` for `"true"` and `"false"` strings.
- The Express example claimed `req.body` was typed as `z.infer<typeof CreateUserSchema>`. The middleware validates and replaces `req.body`, but it does not re-type Express's `Request` object. Updated the comment to describe the runtime behavior accurately.
- The error customization example used older `z.ZodErrorMap`, `ctx.defaultError`, `z.setErrorMap()`, and Zod 3 issue fields such as `issue.type`, `invalid_string`, and `issue.validation`. Updated it to Zod 4's global `z.config({ customError })` pattern and current issue fields such as `origin`, `invalid_format`, and `format`.
- The reusable schema helper used `.merge()`, which is deprecated in Zod 4. Replaced it with object shape composition using spread syntax.
- The post description mentioned React integration even though the article did not include a React integration section. Updated the description to mention Express integration only.

## Review Notes
- Verified all eight TypeScript code blocks compile under TypeScript strict mode against `zod@4.4.3`.
- Runtime-checked the updated custom error map to confirm the sample messages for invalid email and minimum age match the article's expected output.
