# Validation Summary: How to Create a Terraform Resource CRD with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux GitRepository
- Flux Kustomization
- Tofu Controller
- Terraform custom resources
- Kubernetes Secrets and ConfigMaps

## Sources Consulted
- Tofu Controller Getting Started: https://flux-iac.github.io/tofu-controller/getting_started/
- Tofu Controller auto approval guide: https://flux-iac.github.io/tofu-controller/use-tf-controller/provision-resources-and-auto-approve/
- Tofu Controller manual approval guide: https://flux-iac.github.io/tofu-controller/use-tf-controller/plan-and-manually-apply-terraform-resources/
- Tofu Controller outputs guide: https://flux-iac.github.io/tofu-controller/use-tf-controller/provision-resources-obtain-outputs/
- Tofu Controller custom backend guide: https://flux-iac.github.io/tofu-controller/use-tf-controller/with-a-custom-backend/
- Tofu Controller Terraform CRD schema and source code: https://github.com/flux-iac/tofu-controller
- Flux GitRepository API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3

## Issues Found
- The post described a "complete" or "full" Terraform CRD schema, but the examples cover only selected core fields. Changed that wording to "core" schema/fields.
- The post used `approvePlan: "manual"` as the manual approval mode. Tofu Controller manual approval is configured by omitting `approvePlan` or setting it to `""`; `auto` is the special value for auto-apply. Updated comments and best practices accordingly.
- The post said `storeReadablePlan: human` stores plan output in a Kubernetes Secret. Tofu Controller stores human-readable plans in ConfigMaps; JSON readable plans are stored in Secrets. Updated the description and kubectl example.
- The status command referenced `.status.plan.planJSON`, which is not a field in the v1alpha2 Terraform status. Replaced it with `.status.plan.pending` for the pending plan ID.
- The human-readable plan command used the wrong object name, object kind, and data key. Updated it to read `.data.tfplan` from the `tfplan-{workspace}-{name}` ConfigMap used by Tofu Controller.
- The pinned Git ref section implied that a Terraform resource can override the source Git ref directly. Flux ref selection belongs to the source object, so the example now creates a separate pinned `GitRepository` and points the Terraform resource at it.
- The runner termination field was described as a plan/apply timeout. The CRD defines `runnerTerminationGracePeriodSeconds` as the runner pod termination grace period, so the heading and comments were corrected.

## Review Notes
- The S3 backend example keeps `dynamodb_table` because the current Tofu Controller custom backend documentation uses it and OpenTofu still supports it. Current HashiCorp Terraform documentation marks DynamoDB-based S3 locking as deprecated in favor of S3 lock files for newer Terraform versions, so teams using newer Terraform outside the controller should review that backend choice.
