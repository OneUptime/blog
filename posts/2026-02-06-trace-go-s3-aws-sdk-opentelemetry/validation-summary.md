# Validation Summary: How to Trace Go S3 and AWS SDK Operations with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Go
- AWS SDK for Go v2
- Amazon S3
- Amazon DynamoDB
- Amazon SQS
- OpenTelemetry Go SDK
- OpenTelemetry AWS SDK v2 instrumentation (`otelaws`)
- OTLP gRPC trace exporter

## Sources Consulted
- OpenTelemetry `otelaws` Go package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/github.com/aws/aws-sdk-go-v2/otelaws
- OpenTelemetry `otelaws` source for middleware behavior and default attribute builders: https://github.com/open-telemetry/opentelemetry-go-contrib/tree/main/instrumentation/github.com/aws/aws-sdk-go-v2/otelaws
- AWS SDK for Go v2 configuration guide: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-gosdk.html
- AWS SDK for Go v2 retry and timeout guide: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-retries-timeouts.html
- AWS SDK for Go v2 `config` package reference: https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/config
- AWS SDK for Go v2 S3 utilities guide: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/sdk-utilities-s3.html
- OpenTelemetry OTLP gRPC trace exporter package reference: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc

## Issues Found
- The post overstated what `otelaws` automatically captures for AWS SDK calls. Default instrumentation records service/operation, region, HTTP status, request ID, selected service-specific attributes, and errors, but S3 bucket names and object keys require custom attributes or an attribute builder. Updated the text to describe automatic and custom attributes accurately.
- The post claimed automatic spans include retry attempts and detailed request-phase timings. The checked `otelaws` middleware does not add retry events or phase timing attributes by default. Updated the wording to say retries are reflected in overall SDK call duration/final status and require custom middleware or application attributes for explicit retry/backoff details.
- The S3 client setup example imported `github.com/aws/aws-sdk-go-v2/aws` without using it. Removed the unused import.
- The multipart upload example used `bytes.NewReader` but did not import `bytes`. Added the missing import.
- The batch delete example used `fmt`, `aws.String`, and `s3.DeleteObjectInput` but did not import `fmt`, `github.com/aws/aws-sdk-go-v2/aws`, or `github.com/aws/aws-sdk-go-v2/service/s3`. Added the missing imports.
- The retry configuration example imported `github.com/aws/aws-sdk-go-v2/aws` without using it. Removed the unused import.

## Review Notes
The main APIs used in the post are current: `otelaws.AppendMiddlewares` is the documented AWS SDK v2 instrumentation hook, `config.WithRetryMaxAttempts` is present in the AWS SDK for Go v2 config package, and `otlptracegrpc.WithInsecure` remains documented. Local compilation could not be performed because the `go` toolchain is not installed in this workspace.
