# Validation Summary: Referential Gatekeeper Policies with `data.inventory` and `syncOnly`

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OPA Gatekeeper
- Kubernetes admission control and audit
- Rego
- Gatekeeper `SyncSet` and `Config` resources
- Gatekeeper data replication and `data.inventory`
- Gatekeeper and Prometheus metrics
- Gator policy testing

## Sources Consulted
- [Gatekeeper v3.23.x: Replicating Data](https://open-policy-agent.github.io/gatekeeper/website/docs/sync/)
- [Gatekeeper v3.23.x: Constraint Templates](https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/)
- [Gatekeeper v3.23.x: Runtime Flags](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Gatekeeper v3.23.x: Metrics and Observability](https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/)
- [Gatekeeper v3.23.x: Audit](https://open-policy-agent.github.io/gatekeeper/website/docs/audit/)
- [Gatekeeper v3.23.x: Handling Constraint Violations](https://open-policy-agent.github.io/gatekeeper/website/docs/violations/)
- [Gatekeeper v3.23.x: The Gator CLI](https://open-policy-agent.github.io/gatekeeper/website/docs/gator/)
- [Gatekeeper v3.23.0 source: singleton Config key](https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/pkg/keys/config.go)
- [Gatekeeper v3.23.0 source: installation Namespace discovery](https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/pkg/util/pod_info.go)
- [OPA: Object built-ins (`object.get`)](https://www.openpolicyagent.org/docs/policy-reference/builtins/object)
- [OPA: Rego `not` keyword](https://www.openpolicyagent.org/docs/policy-reference/keywords/not)
- [Kubernetes: Managing Service Accounts](https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/)
- [Kubernetes: Garbage Collection and owner references](https://kubernetes.io/docs/concepts/architecture/garbage-collection/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

## Issues Found
- The post stated that the singleton Gatekeeper `Config` must be in `gatekeeper-system`. Gatekeeper actually reconciles it in its installation Namespace, which is `gatekeeper-system` only for the default manifests. The wording now reflects custom-namespace installations.
- The example violation message asserted that the ServiceAccount did not exist, even though a cache miss may be caused by replication lag. The message and introductory sentence now describe the actual observation: the ServiceAccount was not found in synchronized inventory.
- The atomic-invariant guidance grouped owner references and reconciling controllers with atomic enforcement mechanisms. Owner references provide lifecycle and garbage-collection semantics, while controllers normally reconcile eventually. The guidance now separates Kubernetes-native validation or uniqueness and transactional enforcement from lifecycle management and eventual reconciliation.

## Review Notes
- `SyncSet` remains an alpha API in Gatekeeper v3.23.x and is documented as available in v3.15+ and recommended over the older singleton `Config`.
- The `ConstraintTemplate`, Constraint, and Rego policy were compiled and evaluated with the official Gator v3.23.0 binary. An inventory containing the referenced ServiceAccount allowed the matching Pod, while a Pod referencing an absent ServiceAccount produced exactly one violation.
- The fully qualified `kubectl get` resource name, log selector and `--since` flag, inventory paths, sync/watch metric names, `dryrun`/`warn` rollout advice, race-condition warning, and `--audit-from-cache=true` behavior match the current official documentation.
- Kubernetes's ServiceAccount admission controller already defaults an omitted Pod ServiceAccount to `default` and verifies that the referenced ServiceAccount exists when that admission plugin is enabled, so the post correctly presents this policy as an inventory example rather than a necessary replacement for native validation.
