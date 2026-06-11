# Validation Summary: How to Create Event Payload Design: A Practical Guide

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Event-driven architecture
- Event payload design
- TypeScript
- JSON Schema draft 2020-12
- Ajv
- Vitest
- KafkaJS
- AWS SDK for JavaScript v3 and Amazon S3
- Dead letter queues
- Schema registries

## Sources Consulted
- JSON Schema specification: https://json-schema.org/specification
- JSON Schema draft 2020-12: https://json-schema.org/draft/2020-12
- Ajv schema language documentation: https://ajv.js.org/guide/schema-language.html
- Ajv CLI JSON Schema version documentation: https://ajv.js.org/packages/ajv-cli.html
- Vitest mocking guide: https://vitest.dev/guide/mocking.html
- KafkaJS producing messages documentation: https://kafka.js.org/docs/producing
- AWS SDK for JavaScript v3 S3 examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- CloudEvents specification: https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md

## Issues Found
- The Ajv examples imported the default `Ajv` export while the schema declared JSON Schema draft 2020-12. Ajv documentation maps the default export to draft-07 and draft 2020-12 support to `ajv/dist/2020`, so both Ajv examples now use `Ajv2020`.
- The snapshot test imported `createOrderPlacedEvent`, but the function was not exported in the earlier code example. The function is now exported so the import is valid.
- The snapshot test used `vi.spyOn` without importing `vi`. Vitest documents `vi` as an importable helper, so the test import now includes `vi`.
- The mocked UUID in the snapshot test was not a valid UUID value. It now uses a valid RFC 4122-style UUID string, consistent with `crypto.randomUUID()`.
- One delta-event sample used an event ID containing non-hex characters even though the JSON Schema pattern allowed only `evt_` plus lowercase hex digits and hyphens. The sample ID now matches the schema pattern.

## Review Notes
The KafkaJS header example, AWS SDK S3 `transformToString()` usage, TypeScript generics, JSON Schema `format: date-time`, and `crypto.randomUUID()` usage are consistent with the consulted official documentation. The post remains a practical guide rather than a complete runnable project, so examples assume the listed packages and normal TypeScript/Vitest project setup.
