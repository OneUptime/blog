# Validation Summary: How to Fix 'Broken Access Control' Vulnerabilities

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- OWASP Broken Access Control
- Express.js routing and response handling
- Node.js path utilities
- JavaScript authorization middleware
- Mongoose-style model queries
- Jest and SuperTest-style API tests
- RBAC and ABAC authorization patterns

## Sources Consulted
- OWASP Top 10:2021 A01 Broken Access Control: https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/
- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- Express 4.x API Reference, res.sendFile: https://expressjs.com/en/4x/api.html#res.sendFile
- Node.js path module documentation: https://nodejs.org/api/path.html
- Mongoose Model API documentation: https://mongoosejs.com/docs/api/model.html
- Jest expect documentation: https://jestjs.io/docs/expect
- SuperTest package documentation: https://www.npmjs.com/package/supertest

## Issues Found
- The ABAC policy engine claimed "Explicit deny takes precedence", but the implementation returned immediately on the first `ALLOW`. That meant a later `DENY` rule, such as the maintenance-mode rule, would never be evaluated. I changed `evaluate()` to continue after `ALLOW`, immediately return only for `DENY`, and return the accumulated allow decision at the end.
- The ABAC route example called `doc.toObject()` without checking whether `Document.findById()` returned `null`. I added a null check in the resource loader and a 404 response in the authorization middleware so missing resources do not cause a runtime error.
- The vulnerable path traversal example passed a relative path to `res.sendFile()`, but Express requires an absolute path unless the `root` option is set. I changed the vulnerable example to use `path.resolve()` so it remains vulnerable for the intended reason while matching Express behavior.

## Review Notes
The post's core security guidance is consistent with OWASP recommendations: deny by default, enforce authorization server-side, check record ownership, centralize reusable authorization logic, log authorization failures, rate limit sensitive endpoints, and add access control tests. The snippets are illustrative and assume surrounding application code such as `authenticate`, `requireRole`, model definitions, request parsing, and test helpers.
