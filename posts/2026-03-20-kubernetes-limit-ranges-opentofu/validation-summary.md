# Validation Summary: How to Create Kubernetes Limit Ranges with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- OpenTofu
- HashiCorp Kubernetes provider
- HCL
- Kubernetes LimitRange
- Kubernetes ResourceQuota

## Sources Consulted
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes API source for `LimitRangeItem` / `LimitType`: https://raw.githubusercontent.com/kubernetes/api/master/core/v1/types.go
- Kubernetes task for storage-related `LimitRange` usage: https://kubernetes.io/docs/tasks/administer-cluster/limit-storage-consumption/
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- HashiCorp Kubernetes provider docs source for `kubernetes_limit_range_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/limit_range_v1.md

## Issues Found
- The Step 3 example used `type = "InitContainer"`, which is not a valid `LimitRangeItem.type` for Kubernetes `LimitRange` objects. I changed it to `type = "Container"` and updated the comment to match the supported behavior.
- The overview said containers without resource specs can consume "unlimited cluster resources." Kubernetes documents this more narrowly as unbounded compute resources unless other controls, such as `ResourceQuota`, constrain them. I corrected that statement.
- Step 4 could be read as an additional container-default `LimitRange` to apply alongside Step 1 in the same namespace. Kubernetes documents that when multiple `LimitRange` objects in a namespace define defaults, the applied default is not deterministic. I added a short note in the code comment clarifying that Step 4 is an alternative pattern.
- The summary overstated the effect of `LimitRange` by saying it ensures all containers have requests and limits and prevents resource starvation. I changed it to say `LimitRange` helps prevent monopolization and applies defaults when those defaults are configured.

## Review Notes
- The resource examples are valid partial OpenTofu snippets, but a complete working configuration still needs a configured `kubernetes` provider and appropriate `required_providers` declarations elsewhere in the module.
- The `kubernetes_limit_range_v1` resource shape is determined by the Kubernetes provider version rather than the OpenTofu CLI version.
