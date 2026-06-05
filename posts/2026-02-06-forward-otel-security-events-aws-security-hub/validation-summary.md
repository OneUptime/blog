# Validation Summary: How to Forward OpenTelemetry Security Events to AWS Security Hub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector attributes processor
- OpenTelemetry Collector AWS CloudWatch Logs exporter
- OpenTelemetry Python logs API and SDK
- AWS CloudWatch Logs subscription filters
- AWS Lambda
- AWS Security Hub and AWS Security Finding Format
- AWS CLI

## Sources Consulted
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector AWS CloudWatch Logs exporter README and source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awscloudwatchlogsexporter
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/#logs
- OpenTelemetry Python logs API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/_logs.html
- AWS Security Hub required ASFF attributes: https://docs.aws.amazon.com/securityhub/latest/userguide/asff-required-attributes.html
- AWS Security Hub BatchImportFindings guidance: https://docs.aws.amazon.com/securityhub/latest/userguide/finding-update-batchimportfindings.html
- AWS CLI `securityhub batch-import-findings` command reference: https://docs.aws.amazon.com/cli/latest/reference/securityhub/batch-import-findings.html
- AWS CLI `logs put-subscription-filter` command reference: https://docs.aws.amazon.com/cli/latest/reference/logs/put-subscription-filter.html
- AWS CloudWatch Logs subscription filters documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- AWS CloudWatch Logs filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html

## Issues Found
- The Collector filter processor example used the older `logs.include.record_attributes` configuration shape. Current filter processor documentation uses OTTL `log_conditions`, and matching conditions drop telemetry. Updated the config to drop logs where `log.attributes["security.event_type"] == nil`, which keeps security events in the security pipeline.
- The attributes processor comment said it added resource attributes, but the `attributes` processor modifies telemetry attributes. Updated the wording to "log attributes" to match the configuration and the downstream Lambda mapping.
- The Python example imported unused modules and imported `LogRecord` from `opentelemetry.sdk._logs`. Updated the snippet to use the current documented logger provider setup and `Logger.emit(...)` keyword arguments.
- The Lambda example used `datetime.utcnow()`, which is deprecated in modern Python. Updated it to `datetime.now(timezone.utc)` and reused one timestamp for both `CreatedAt` and `UpdatedAt`.
- The Security Hub finding `Types` value embedded the event type under `Software and Configuration Checks`, which did not line up well with AWS's documented ASFF type namespaces and categories. Updated it to `Unusual Behaviors/Application` while preserving the original event type in the title and attributes.
- The Security Hub severity object only set `Normalized`. Added `Label` and `Original` from the OpenTelemetry security severity attribute so the finding carries both normalized and provider-native severity values.
- The Lambda function sent all findings in one `BatchImportFindings` call. Security Hub accepts a maximum of 100 findings per request, so the example now imports findings in chunks of 100.
- The CloudWatch Logs subscription setup omitted the required Lambda resource policy permission that lets CloudWatch Logs invoke the Lambda function. Added the documented `aws lambda add-permission` command before `put-subscription-filter`.
- The CloudWatch Logs filter pattern used dot notation for an attribute key that itself contains dots. Updated the command to use bracket notation for `security.event_type`, matching AWS filter pattern documentation.

## Review Notes
The AWS CloudWatch Logs exporter is a contrib Collector component and is not part of the core Collector binary. The post correctly positions it as a Collector exporter path, but users must run a Collector distribution that includes `awscloudwatchlogs`, such as the contrib distribution or a custom build.
