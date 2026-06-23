# Validation Summary: How to Configure OpenTelemetry Resource Detection for Cloud Environments

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- OpenTelemetry resources and resource detectors
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Python SDK resource packages
- AWS, GCP, and Azure resource detection
- Kubernetes Downward API metadata
- Docker/container resource metadata
- OTEL environment variable configuration

## Sources Consulted
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JS 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry Resource SDK specification: https://opentelemetry.io/docs/specs/otel/resource/sdk/
- OpenTelemetry Python resources documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/resources.html
- OpenTelemetry semantic conventions package/type declarations: https://www.npmjs.com/package/@opentelemetry/semantic-conventions
- OpenTelemetry JS resources package/type declarations: https://www.npmjs.com/package/@opentelemetry/resources
- OpenTelemetry AWS resource detector package: https://www.npmjs.com/package/@opentelemetry/resource-detector-aws
- OpenTelemetry GCP resource detector package: https://www.npmjs.com/package/@opentelemetry/resource-detector-gcp
- OpenTelemetry Azure resource detector package: https://www.npmjs.com/package/@opentelemetry/resource-detector-azure
- AWS Python SDK extension package: https://pypi.org/project/opentelemetry-sdk-extension-aws/
- GCP Python resource detector package: https://pypi.org/project/opentelemetry-resourcedetector-gcp/
- Azure Python resource detector package: https://pypi.org/project/opentelemetry-resource-detector-azure/
- Container ID Python detector package: https://pypi.org/project/opentelemetry-resource-detector-containerid/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- AWS Instance Metadata Service documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html
- Google Cloud metadata server documentation: https://cloud.google.com/compute/docs/metadata/overview
- Azure Instance Metadata Service documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service

## Issues Found
- The JavaScript examples used `new Resource(...)`, but current `@opentelemetry/resources` 2.x no longer exports a constructible `Resource` class. Replaced those examples with `resourceFromAttributes(...)` and type-only `Resource` imports where needed.
- The JavaScript examples used deprecated `SEMRESATTRS_*` constants. Replaced them with current `ATTR_*` semantic convention constants from the incubating entry point where appropriate.
- Several examples treated `NodeSDK.start()` as a promise. Current `@opentelemetry/sdk-node` exposes `start(): void`, so the examples now call it synchronously.
- Merge-order examples claimed explicit/custom resources took precedence while calling `merge` in the opposite order. Updated the code so detected resources are merged with explicit/custom resources in the order that gives explicit attributes priority.
- The Python install commands referenced non-existent or outdated detector package names. Updated AWS, GCP, and container detector packages to published package names.
- The `OTEL_NODE_RESOURCE_DETECTORS` example described the variable as a skip list and used unsupported detector names. Updated it to show built-in Node detector selection.
- The container image tag examples used the deprecated singular tag attribute shape. Updated them to use `container.image.tags` as an array-valued attribute.
- The Lambda cold-start attribute used an incorrect key. Updated it to the current `faas.coldstart` semantic convention constant.
- The Azure VM platform value used the older `azure_vm` form. Updated it to `azure.vm`.
- Several Additional Resources URLs redirected to newer canonical locations. Updated the OpenTelemetry JavaScript/Python, Google Cloud Observability, and Azure Monitor links.

## Review Notes
The post is now accurate for the current OpenTelemetry JavaScript 2.x resource API and current published package names as of 2026-06-23. Some resource detector package versions are still marked experimental/incubating upstream, so future OpenTelemetry semantic convention updates may require another pass.
