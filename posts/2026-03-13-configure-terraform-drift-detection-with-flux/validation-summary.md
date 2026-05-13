# Validation Summary: How to Configure Terraform Drift Detection with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Tofu Controller / Terraform custom resource
- Terraform / OpenTofu drift detection workflow
- Kubernetes `kubectl`
- Terraform HCL lifecycle rules
- AWS EKS managed node groups

## Sources Consulted
- Tofu Controller overview and drift detection documentation: https://flux-iac.github.io/tofu-controller/
- Tofu Controller drift-detection-only mode: https://flux-iac.github.io/tofu-controller/use-tf-controller/detect-drifts-only-without-plan-or-apply/
- Tofu Controller manual plan approval mode: https://flux-iac.github.io/tofu-controller/use-tf-controller/plan-and-manually-apply-terraform-resources/
- Tofu Controller auto-approve mode: https://flux-iac.github.io/tofu-controller/use-tf-controller/provision-resources-and-auto-approve/
- Tofu Controller API reference for `TerraformSpec`, `TerraformStatus`, `VarsReference`, and `PlanStatus`: https://flux-iac.github.io/tofu-controller/References/terraform/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Terraform lifecycle `ignore_changes` documentation: https://docs.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform AWS provider `aws_eks_node_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group

## Issues Found
- The post used `approvePlan: "manual"` for manual approval. Tofu Controller manual mode is documented as omitting `approvePlan` or setting it to an empty string, then setting it to the generated plan value for approval. Changed the RDS example and best-practice text to use `approvePlan: ""`.
- The introduction said Tofu Controller either notifies the team or corrects drift automatically based on `approvePlan`. Tofu Controller itself waits for manual plan approval unless auto-approval is configured; notifications come from Flux Alert configuration. Reworded the claim to say it waits for manual plan approval or corrects drift automatically.
- The Flux Alert example used `apiVersion: notification.toolkit.fluxcd.io/v1` for `kind: Alert`, but the current Flux notification API reference lists Alert under `v1beta3` while `v1` is for Receiver. Changed the Alert manifest to `notification.toolkit.fluxcd.io/v1beta3`.
- The Flux Alert example used `eventSeverity: warning`. Flux documents `info` as the unfiltered setting and `error` for error-only alerts. Changed the example to `eventSeverity: info` so the inclusion list can filter drift-related messages.
- The dashboard commands referenced non-existent Tofu Controller status fields: `.status.plan.planId`, `.status.lastApplied`, and `.status.plan.summary`. Updated the examples to use documented fields: `.status.lastDriftDetectedAt`, `.status.plan.pending`, and `.status.plan`.

## Review Notes
The remaining snippets are version-sensitive because Tofu Controller is still using `infra.contrib.fluxcd.io/v1alpha2`. The examples are consistent with the current published Tofu Controller API reference as of 2026-05-13, but future controller releases may rename status fields or graduate the API version.
