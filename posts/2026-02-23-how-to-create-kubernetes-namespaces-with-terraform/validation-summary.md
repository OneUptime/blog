# Validation Summary: How to Create Kubernetes Namespaces with Terraform

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- Terraform (HCL configuration language, `optional()` object type, `for_each`, `lifecycle.prevent_destroy`, `merge()` function, `terraform import`)
- HashiCorp Kubernetes provider (`hashicorp/kubernetes` v2.x)
- Kubernetes resources: `Namespace`, `ResourceQuota`, `NetworkPolicy`, `Deployment`
- Istio sidecar injection label (`istio-injection=enabled`)
- GKE provider configuration (referenced via commented example)

## Sources Consulted
- Terraform Kubernetes provider docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- `kubernetes_namespace` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/namespace
- `kubernetes_resource_quota` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/resource_quota
- `kubernetes_network_policy` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/network_policy
- `kubernetes_deployment` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Terraform `optional()` object type attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes (GA in Terraform v1.3)
- Terraform `lifecycle.prevent_destroy`: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform `import` CLI: https://developer.hashicorp.com/terraform/cli/commands/import
- Kubernetes NetworkPolicy semantics: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Istio sidecar injection labels: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/

## Issues Found
1. **`required_version` mismatch with `optional()` usage**
   - The `providers.tf` example specified `required_version = ">= 1.0"`, but the post's later `multi_namespace.tf` example uses `optional(map(string), {})` for object type attribute defaults. The `optional()` modifier with default values became generally available in Terraform v1.3 (it was experimental in 1.3-beta). With `>= 1.0`, the multi-namespace example would fail on older Terraform versions.
   - **Fix:** Updated `required_version` from `>= 1.0` to `>= 1.3` so all examples in the post work with the declared minimum version.

## Review Notes
- The Kubernetes provider version constraint `~> 2.25` is reasonable; the provider continues active 2.x development. All resource schemas used (`kubernetes_namespace`, `kubernetes_resource_quota`, `kubernetes_network_policy`, `kubernetes_deployment`) match the documented schema.
- `metadata[0].name` is the correct interpolation pattern — the kubernetes provider exposes `metadata` as a list-of-one due to its nested-block schema.
- The NetworkPolicy with empty `pod_selector {}` and `policy_types = ["Ingress"]` with no `ingress` rule correctly implements a default-deny-ingress policy per Kubernetes semantics.
- ResourceQuota keys (`requests.cpu`, `requests.memory`, `limits.cpu`, `limits.memory`, `pods`, `services`, `persistentvolumeclaims`) all match the documented quota field names.
- `terraform import kubernetes_namespace.production production` uses the correct ID format (the namespace name) per the provider's import documentation.
- The `nginx:1.25` image tag in the deployment example is valid (1.25 was a real stable nginx release line).
- Minor stylistic note (not corrected): the multi-namespace `variable` block mixes quoted (`"frontend"`) and unquoted (`team`) keys in maps, which is valid HCL but slightly inconsistent. Left as-is to preserve author style.
