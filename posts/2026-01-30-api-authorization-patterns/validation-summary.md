# Validation Summary: How to Implement API Authorization Patterns

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- API authorization
- RBAC
- ABAC
- ReBAC
- ACL and policy-based access control
- Node.js CommonJS modules
- Express middleware and routing
- Python dataclasses and type hints
- FastAPI dependencies and path parameters
- Jest tests

## Sources Consulted
- NIST CSRC Role Based Access Control project: https://csrc.nist.gov/projects/role-based-access-control
- NIST SP 800-162, Guide to Attribute Based Access Control (ABAC): https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-162.pdf
- Express routing guide: https://expressjs.com/en/guide/routing/
- Express middleware guide: https://expressjs.com/en/guide/using-middleware/
- FastAPI dependencies tutorial: https://fastapi.tiangolo.com/tutorial/dependencies/
- FastAPI dependencies reference: https://fastapi.tiangolo.com/reference/dependencies/
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Node.js CommonJS modules documentation: https://nodejs.org/api/modules.html
- Jest expect documentation: https://jestjs.io/docs/expect

## Issues Found
- The RBAC middleware example used `require('./rbac')` from `middleware/authorize.js`, which would resolve to `middleware/rbac.js` instead of the top-level `rbac.js`. Changed it to `require('../rbac')`.
- The RBAC test suite called `rbac.reset()`, but the RBAC class did not define a `reset` method. Added a small `reset()` method that clears roles and user-role assignments.
- The FastAPI ABAC dependency accepted `resource_id`, which would be treated as a separate query parameter and would not receive the `{document_id}` route parameter. Changed the dependency to accept `document_id: str = Path(...)` and use that as the ABAC resource ID.
- The FastAPI routes referenced `AccessRequest` without importing it in the route snippet. Added the missing import.
- The FastAPI update route placed a non-default body parameter after a defaulted `Path(...)` parameter, which is invalid Python syntax. Reordered the parameters.
- The ReBAC permission materializer called `getEffectivePermissions()`, but the ReBAC class did not define that method. Added an implementation that returns direct and inherited permissions.
- The combined authorization service was shown under `services/authorization.js` but imported sibling modules with `./rbac`, `./abac`, and `./rebac`. Updated those imports to parent-relative paths.

## Review Notes
All fenced JavaScript and Python examples were syntax-checked after the fixes with Node.js `--check` and Python `ast.parse`. Some route examples still use application-specific placeholders such as `Post`, `Document`, `DocumentUpdate`, `auditLog`, and `detectSuspiciousActivity`; those are acceptable in context as omitted application models/services rather than API inaccuracies.
