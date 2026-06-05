# Validation Summary: How to Use OpenTelemetry Lambda Layers for Auto-Instrumentation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Lambda layers
- AWS Lambda layers and runtime wrappers
- AWS CLI `lambda update-function-configuration`
- Python Lambda functions with boto3
- Node.js Lambda functions with AWS SDK for JavaScript v3
- Java Lambda functions with the OpenTelemetry Java agent
- OpenTelemetry OTLP exporters and propagators
- AWS SAM / CloudFormation

## Sources Consulted
- OpenTelemetry Lambda Auto-Instrumentation documentation: https://opentelemetry.io/docs/platforms/faas/lambda-auto-instrument/
- OpenTelemetry Lambda GitHub repository README and layer ARN formats: https://github.com/open-telemetry/opentelemetry-lambda
- OpenTelemetry Lambda Node.js layer README: https://github.com/open-telemetry/opentelemetry-lambda/blob/main/nodejs/README.md
- OpenTelemetry Lambda Java layer README: https://github.com/open-telemetry/opentelemetry-lambda/blob/main/java/README.md
- OpenTelemetry Lambda collector layer README: https://github.com/open-telemetry/opentelemetry-lambda/blob/main/collector/README.md
- OpenTelemetry AWS Lambda semantic conventions and propagator guidance: https://opentelemetry.io/docs/specs/semconv/faas/aws-lambda/
- AWS Lambda runtime wrapper documentation: https://docs.aws.amazon.com/lambda/latest/dg/runtimes-modify.html
- AWS CLI `update-function-configuration` documentation: https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- AWS Distro for OpenTelemetry Lambda Python documentation, for comparison with ADOT-specific layer names and wrapper paths: https://aws-otel.github.io/docs/getting-started/lambda/lambda-python/

## Issues Found
- The post described the OpenTelemetry community layers as AWS-managed and used ADOT-style Python wrapper/path details. Changed the wording to community OpenTelemetry layers and updated the Python wrapper to `/opt/otel-handler` for the OpenTelemetry community layer.
- The ARN examples used incorrect layer names such as `opentelemetry-python-aws-sdk-amd64`, `opentelemetry-nodejs-amd64`, and `opentelemetry-java-agent-amd64`. Updated examples to the current OpenTelemetry community layer naming format, including release versions embedded in the layer name.
- The examples pointed OTLP exporters at `localhost` but did not attach a collector layer. Added the OpenTelemetry collector layer to the CLI and CloudFormation snippets.
- The Java example set `JAVA_TOOL_OPTIONS=-javaagent:/opt/opentelemetry-javaagent.jar`, but the OpenTelemetry Java agent layer is loaded through the `/opt/otel-handler` wrapper. Removed the explicit `JAVA_TOOL_OPTIONS` setting and clarified the wrapper behavior.
- The Node.js instrumentation list used `fetch` as an instrumentation name. Updated it to `undici`, which is the OpenTelemetry Node.js instrumentation package name used for Undici-backed APIs including modern `fetch`.
- The propagation section implied X-Ray headers are always present and omitted the `xray-lambda` caveat for AWS X-Ray active tracing. Softened the claim and added the documented `xray-lambda` note.
- The CloudFormation example referenced an undefined `${Environment}` variable. Replaced it with a concrete `deployment.environment=production` resource attribute.
- The troubleshooting section used the wrong Python instrumentation-disabling variable pattern. Updated it to `OTEL_PYTHON_DISABLED_INSTRUMENTATIONS`.

## Review Notes
The latest OpenTelemetry Lambda release tags checked during validation were `layer-collector/0.22.0`, `layer-python/0.20.0`, `layer-nodejs/0.22.0`, and `layer-javaagent/0.20.0`. Layer versions should still be checked before publishing or deploying because OpenTelemetry Lambda layers are released independently per language.
