# Validation Summary: How to Handle Binding Errors and Retries in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency API (retry, timeout, circuit breaker policies)
- Dapr Bindings (input and output)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Node.js / Express
- AWS SQS / SNS (dead letter queue configuration)
- Dapr metrics / observability

## Sources Consulted
- Dapr Resiliency spec reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Retry policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Circuit breaker policies: https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr Resiliency targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Input bindings how-to: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-triggers/
- Dapr JavaScript Client SDK: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr AWS SQS binding spec: https://docs.dapr.io/reference/components-reference/supported-bindings/sqs/
- Dapr AWS SNS/SQS pub/sub spec: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-snssqs/
- Dapr metrics overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr metrics reference (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md

## Issues Found

1. **Invalid `initialInterval` field in exponential retry policy**: The retry policy included `initialInterval: 500ms`, which is not a valid field in Dapr's resiliency retry spec. The exponential policy only supports `maxInterval` and `maxRetries`. Removed the invalid field.

2. **Inaccurate input binding HTTP status code explanation**: The post stated that "404 Not Found or 5xx" triggers retry. In reality, Dapr treats any non-200 response as a failure and will retry delivery. Updated to correctly state that any non-`200` response triggers retry.

3. **Incorrect AWS SQS binding DLQ metadata**: The post showed `deadLetterQueueName` and `maxReceiveCount` as metadata fields on `bindings.aws.sqs`. The SQS binding component does not support DLQ configuration in its metadata at all. Replaced the example with the AWS SNS/SQS pub/sub component (`pubsub.snssqs`) which does support DLQ via `sqsDeadLettersQueueName` and `messageReceiveLimit` fields. Added a note clarifying the distinction.

4. **Fabricated metric names**: The post listed `dapr_component_output_binding_success_total`, `dapr_component_output_binding_failure_total`, and `dapr_component_input_binding_success_total` — none of which exist. Replaced with the actual Dapr metrics: `dapr_component_output_binding_count`, `dapr_component_output_binding_latencies`, and `dapr_component_input_binding_count`.

## Review Notes
- The Resiliency API version (`dapr.io/v1alpha1`) is still in alpha. Future Dapr releases may promote this to a stable version with potential schema changes.
- The JavaScript SDK code examples use `require()` (CommonJS). The `@dapr/dapr` SDK also supports ESM imports — this is a style choice, not an error.
- The `DaprClient()` constructor with no arguments relies on environment variables (`DAPR_HTTP_ENDPOINT` or `DAPR_GRPC_ENDPOINT`) being set by the Dapr sidecar, which is correct for sidecar-injected environments.
- The circuit breaker `trip` expression uses `consecutiveFailures >= 3`, which is valid CEL syntax. The Dapr docs default example uses `consecutiveFailures > 5` — the post's choice of threshold is a valid customization.
