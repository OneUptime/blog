# Validation Summary: How to Instrument AdonisJS with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AdonisJS 5
- OpenTelemetry JavaScript SDK
- Node.js
- TypeScript
- Lucid ORM
- AdonisJS Validator
- AdonisJS Mail
- Bull queue integration

## Sources Consulted
- AdonisJS 5 `.adonisrc.json` and provider registration documentation: https://v5-docs.adonisjs.com/guides/adonisrc-file
- AdonisJS 5 application and service provider lifecycle documentation: https://v5-docs.adonisjs.com/guides/application
- AdonisJS 5 validator documentation: https://v5-docs.adonisjs.com/guides/validator/introduction
- AdonisJS 5 request and route documentation: https://v5-docs.adonisjs.com/guides/request
- AdonisJS 5 response documentation: https://v5-docs.adonisjs.com/guides/response
- AdonisJS 5 auth documentation: https://v5-docs.adonisjs.com/guides/auth/introduction
- AdonisJS 5 mail documentation: https://v5-docs.adonisjs.com/guides/mailer
- AdonisJS 5 database pagination documentation: https://v5-docs.adonisjs.com/guides/database/pagination
- OpenTelemetry JavaScript Node SDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript resources documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript semantic conventions package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- npm package metadata for `@adonisjs/core`, `@adonisjs/lucid`, `@adonisjs/auth`, `@adonisjs/mail`, `@opentelemetry/*`, and `@rocketseat/adonis-bull`

## Issues Found
- The AdonisJS install command was unpinned and would install current Adonis packages, while the examples use AdonisJS 5 IoC imports. Pinned the example packages to AdonisJS 5-compatible versions.
- The post used deprecated OpenTelemetry `Resource` constructor and `SemanticResourceAttributes` imports. Replaced them with `resourceFromAttributes` and current `ATTR_*` semantic convention constants.
- The provider class accepted `ApplicationContract` but did not set `public static needsApplication = true`, which AdonisJS 5 provider examples require when injecting the application instance. Added the static property and definite assignment for the SDK field.
- The `.adonisrc.json` snippet was labeled as TypeScript and contained comments. Changed it to valid JSON and registered the telemetry provider earlier in the provider list.
- The OpenTelemetry snippets used numeric span status codes. Replaced them with `SpanStatusCode.OK` and `SpanStatusCode.ERROR` from `@opentelemetry/api`.
- The controller validation example used string-based validation rules inside `request.validate`, which does not match AdonisJS 5's validator API. Replaced it with `schema.create` and `rules`.
- The paginator count example used `result.length` and `users.length`. Updated it to `result.all().length` and `users.all().length` to match Lucid paginator usage.
- The background job example imported a non-existent `@ioc:Rocketseat/Bull` `JobContract`. Removed the invalid contract import and kept the class as a package-agnostic job handler example.
- The environment configuration used deprecated `deployment.environment`. Updated it to `deployment.environment.name`.
- The Mail and Bull examples referenced packages that were not installed in the dependency section. Added optional AdonisJS 5-compatible package installs.

## Review Notes
The article is now internally consistent as an AdonisJS 5 tutorial. The OpenTelemetry SDK still needs to be initialized before application modules that should be auto-instrumented are loaded; the provider is registered early, but teams with strict auto-instrumentation requirements may prefer a dedicated preloaded instrumentation entrypoint or Node preload hook for production.
