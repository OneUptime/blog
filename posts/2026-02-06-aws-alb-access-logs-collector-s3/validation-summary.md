# Validation Summary: How to Ingest AWS App Load Balancer Access Logs into the OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Application Load Balancer access logs
- Amazon S3
- Amazon SQS
- AWS CLI
- AWS Lambda
- Python
- OpenTelemetry Collector
- OpenTelemetry Protocol HTTP/JSON

## Sources Consulted
- AWS Elastic Load Balancing documentation: Access logs for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html
- AWS CLI Command Reference: `elbv2 modify-load-balancer-attributes`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-load-balancer-attributes.html
- Amazon S3 Event Notifications documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html
- Amazon S3 `PutBucketNotificationConfiguration` API documentation: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketNotificationConfiguration.html
- OpenTelemetry Collector AWS S3 receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/awss3receiver
- OpenTelemetry Collector text encoding extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/encoding/textencodingextension
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry HTTP semantic conventions registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/

## Issues Found
- The AWS account ID examples used a 9-digit placeholder. Updated ARNs, S3 paths, SQS URLs, and target group ARNs to use a 12-digit placeholder account ID.
- The OpenTelemetry Collector `awss3` receiver configuration used unsupported keys (`s3.bucket`, `s3.prefix`, `encoding`, and `visibility_timeout`). Replaced them with the current upstream `s3downloader.s3_bucket`, `s3downloader.s3_prefix`, and `encodings` configuration.
- The Collector example implied ALB parsing in the transform processor. Adjusted the configuration to accurately read ALB `.log.gz` files as text records using the `text_encoding` extension and clarified that the transform processor adds resource attributes.
- The post described direct S3 polling too broadly. Updated the wording to match the receiver's time-range retrieval mode.
- The Lambda parser used simple space splitting, which breaks quoted ALB fields such as request lines and user agents. Replaced it with `shlex.split`.
- The Lambda parser split host and port with `split(':')`, which is fragile for IPv6 and missing target values. Replaced it with `rsplit(':', 1)` and helper handling for `-`.
- The Lambda parser assumed every numeric field was always populated. Added helper parsing for `-` values.
- The OTLP payload used a constant `timeUnixNano` value instead of the ALB log timestamp. Added timestamp conversion from ISO 8601 to Unix nanoseconds.
- The Lambda OTLP attributes used deprecated HTTP semantic convention names. Replaced `http.status_code` with `http.response.status_code` and `http.method` with `http.request.method`.
- The S3 notification setup omitted the SQS queue policy needed for S3 to publish notifications. Added a minimal `aws sqs set-queue-attributes` policy command.

## Review Notes
The direct Collector path ingests ALB access logs as raw text log records with resource attributes. The Lambda path performs structured parsing before sending OTLP/HTTP JSON. For production, consider using infrastructure-as-code for the S3, SQS, IAM, and Lambda setup to avoid manual policy drift.
