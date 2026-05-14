# Validation Summary: How to Manage Terraform State with Flux CD Bucket Source

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Bucket Source
- Tofu Controller / Terraform Controller
- Terraform S3 backend
- AWS S3
- MinIO
- Google Cloud Storage
- Kubernetes custom resources
- Flux notification-controller
- AWS CLI
- kubectl

## Sources Consulted
- Flux Bucket Source documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Tofu Controller getting started documentation: https://flux-iac.github.io/tofu-controller/getting_started/
- Tofu Controller custom backend documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/with-a-custom-backend/
- Tofu Controller Terraform CRD schema: https://github.com/flux-iac/tofu-controller/blob/main/config/crd/bases/infra.contrib.fluxcd.io_terraforms.yaml
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- AWS CLI put-bucket-versioning documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post stated that Flux CD Bucket Source pulls Terraform state and configurations. Bucket Source produces source artifacts from object storage; Terraform state is handled by the configured Terraform backend. Updated the wording and architecture diagram to distinguish configuration sourcing from backend state storage.
- The prerequisites described Google Cloud Storage as S3-compatible. Flux supports AWS S3, GCS, and S3-compatible providers, but GCS should not be described as an S3-compatible bucket in this context. Updated the prerequisite wording.
- The HelmRelease example used the old `tf-controller` chart name and omitted the required HelmRepository source. Updated the example to the current Tofu Controller chart and HelmRepository shown in official documentation.
- The S3 backend examples used deprecated DynamoDB locking through `dynamodb_table`. Updated the examples and best practices to use Terraform's current S3 native `use_lockfile = true` locking option.
- The state-locking section showed a separate Terraform resource for creating a DynamoDB lock table. Replaced it with the backend configuration needed for S3 native state locking.
- The drift detection example used unsupported fields: `enableDriftDetection`, `driftDetectionPeriod`, and `forceReplan`. Updated it to use the current `disableDriftDetection: false` field, noting that drift detection is enabled by default.
- The troubleshooting command referenced `deployment/tf-controller`. Updated it to `deployment/tofu-controller`.

## Review Notes
The guide is now technically consistent with current Flux and Tofu Controller documentation. The title still frames the workflow around state management with Bucket Source; the body now clarifies that Bucket Source supplies Terraform configuration artifacts and the Terraform backend manages state.
