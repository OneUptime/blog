# Validation Summary: How to Use Cloud Resource Semantic Conventions (AWS, GCP, Azure)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- OpenTelemetry AWS resource detectors
- OpenTelemetry GCP resource detectors
- OpenTelemetry Azure resource detectors
- AWS EC2, ECS, EKS, Lambda, and Elastic Beanstalk
- Google Compute Engine, GKE, Cloud Run, and Cloud Functions
- Azure Virtual Machines, AKS, App Service, and Azure Functions

## Sources Consulted
- OpenTelemetry Cloud resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/cloud/
- OpenTelemetry FaaS semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/faas/
- OpenTelemetry JavaScript NodeSDK documentation: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md
- OpenTelemetry JavaScript package metadata and published package contents for `@opentelemetry/resources` 2.7.1
- OpenTelemetry JavaScript package metadata and published package contents for `@opentelemetry/resource-detector-aws` 2.18.0
- OpenTelemetry JavaScript package metadata and published package contents for `@opentelemetry/resource-detector-gcp` 0.53.0
- OpenTelemetry JavaScript package metadata and published package contents for `@opentelemetry/resource-detector-azure` 0.26.0
- OpenTelemetry JavaScript package metadata and published package contents for `@opentelemetry/resource-detector-container` 0.8.9
- OpenTelemetry Python package contents for `opentelemetry-sdk-extension-aws` 2.1.0
- OpenTelemetry GCP resource detector package information and package contents for `opentelemetry-resourcedetector-gcp` 1.12.0a0: https://pypi.org/project/opentelemetry-resourcedetector-gcp/

## Issues Found
- The JavaScript examples used removed `*DetectorSync` exports and detector classes from OpenTelemetry JS contrib packages. Updated examples to use the current detector singleton exports such as `awsEc2Detector`, `awsEcsDetector`, `awsLambdaDetector`, `gcpDetector`, and `azureVmDetector`.
- The JavaScript examples used `new Resource(...)` from `@opentelemetry/resources`, which is not exported by the current package. Updated examples to use `resourceFromAttributes(...)`.
- The JavaScript fallback detector names used old `envDetectorSync`, `hostDetectorSync`, and `processDetectorSync` names. Updated them to `envDetector`, `hostDetector`, and `processDetector`.
- The container detector example used the old `containerDetectorSync` export. Updated it to `containerDetector`.
- Azure `cloud.platform` examples used obsolete underscore values such as `azure_vm` and `azure_functions`. Updated them to current semantic convention values such as `azure.vm` and `azure.functions`.
- The Azure VM example listed `cloud.account.id`, but the current JavaScript Azure VM detector does not populate that attribute. Removed it from the detected attribute list.
- The Azure Functions example listed `faas.name` and `faas.version`, but the current JavaScript Azure Functions detector sets `service.name`, `faas.instance`, and `faas.max_memory`; the FaaS semantic conventions also say Azure Functions should not set `faas.version`. Updated the example.
- The AWS Lambda Python example used an incorrect import path for `AwsLambdaResourceDetector`. Updated it to `opentelemetry.sdk.extension.aws.resource`.
- The AWS Lambda example listed `cloud.account.id`, but the current Python AWS Lambda detector does not populate it. Removed it from the detected attribute list.
- The AWS Lambda example described `faas.max_memory` in MB. Current semantic conventions require bytes, so the example now shows bytes.
- The ECS example showed `aws.ecs.launchtype` as `FARGATE`, but the current detector lowercases the metadata value. Updated it to `fargate`.
- The GKE example overclaimed Kubernetes pod, namespace, deployment, and container attributes from the GCP resource detector. Updated the wording and attribute list to reflect the current GCP detector output.
- The multi-cloud section said the first detector that identifies the environment wins. Current OpenTelemetry JS resource detection runs all configured detectors and merges their resources. Updated the explanation.

## Review Notes
The post is now technically accurate for the current OpenTelemetry semantic convention pages and current published JavaScript/Python detector packages checked during review. The OpenTelemetry cloud and FaaS semantic conventions are still marked Development, so future convention or detector releases may require another pass.
