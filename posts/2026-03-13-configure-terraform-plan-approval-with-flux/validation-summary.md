# Validation Summary: How to Configure Terraform Plan Approval with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Tofu Controller
- Terraform / OpenTofu
- Kubernetes custom resources
- Kubernetes RBAC
- Flux notification-controller Alerts
- kubectl

## Sources Consulted
- Tofu Controller manual plan approval documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/plan-and-manually-apply-terraform-resources/
- Tofu Controller Terraform API source for `TerraformSpec`, `PlanStatus`, and `storeReadablePlan`: https://github.com/flux-iac/tofu-controller/blob/main/api/v1alpha2/terraform_types.go
- Tofu Controller variable reference documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/set-variables-for-terraform-resources/
- Tofu Controller output secret documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/provision-resources-obtain-outputs/
- Tofu Controller Flux Receivers and Alerts integration documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/flux-receiver-and-alert/
- Flux notification-controller Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification-controller Alert API reference: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- kubectl patch documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- kubectl annotate documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/

## Issues Found
- The post used `approvePlan: "manual"`, but Tofu Controller manual approval mode is enabled by leaving `.spec.approvePlan` empty or omitting it. Updated the Terraform example and best practice text.
- The post said approval is done with the `infra.contrib.fluxcd.io/approvePlan` annotation. Tofu Controller approves plans through `.spec.approvePlan`, so the approval command now uses `kubectl patch` to set the spec field.
- The post read plan IDs from non-existent status fields such as `.status.plan.planId` and used `.status.plan.lastApplied` before approval. The pending plan ID is exposed as `.status.plan.pending`, so the commands now use that field.
- The post attempted to read a human-readable plan from a Secret named `production-database-tfplan-human`. With `storeReadablePlan: human`, Tofu Controller stores readable plan details in a ConfigMap named `tfplan-<workspace>-<terraform-name>` under the `tfplan` key. Updated the review commands accordingly.
- The post referenced non-existent `.status.plan.planJSON` and `.status.plan.summary` fields. The JSON review example now points to the readable plan ConfigMap when `storeReadablePlan: json` is configured, and the status command now checks the pending plan ID.
- The rejection workflow removed a non-existent approval annotation. Updated it to keep `.spec.approvePlan` empty and explain that a corrected source revision causes Tofu Controller to replace the stale pending plan.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1`, but current Flux Alert examples and API reference use `v1beta3`. Updated the API version.
- The Flux Alert example selected `kind: Terraform` without noting that Flux Alert CRDs must be patched to allow third-party kinds. Added a note in the YAML comments.
- The RBAC section claimed Kubernetes RBAC could allow patching only annotations. RBAC cannot restrict patches to a single field, and approval now patches `.spec.approvePlan`, so the comment was corrected.
- The post described a cryptographic binding between the reviewed plan and apply operation. Tofu Controller documents a plan ID derived from the source revision and a saved pending plan; the wording was adjusted to avoid overstating the mechanism.

## Review Notes
The post is now technically accurate for current Tofu Controller `v1alpha2` behavior. For stricter GitOps practice, teams should prefer committing the approved `spec.approvePlan` value to Git instead of patching the live resource directly.
