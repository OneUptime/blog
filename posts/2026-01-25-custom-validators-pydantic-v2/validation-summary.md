# Validation Summary: How to Create Custom Validators in Pydantic v2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Pydantic v2
- Pydantic field validators
- Pydantic model validators
- Annotated validators
- Pydantic validation errors
- Async validation patterns
- FastAPI-adjacent data validation patterns

## Sources Consulted
- Pydantic validators documentation: https://pydantic.dev/docs/validation/latest/concepts/validators/
- Pydantic functional validators API documentation: https://pydantic.dev/docs/validation/latest/api/pydantic/functional_validators/
- Pydantic error handling documentation: https://pydantic.dev/docs/validation/latest/errors/errors/
- Pydantic migration guide: https://pydantic.dev/docs/validation/latest/get-started/migration/
- Pydantic v2 alpha announcement for pydantic-core rewrite and performance claims: https://pydantic.dev/articles/pydantic-v2-alpha
- Pydantic GitHub issue on async validators: https://github.com/pydantic/pydantic/issues/857

## Issues Found
No technical issues found.

## Review Notes
All Python code blocks are syntactically valid and were executed successfully with Python 3.12.3 and Pydantic 2.13.4. The post correctly describes that `@field_validator` replaces deprecated v1 `@validator` usage, that field validators default to after-mode validation, that validators must return the validated value, that `@model_validator` supports `before` and `after` modes, and that `PydanticCustomError` can be used for custom error types and messages. The article focuses on `before` and `after` validators and does not cover `wrap` validators, which is technically fine but could be expanded in a future update.
