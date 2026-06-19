# Validation Summary: How to Fix 'Resource Detection Failed' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry resource detectors
- TypeScript
- Kubernetes and the Downward API
- Docker Compose
- AWS EC2, ECS, EKS, and IMDS
- Google Cloud Platform, GKE, and metadata server
- Azure App Service, Azure Functions, Azure VMs, and IMDS

## Sources Consulted
- OpenTelemetry JavaScript Resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK Node README: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md
- OpenTelemetry JS SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry npm package metadata and type declarations for `@opentelemetry/resources`, `@opentelemetry/sdk-node`, `@opentelemetry/semantic-conventions`, `@opentelemetry/resource-detector-aws`, `@opentelemetry/resource-detector-gcp`, and `@opentelemetry/resource-detector-azure`
- AWS EC2 IMDS documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- Google Compute Engine metadata query documentation: https://docs.cloud.google.com/compute/docs/metadata/querying-metadata
- GKE Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Azure Instance Metadata Service documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service
- Kubernetes Downward API environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/environment-variable-expose-pod-information/
- Kubernetes dependent environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/

## Issues Found
- The TypeScript examples used `new Resource(...)`, but current OpenTelemetry JS 2.x no longer exports `Resource` as a constructible class. Updated examples to use `resourceFromAttributes(...)`.
- The debug script imported and used `detectResourcesSync`, which was replaced by `detectResources` in OpenTelemetry JS 2.x. Updated the script to await `detectResources(...)`.
- The robust detection example imported `ResourceDetectionConfig` without using it and referenced `fs.existsSync(...)` without importing `fs`. Removed the unused import and added the missing `fs` import.
- The robust detection example imported `ATTR_DEPLOYMENT_ENVIRONMENT` from the stable semantic conventions entry point, but the current stable attribute is `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`. Updated the import and resource attribute usage.
- The GKE example used a pod annotation `gke-metadata-server: "true"`, which is not the documented way to enable GKE metadata server access. Replaced it with a Kubernetes service account annotation for Workload Identity Federation and clarified that the metadata server must be enabled at the cluster or node pool level.
- The Azure detector example only used `azureAppServiceDetector` even though the shown error was for the Azure IMDS endpoint used by Azure VMs. Added `azureFunctionsDetector` and opt-in `azureVmDetector` handling.
- The Kubernetes `OTEL_RESOURCE_ATTRIBUTES` examples referenced `$(POD_NAME)`, `$(POD_NAMESPACE)`, and `$(NODE_NAME)` before those variables were defined. Reordered the environment variables so dependent values appear later in the list.
- The metadata diagnostic script checked AWS, GCP, and Azure metadata endpoints without required modern headers. Added AWS IMDSv2 token handling, the GCP `Metadata-Flavor: Google` header, and the Azure `Metadata: true` header.
- The Docker Compose and ECS examples used `deployment.environment`, which is superseded by the stable `deployment.environment.name` resource attribute. Updated those examples.

## Review Notes
The examples are now aligned with current OpenTelemetry JS 2.x APIs. The manual `OTEL_RESOURCE_ATTRIBUTES` parser in the Kubernetes section remains intentionally simple; production code can rely on `envDetector` directly for full OpenTelemetry environment variable parsing semantics.
