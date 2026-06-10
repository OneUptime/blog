# Validation Summary: How to Implement Tool Schemas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- JSON Schema (draft 2020-12)
- Python `jsonschema` library (`Draft202012Validator`, `validate`)
- Pydantic v2 (`BaseModel`, `Field`, `model_json_schema()`)
- Zod (TypeScript schema definition)
- `zod-to-json-schema` (TypeScript)
- Mermaid diagrams (flowchart, sequence, graph)

## Sources Consulted
- JSON Schema specification (draft 2020-12): https://json-schema.org/draft/2020-12/
- JSON Schema validation vocabulary: https://json-schema.org/draft/2020-12/json-schema-validation
- Python `jsonschema` library docs: https://python-jsonschema.readthedocs.io/
- Pydantic v2 docs: https://docs.pydantic.dev/latest/
- Zod docs: https://zod.dev/
- `zod-to-json-schema` package: https://github.com/StefanTerdell/zod-to-json-schema

## Issues Found
No technical issues found.

Verification details:
- The `$schema` URL `https://json-schema.org/draft/2020-12/schema` is the correct draft 2020-12 identifier.
- All listed string formats (`email`, `uri`, `date-time`, `date`, `uuid`, `regex`) are valid JSON Schema formats.
- JSON Schema validation keywords used (`minLength`, `maxLength`, `minimum`, `maximum`, `multipleOf`, `minItems`, `maxItems`, `uniqueItems`, `enum`, `pattern`, `additionalProperties`, `if`/`then`/`allOf`) are all valid per draft 2020-12.
- The E.164 phone pattern `^\+[1-9]\d{1,14}$` is correctly formatted.
- Python `jsonschema` library APIs (`Draft202012Validator.check_schema`, `validate`, `ValidationError`) are correct.
- Pydantic v2's `model_json_schema()` is the correct method name (replaces v1's `schema()`).
- Pydantic v2's `max_length` for list fields is correct (replaces v1's `max_items`).
- Zod chain methods (`.min()`, `.max()`, `.optional()`, `.default()`, `.describe()`, `z.enum()`, `z.array()`, `z.infer<>`) are all valid.
- `zodToJsonSchema(schema, 'Name')` signature and the `definitions.Name` access pattern are correct for the package.
- JSON Schema conditional (`if`/`then` inside `allOf`) syntax is valid (supported since draft-07).

## Review Notes
- The "This generates" JSON Schema example in the Pydantic section is somewhat idealized. Actual Pydantic v2 output for `Optional[str]` fields typically wraps the schema in `anyOf` with `{"type": "null"}` and includes `default: null`. The shown output is a simplified/cleaned representation suitable for teaching, but readers running the code will see a slightly different structure with `anyOf` for optional fields. The schemas remain valid JSON Schema.
- The post uses snake_case for tool names by convention; this is a stylistic recommendation rather than a hard JSON Schema requirement.
- The conditional requirements pattern (`if`/`then` inside `allOf`) is correct but only enforces additional `required` constraints based on `notification_type`; it does not exclude irrelevant fields. This is acceptable for the example's scope.
- All code samples appear syntactically correct in Python and TypeScript.
