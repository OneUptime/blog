# Validation Summary: How to Monitor DynamoDB Read/Write Capacity with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon DynamoDB
- Amazon CloudWatch DynamoDB metrics
- OpenTelemetry JavaScript SDK
- OpenTelemetry AWS SDK instrumentation for JavaScript
- OpenTelemetry Collector AWS CloudWatch receiver
- OpenTelemetry Python metrics SDK
- AWS Lambda
- AWS SDK for JavaScript v3
- boto3 DynamoDB client

## Sources Consulted
- Amazon DynamoDB API Reference: ConsumedCapacity: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ConsumedCapacity.html
- Amazon DynamoDB Developer Guide: Metrics and dimensions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- AWS SDK for JavaScript v3 DynamoDB PutItemCommand reference: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/dynamodb-2012-08-10/PutItem
- Amazon DynamoDB Developer Guide: Programming DynamoDB with JavaScript: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-javascript.html
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK Node package docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry AWS SDK instrumentation package source/docs: https://www.npmjs.com/package/@opentelemetry/instrumentation-aws-sdk
- OpenTelemetry Collector contrib awscloudwatchreceiver package docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/awscloudwatchreceiver
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters docs: https://opentelemetry.io/docs/languages/python/exporters/

## Issues Found
- The JavaScript setup used `new Resource(...)`, but current `@opentelemetry/resources` exports `resourceFromAttributes` rather than a public `Resource` constructor. Updated the import and resource initialization.
- The JavaScript setup used the deprecated singular `metricReader` option on `NodeSDK`. Updated it to the current `metricReaders` array option.
- The Node.js install command imported `@opentelemetry/api` directly in the example but did not install it explicitly. Added `@opentelemetry/api` to the install command.
- The wrapper comment described gauges while the code created counters. Updated the comment to say counters.
- The DynamoDB consumed-capacity examples used only `CapacityUnits`. Updated them to prefer `ReadCapacityUnits` for reads and `WriteCapacityUnits` for writes, falling back to `CapacityUnits`.
- The throttling counter only checked `ProvisionedThroughputExceededException`. Updated it to also count `RequestLimitExceeded` and `ThrottlingException`, which are listed DynamoDB throttling-related errors in the AWS SDK documentation.
- The OpenTelemetry Collector `awscloudwatch` configuration used an outdated/incorrect `metrics.named`, `statistics`, per-metric `period`, and list-style `dimensions` shape. Replaced it with the current `metrics.queries`, `stats`, map-style `dimensions`, `collection_interval`, and receiver-level `period` schema.
- The Collector example implied an empty `TableName` value selected all tables. Replaced that with an explicit `Orders` table dimension and added a short note to repeat queries or use discovery mode for broader collection.
- The provisioned DynamoDB capacity metrics were polled as if they were one-minute metrics. Split them into a separate receiver instance using five-minute collection/period settings to match DynamoDB's publication interval for provisioned capacity metrics.
- The Python Lambda example returned a raw list in an API Gateway-style response body. Added `json.dumps(...)` so `body` is a string.
- The Python Lambda example relied only on the periodic exporter interval. Added `provider.force_flush()` after recording the metric so short Lambda invocations have a better chance to export before the runtime freezes.

## Review Notes
- The post is technically relevant and salvageable as a practical monitoring guide.
- The Collector `awscloudwatchreceiver` metrics support is documented as recently added in the contrib receiver and should be treated as version-sensitive; users should run a recent OpenTelemetry Collector contrib build.
- The application-level examples still show selected operations (`Query` and `PutItem`) rather than a complete DynamoDB wrapper for every operation, which is appropriate for a tutorial but should be expanded for production use.
