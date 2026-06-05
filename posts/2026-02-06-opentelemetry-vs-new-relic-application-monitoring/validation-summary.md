# Validation Summary: How to Compare OpenTelemetry vs New Relic for Application Monitoring

## Status
validated

## Post Type
Comparison guide with technical implementation examples

## Technologies Covered
- OpenTelemetry
- OpenTelemetry JavaScript SDK
- OpenTelemetry Collector
- New Relic APM
- New Relic Node.js agent
- Node.js
- Express
- OTLP/HTTP

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/js/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry semantic conventions documentation: https://opentelemetry.io/docs/concepts/semantic-conventions/
- New Relic Node.js agent installation documentation: https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/installing-maintaining-nodejs/
- New Relic Node.js custom instrumentation documentation: https://docs.newrelic.com/docs/apm/agents/nodejs-agent/extend-your-instrumentation/nodejs-custom-instrumentation/
- New Relic Node.js agent API documentation: https://newrelic.github.io/node-newrelic/API.html
- New Relic OTLP endpoint documentation: https://docs.newrelic.com/docs/opentelemetry/best-practices/opentelemetry-otlp/
- New Relic OpenTelemetry Collector processing documentation: https://docs.newrelic.com/docs/opentelemetry/get-started/collector-processing/opentelemetry-collector-processing-intro/
- New Relic usage plan and list pricing documentation: https://docs.newrelic.com/docs/licenses/license-information/usage-plans/new-relic-usage-plan/

## Issues Found
- The post stated that OpenTelemetry data flows through the Collector as if it were mandatory. Changed this to say it can flow through the Collector, because SDKs can also export directly to compatible backends.
- The OpenTelemetry Node.js auto-instrumentation example did not show that the tracing setup must load before application modules. Added a `node --require ./tracing.js app.js` example so Express instrumentation is initialized early enough.
- The custom New Relic and OpenTelemetry span examples ended transactions/spans only on the success path. Wrapped the async work in `try`/`finally` blocks so spans and transactions end when the operation throws.
- The OpenTelemetry custom span example described `order.id` and `order.source` as semantic convention attributes. Changed the comment to call them domain-specific attributes.
- The New Relic pricing values were outdated. Updated Standard full-platform user pricing from $49/month to $99/month, data ingest from $0.30-$0.50/GB to $0.40-$0.60/GB, and clarified that $349/month Pro is annual upfront list pricing.
- The Collector configuration referenced `otlp` and `batch` components without defining them. Added `receivers` and `processors` sections.
- The Collector configuration used `${NEW_RELIC_LICENSE_KEY}`. Updated it to `${env:NEW_RELIC_LICENSE_KEY}`, matching current OpenTelemetry Collector environment variable expansion syntax.

## Review Notes
The post is technically valid after these corrections. Pricing is time-sensitive and should be rechecked before publication because New Relic list prices and packaging can change.
