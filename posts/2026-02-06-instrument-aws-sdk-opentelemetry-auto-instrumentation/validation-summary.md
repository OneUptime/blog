# Validation Summary: How to Instrument AWS SDK Calls with OpenTelemetry Auto-Instrumentation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry auto-instrumentation
- AWS SDK instrumentation
- Python, boto3, botocore, opentelemetry-instrument
- Node.js, AWS SDK for JavaScript v3, @opentelemetry/sdk-node, @opentelemetry/instrumentation-aws-sdk
- Java, OpenTelemetry Java agent, AWS SDK for Java v2
- OTLP trace export
- AWS SQS context propagation

## Sources Consulted
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Botocore instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/botocore/botocore.html
- OpenTelemetry JavaScript SDK Node package documentation: https://www.npmjs.com/package/@opentelemetry/sdk-node
- OpenTelemetry AWS SDK JavaScript instrumentation documentation: https://www.npmjs.com/package/@opentelemetry/instrumentation-aws-sdk
- OpenTelemetry JavaScript AWS SDK SQS instrumentation docs: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/packages/instrumentation-aws-sdk/doc/sqs.md
- OpenTelemetry Java instrumentation supported libraries: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/supported-libraries.md
- OpenTelemetry Java AWS SDK v2 instrumentation docs: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/aws-sdk/aws-sdk-2.2/library/README.md
- OpenTelemetry Java AWS SDK instrumentation settings: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/aws-sdk/README.md
- OpenTelemetry semantic convention AWS attributes: https://github.com/open-telemetry/semantic-conventions/blob/main/docs/registry/attributes/aws.md
- OpenTelemetry semantic convention cloud attributes: https://github.com/open-telemetry/semantic-conventions/blob/main/docs/registry/attributes/cloud.md
- OneUptime OpenTelemetry endpoint documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The Python business-logic snippet used `json.dumps` without importing `json`. Added `import json` so the example is syntactically valid and runnable aside from AWS credentials/resources.
- The Python zero-code section referenced `opentelemetry-distro` but did not install it. Added `opentelemetry-distro` to the core Python package installation command because it provides the `opentelemetry-instrument` tool used later.
- The Node.js AWS SDK instrumentation option `sqsExtractContextPropagation` was not a documented current option. Replaced it with `sqsExtractContextPropagationFromPayload` and clarified that default SQS propagation uses message attributes, while this option additionally extracts context from payloads.
- The attribute examples used `aws.region`, but current OpenTelemetry conventions and instrumentation documentation use `cloud.region` for the request region. Updated the diagram and reference table.
- The attributes section stated that all languages produce a fully consistent set of attributes. Adjusted the wording because current instrumentation can emit different names depending on semantic convention version and stability opt-in settings, including `http.status_code` versus `http.response.status_code`.
- The Java programmatic AWS SDK v2 example used the older `AwsSdkTelemetry.create(openTelemetry)` / `newExecutionInterceptor()` API shape. Updated it to `AwsSdkTelemetry.create(openTelemetry).build()` and `createExecutionInterceptor()` per the current Java instrumentation docs.
- The retry section implied that every retry appears as a child span. Qualified this because retry visibility depends on the language and whether lower-level HTTP instrumentation is enabled or suppressed; attempts may appear as HTTP child spans or events/attributes.

## Review Notes
The examples are technically plausible after correction. The Java programmatic snippet still omits Maven/Gradle dependency declarations, and the OneUptime endpoint examples omit authentication headers, but those are setup details rather than incorrect code in the shown AWS SDK instrumentation flow.
