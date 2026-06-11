# Validation Summary: How to Build Event Naming Conventions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- Event naming conventions
- Analytics/event tracking
- OpenTelemetry JavaScript tracing API
- ESLint custom rules
- Markdown documentation templates

## Sources Consulted
- TypeScript Handbook - Everyday Types: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- TypeScript Handbook - Template Literal Types: https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
- OpenTelemetry JavaScript Instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry API for JavaScript reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api.html
- OpenTelemetry blog - Deprecating Span Events API: https://opentelemetry.io/blog/2026/deprecating-span-events/
- ESLint Custom Rules documentation: https://eslint.org/docs/latest/extend/custom-rules

## Issues Found
- The TypeScript wording claimed the first example used generic types and enforced valid object-action combinations. Changed it to describe string literal union types and allowed objects/actions, which matches the code.
- The event-name anatomy diagram treated `checkout.payment.submitted` as object/action/qualifier, but the rest of the post uses `[namespace.]object.action[.qualifier]`. Updated the diagram and table to include namespace, object, action, and optional qualifier.
- The event tracker imported `EVENT_REGISTRY` but did not use it. Removed the unused import from the snippet.
- The OpenTelemetry span-event section did not mention current OpenTelemetry guidance that new event instrumentation should prefer log-based events correlated with spans where appropriate. Added a concise caveat while keeping the existing span-event example for existing tracing workflows.
- The ESLint rule rejected several event names shown elsewhere in the post because it disallowed snake_case segments and omitted valid actions such as `succeeded`, `selected`, `applied`, `logged_in`, and `signed_up`. Updated the regex, messages, and action set to match the article's examples.
- The documentation-template code block contained an invalid nested Markdown fence closing sequence. Changed the outer fence to a four-backtick `markdown` fence so the inner triple-backtick example renders correctly.

## Review Notes
The examples are illustrative and omit production concerns such as schema evolution, PII filtering, async delivery retries, and backend-specific wildcard query syntax. OpenTelemetry span events are still documented and supported, but official 2026 guidance says new event-style instrumentation should move toward log-based events correlated with trace context.
