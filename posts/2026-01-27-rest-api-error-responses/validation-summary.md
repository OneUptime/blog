# Validation Summary: How to Design Error Responses in REST APIs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- REST APIs
- HTTP status codes
- RFC 9457 Problem Details for HTTP APIs
- Node.js
- Express
- Python
- FastAPI
- Pydantic
- TypeScript
- OpenAPI
- Stripe API error responses
- GitHub REST API error responses
- Twilio API error responses

## Sources Consulted
- RFC 9457: Problem Details for HTTP APIs: https://www.rfc-editor.org/info/rfc9457/
- RFC 9110, Section 15.5.21: 422 Unprocessable Content: https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.21
- IANA HTTP Status Code Registry: https://www.iana.org/assignments/http-status-codes
- Express error handling guide: https://expressjs.com/en/guide/error-handling/
- FastAPI handling errors documentation: https://fastapi.tiangolo.com/tutorial/handling-errors/
- Stripe API Errors reference: https://docs.stripe.com/api/errors
- GitHub REST API documentation examples for validation responses: https://docs.github.com/rest
- Twilio Error 20404 documentation: https://www.twilio.com/docs/api/errors/20404
- OpenAPI Specification 3.1.0: https://spec.openapis.org/oas/v3.1.0.html

## Issues Found
- The post described RFC 7807 as the current Problem Details standard. RFC 9457 now defines Problem Details for HTTP APIs and obsoletes RFC 7807, so the section title, explanatory text, comments, summary table, and conclusion were updated to RFC 9457.
- The field table marked `type`, `title`, and `status` as required. RFC 9457 defines these as members a problem details object can have, with defaults/advisory behavior for some fields, so the table was changed from "Required" to "Recommended."
- The post used the older reason phrase "422 Unprocessable Entity." RFC 9110 and the IANA registry use "422 Unprocessable Content," so the status table and documentation template were updated.
- The Express error handler referenced `APIError` without importing it. Added `const { APIError } = require('./errors');` to make the example complete.

## Review Notes
The FastAPI example uses `EmailStr`, which requires Pydantic's email validation dependency to be installed in a real project. The example is otherwise consistent with FastAPI's documented `RequestValidationError` override pattern.
