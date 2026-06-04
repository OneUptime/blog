# Validation Summary: How to Use OPA Gatekeeper Sync to Replicate Resources for Policy Evaluation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- OPA Gatekeeper
- Gatekeeper Config and ConstraintTemplate resources
- Rego
- kubectl
- Prometheus metrics

## Sources Consulted
- Gatekeeper Replicating Data documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/next/sync/
- Gatekeeper Config API source: https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/apis/config/v1alpha1/config_types.go
- Gatekeeper Exempting Namespaces documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/v3.16.x/exempt-namespaces
- Gatekeeper Metrics & Observability documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes kubectl create service clusterip reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_service_clusterip/
- Open Policy Agent built-ins documentation: https://www.openpolicyagent.org/docs/policy-reference/builtins/

## Issues Found
- The basic sync intro said only ConfigMaps and Namespaces were enabled, but the snippet also synced Services and Deployments. Updated the wording to match the YAML.
- Several Rego examples used incorrect `data.inventory` paths. Gatekeeper stores namespace-scoped objects as `data.inventory.namespace[namespace][groupVersion][kind][name]` and cluster-scoped objects as `data.inventory.cluster[groupVersion][kind][name]`. Updated Service, Deployment, Pod, ResourceQuota, and Ingress lookups accordingly.
- The ResourceQuota example referenced `quota.spec.hard.cpu`, but Kubernetes CPU request quotas are commonly stored under `requests.cpu`. Updated the lookup to `quota.spec.hard["requests.cpu"]` and clarified that Pods and ResourceQuotas must be synced.
- The namespace filtering example used unsupported `namespaces` fields under `syncOnly`. Gatekeeper `syncOnly` entries only accept group, version, and kind. Replaced the example with Gatekeeper `spec.match.excludedNamespaces` using the `sync` process.
- The large dataset section claimed label selectors could limit synced resources in Config. Gatekeeper Config supports namespace exclusions for sync, not label selectors in `syncOnly`. Updated the snippet and explanation.
- The metrics example port-forwarded the webhook service over HTTPS. Gatekeeper exposes Prometheus metrics on port 8888 at `/metrics`. Updated the command to port-forward the controller manager deployment and use HTTP.
- Constraint status commands used namespace-wide forms that are not appropriate for Gatekeeper's cluster-scoped constraint resources. Updated them to use `kubectl get constraints`.
- The conclusion referred to label selectors for limiting sync. Updated it to namespace exclusions.

## Review Notes
The ResourceQuota Rego example is intentionally simplified and does not replace Kubernetes' built-in ResourceQuota admission behavior. For production use, policies like this should account for update operations, eventual cache consistency, missing request fields, and the full Kubernetes quantity syntax.
