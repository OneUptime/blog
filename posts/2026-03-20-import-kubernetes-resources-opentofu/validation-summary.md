# Validation Summary: How to Import Kubernetes Resources into OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Kubernetes provider
- HCL configuration syntax
- Kubernetes namespaces, ConfigMaps, Deployments, Services, and ClusterRoleBindings

## Sources Consulted
- OpenTofu import documentation: https://opentofu.org/docs/language/import/
- OpenTofu lifecycle meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu type constraints documentation (used to verify map/object syntax rules): https://opentofu.org/docs/language/expressions/type-constraints/
- HashiCorp Kubernetes provider overview and authentication docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/index.md
- HashiCorp Kubernetes provider resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/namespace.md
- HashiCorp Kubernetes provider resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/config_map.md
- HashiCorp Kubernetes provider resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/deployment.md
- HashiCorp Kubernetes provider resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/service.md
- HashiCorp Kubernetes provider resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/cluster_role_binding.md

## Issues Found
- The deployment example used semicolons inside HCL object values for `requests` and `limits`. I replaced them with valid multi-line map syntax because OpenTofu/HCL object entries must be separated by commas or line breaks.
- The namespace import comment described the import ID ambiguously as `NAMESPACE_NAME`. I corrected it to `NAME`, which matches the provider documentation for namespace imports.
- The description claimed the post covered Secrets, but the post does not include a Secret import example. I updated the description to match the resources actually covered in the article.

## Review Notes
- The post's import ID guidance is otherwise correct: namespaced resources use `NAMESPACE/NAME`, while cluster-scoped resources use `NAME`.
- The Kubernetes provider still documents the non-`_v1` resource names used in this post, so the examples are current.
- OpenTofu currently documents `import` blocks as a supported workflow. Readers targeting a specific OpenTofu release should still verify import behavior against that release's documentation.
