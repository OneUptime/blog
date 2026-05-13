# Validation Summary: How to Configure Terraform Variables from ConfigMaps with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Tofu Controller Terraform custom resources
- Terraform / OpenTofu input variables
- Kubernetes ConfigMaps
- Kubernetes Secrets for stored Terraform plans
- kubectl JSONPath output

## Sources Consulted
- Tofu Controller variables documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/set-variables-for-terraform-resources/
- Tofu Controller API reference for `TerraformSpec`, `VarsReference`, `PlanStatus`, and `storeReadablePlan`: https://pkg.go.dev/github.com/flux-iac/tofu-controller/api/v1alpha1
- Tofu Controller source code for `vars` / `varsFrom` precedence and stored readable plans: https://github.com/flux-iac/tofu-controller
- Tofu Controller manual approval documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/plan-and-manually-apply-terraform-resources/
- Flux Kustomization documentation for `dependsOn`: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Terraform type constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform `jsondecode` function documentation: https://developer.hashicorp.com/terraform/language/functions/jsondecode

## Issues Found
- `approvePlan: "manual"` was incorrect. Tofu Controller manual approval mode is configured by omitting `approvePlan` or setting it to an empty string; a non-empty value is treated as a plan identifier to approve. Updated both Terraform examples to use `approvePlan: ""`.
- The post claimed inline `vars` override ConfigMap values. Tofu Controller generates inline `vars` first and then overlays `varsFrom`, so same-named `varsFrom` values override inline variables; later `varsFrom` entries override earlier entries. Updated the comments to describe the actual precedence.
- ConfigMap examples used JSON-looking arrays and objects as if they would become Terraform list/object values. Kubernetes ConfigMap `data` values are strings, and Tofu Controller encodes those values as strings. Renamed structured ConfigMap keys with a `_json` suffix and added guidance to decode them with Terraform `jsondecode`.
- Inline `vars` examples encoded booleans and lists as strings. Updated `enable_cluster_autoscaler` to a boolean and `cluster_log_types` to a YAML list so Tofu Controller passes the intended Terraform value types.
- The verification command checked `.spec.vars`, which only shows inline variables and does not confirm resolved `varsFrom` values. Replaced it with a status / pending-plan check.
- The verification command referenced `.status.plan.planJSON`, which is not part of the Tofu Controller `PlanStatus`. Added `storeReadablePlan: json` to the networking example and changed the verification command to read the stored JSON plan Secret.
- The post implied ConfigMap changes immediately reconcile all dependent Terraform resources. Updated the wording to say dependent resources consume updated values on their next reconciliation.

## Review Notes
- `kubectl` is not installed in this workspace, so CLI syntax was checked against Kubernetes documentation and Tofu Controller source rather than by running the commands locally.
- The `dependsOn` entry for `tofu-controller` is valid only if there is a Flux `Kustomization` named `tofu-controller`; otherwise users should depend on the actual Kustomization that installs the controller.
