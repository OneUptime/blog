# Validation Summary: How to Generate YAML Output with yamlencode in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL2)
- `yamlencode` function
- `local_file` resource (hashicorp/local provider)
- `helm_release` resource (hashicorp/helm provider)
- Kubernetes (Deployment, Service, HorizontalPodAutoscaler)
- Helm
- Prometheus Operator (PrometheusRule CRD)
- GitHub Actions

## Sources Consulted
- [Terraform `yamlencode` documentation](https://developer.hashicorp.com/terraform/language/functions/yamlencode)
- [Terraform Configuration Syntax](https://developer.hashicorp.com/terraform/language/syntax/configuration)
- [HCL2 hclsyntax spec — identifiers and reserved words](https://github.com/juliosueiras/terraform-lsp/blob/master/vendor/github.com/hashicorp/hcl/v2/hclsyntax/spec.md)
- [Kubernetes Deployment API reference (apps/v1)](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/)
- [Kubernetes HorizontalPodAutoscaler API reference (autoscaling/v2)](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/)
- [Prometheus Operator PrometheusRule CRD (monitoring.coreos.com/v1)](https://prometheus-operator.dev/docs/operator/api/#monitoring.coreos.com/v1.PrometheusRule)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

## Issues Found
No technical issues found.

Items I investigated carefully before concluding the post is correct:

1. **`yamlencode` semantics** — Verified the function exists, returns YAML 1.2 block-style output with 2-space indentation, and does not support YAML comments. The post's claim that comments must be prepended manually is accurate.

2. **HCL hyphenated keys (`runs-on`, `role-to-assume`, `aws-region`)** — HCL2's identifier grammar explicitly allows the dash character in identifiers ("The dash character `-` is additionally allowed in identifiers, even though that is not part of the unicode `ID_Continue` definition."). In object-literal contexts these unquoted hyphenated keys are valid and `yamlencode` will emit them as YAML keys verbatim.

3. **`for` as an attribute name in the Prometheus example** — `for` is not globally reserved in HCL. Per the spec, the only ambiguity is when `for` appears as the first key in an object literal (e.g., `{for = ...}` could be misread as the start of a for-expression). In both places the post uses `for`, it is preceded by other attributes (`name`/`alert` and `expr`), so the parser is already committed to an object/object-type context and `for = ...` parses unambiguously. The traversal `rule.for` is also valid as `.<identifier>` traversal.

4. **Kubernetes API versions** — `apps/v1` (Deployment), `v1` (Service), and `autoscaling/v2` (HorizontalPodAutoscaler) are all current stable versions. The HPA structure with `scaleTargetRef`, `minReplicas`, `maxReplicas`, and the `metrics` list using `type: Resource` with `target.type: Utilization` and `averageUtilization` matches the autoscaling/v2 schema.

5. **Prometheus Operator** — `monitoring.coreos.com/v1` and `kind: PrometheusRule`, plus the `spec.groups[].rules[]` schema with `alert`, `expr`, `for`, `labels`, `annotations`, all match the current CRD.

6. **GitHub Actions versions** — `actions/checkout@v4` and `aws-actions/configure-aws-credentials@v4` are current.

7. **Multi-document YAML via `join("\n---\n", [...])`** — `yamlencode` produces output ending in a newline, so the join produces well-formed multi-document YAML (`doc1\n\n---\ndoc2\n`), which YAML parsers accept.

8. **`helm_release` `values` attribute** — Correctly typed as a list of YAML strings, matching the hashicorp/helm provider schema.

## Review Notes
- Several variables referenced in code (`var.environment`, `var.ecr_repo`, `var.min_replicas`, `var.max_replicas`, `var.app_env_vars`, `var.domain`, `var.helm_repo`, `var.helm_chart`, `var.deploy_role_arn`, `var.region`, `var.cluster_name`) are used without being declared in the snippets. This is reasonable for a focused tutorial about `yamlencode` patterns, but readers copying the code into a fresh module will need to add `variable` blocks for them.
- The "Adding Comments" example uses `timestamp()` inside a `local`, which causes the value to change on every plan/apply, producing perpetual diffs. This is a well-known Terraform gotcha worth flagging in a follow-up edit (recommend mentioning `null_resource` with `triggers` or simply omitting the timestamp), but it is not technically incorrect — the code does what it says.
- `yamlencode` output uses double quotes only when necessary; readers expecting always-quoted strings or a specific style cannot configure this (see hashicorp/terraform#23322). Not a blog-post defect, just a known limitation worth being aware of.
