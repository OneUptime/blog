# Validation Summary: How to Handle Input Validation

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Input validation and sanitization
- OWASP input validation and file upload guidance
- JavaScript / Node.js
- validator.js
- Express and express-validator
- Python
- Pydantic v2
- FastAPI
- Go
- SQL injection and XSS prevention concepts

## Sources Consulted
- OWASP Input Validation Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- validator.js README/API reference: https://github.com/validatorjs/validator.js
- express-validator ValidationChain documentation: https://express-validator.github.io/docs/api/validation-chain/
- Pydantic v2 Validators documentation: https://docs.pydantic.dev/latest/concepts/validators/
- Pydantic v2 Migration Guide: https://docs.pydantic.dev/latest/migration/
- Pydantic v2 Configuration documentation: https://docs.pydantic.dev/latest/api/config/
- Pydantic v2 Fields documentation: https://docs.pydantic.dev/latest/concepts/fields/
- FastAPI parameter reference: https://fastapi.tiangolo.com/reference/parameters/
- Go regexp package documentation: https://pkg.go.dev/regexp
- Go strings package documentation: https://pkg.go.dev/strings
- Go unicode package documentation: https://pkg.go.dev/unicode

## Issues Found
- The article claimed validation can prevent most injection attacks. OWASP positions input validation as important defense in depth, not the primary control for SQL injection or XSS, so the claim was changed to say validation reduces risk.
- The JavaScript integer validator used `parseInt`, which accepts partial numeric strings such as `123abc`. It now uses validator.js `isInt` before converting with `Number`.
- The Express search query chain used `.escape()` and described the result as a sanitized search query. `escape()` is HTML escaping, not general-purpose search or SQL sanitization, so it was removed and the comment now says the query is validated.
- The Pydantic example used v1 `@validator`, `@root_validator`, `Config`, `anystr_strip_whitespace`, and `max_items` patterns. These were updated to Pydantic v2 `@field_validator`, `@model_validator`, `ConfigDict(str_strip_whitespace=True)`, annotated item constraints, and `max_length`.
- The Python search query example removed SQL-injection characters from user input. That denylist approach is not a reliable SQL injection defense and can corrupt legitimate input, so it now normalizes whitespace and explicitly notes that database access should use parameterized queries.
- The Go example imported `errors` but did not use it, which would prevent the file from compiling. The unused import was removed.

## Review Notes
- The file upload example correctly checks size, MIME type, and extension, but production systems should also inspect file signatures/magic bytes and use safe storage controls as recommended by OWASP.
- The password examples are technically valid, but current security guidance often favors length, blocklists of compromised/common passwords, and rate limiting over rigid composition rules.
