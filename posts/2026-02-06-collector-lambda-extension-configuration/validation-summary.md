# Validation Summary: How to Configure the Collector Lambda Extension

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Lambda extension
- AWS Lambda extensions
- AWS Lambda layers
- AWS CLI
- Collector YAML configuration
- Collector confmap providers
- OTLP/HTTP exporter and receiver
- Collector batch, memory limiter, resource, and filter processors

## Sources Consulted
- OpenTelemetry Lambda Collector Configuration: https://opentelemetry.io/docs/platforms/faas/lambda-collector/
- OpenTelemetry Lambda repository README and releases: https://github.com/open-telemetry/opentelemetry-lambda
- AWS Lambda execution environment lifecycle: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html
- AWS Lambda Extensions API: https://docs.aws.amazon.com/lambda/latest/dg/runtimes-extensions-api.html
- AWS CLI `lambda update-function-configuration`: https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector environment variable confmap provider README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/confmap/provider/envprovider/README.md
- AWS Distro for OpenTelemetry confmap provider documentation: https://aws-otel.github.io/docs/components/confmap-providers

## Issues Found
- The Lambda layer ARN omitted the version suffix required by the published OpenTelemetry Lambda layer format. Updated the example to use the current collector layer naming pattern with `opentelemetry-collector-amd64-0_22_0:1`.
- The Collector examples used the deprecated `otlphttp` exporter component name. Updated all examples to use the current `otlp_http` component name.
- The filter processor example used older nested `traces: span:` syntax. Updated it to the current `trace_conditions` OTTL configuration format.
- The S3 collector config URI used `s3://bucket/key`, but the documented confmap provider format is `s3://<bucket>.s3.<region>.amazonaws.com/<key>`. Updated the example URI.
- The post said the collector can be configured entirely through standard OTLP exporter environment variables without a YAML file. Current Lambda collector docs show the default config exports to `debug`; production OTLP export requires collector configuration. Reworked the section to show environment variables referenced from a small collector YAML file.
- The post compared a 5 second batch timeout to a "typical 30 seconds" server timeout, but the current batch processor default is 200 ms. Replaced that comparison with a version-independent recommendation to keep Lambda batch timeouts short.
- The OTLP receiver comment claimed HTTP is preferred over gRPC in Lambda for lower overhead. I changed it to a neutral statement about using the OTLP/HTTP localhost receiver because the official docs do not make that preference claim.

## Review Notes
- The YAML and JSON snippets were parsed successfully after edits.
- The AWS CLI examples use documented `update-function-configuration`, `--layers`, and `--environment` options.
- The Lambda lifecycle discussion aligns with AWS documentation: extensions run during Init/Invoke/Shutdown, external extensions share resources with the function, Lambda returns the function response even if extensions are still running, and the Shutdown phase allows up to 2,000 ms when external extensions are registered.
