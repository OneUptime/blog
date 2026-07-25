# Validation Summary: Why Does Gatekeeper Report Only 20 Violations? How to Raise the Limit Safely

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered
- OPA Gatekeeper audit
- Kubernetes Constraints and custom resources
- kubectl and Kubernetes JSONPath
- Kubernetes Deployments, Helm, and Kustomize
- Prometheus metrics
- etcd
- JSON audit logs and Gatekeeper violation export

## Sources Consulted
- Gatekeeper Audit documentation — https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper Runtime Flags — https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/
- Gatekeeper Operations documentation — https://open-policy-agent.github.io/gatekeeper/website/docs/operations/
- Gatekeeper Metrics & Observability — https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- Gatekeeper violation export documentation — https://open-policy-agent.github.io/gatekeeper/website/docs/export/
- Gatekeeper audit implementation (`pkg/audit/manager.go`) — https://github.com/open-policy-agent/gatekeeper/blob/65b208f47397cc687ae0a0d7d10e452addd2ca55/pkg/audit/manager.go
- Gatekeeper audit Deployment Helm template — https://github.com/open-policy-agent/gatekeeper/blob/65b208f47397cc687ae0a0d7d10e452addd2ca55/charts/gatekeeper/templates/gatekeeper-audit-deployment.yaml
- Kubernetes JSONPath Support — https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes API Overview — https://kubernetes.io/docs/reference/using-api/
- Kubernetes API Concepts — https://kubernetes.io/docs/reference/using-api/api-concepts/
- etcd System Limits — https://etcd.io/docs/v3.5/dev-guide/limit/

## Issues Found
1. The three kubectl JSONPath expressions used `{"\\n"}`. In a single-quoted shell argument, this makes kubectl output the literal characters `\n` instead of a newline. Changed each expression to the documented `{"\n"}` form.
2. The audit Pod verification command selected `.spec.containers[0]`, which relies on the Gatekeeper manager always being the first container. Changed it to select the container named `manager`, so the command still checks the correct arguments when a sidecar is present or container ordering differs.
3. The object-size guidance said large resource labels or policy-result details could enlarge each `.status.violations` entry. Gatekeeper includes labels and result details in logs and exports, but its status entries contain resource identifiers, the message, and enforcement fields. Updated the sentence to refer to large violation messages, resource identifiers, or an already-large Constraint.
4. The etcd request limit was written as approximately 1.5 MB. The etcd documentation specifies a default maximum request size of 1.5 MiB, so the unit was corrected.
5. The API-watch impact was described as more reconciliation churn, which could imply that a higher cap increases update frequency. Reworded the bullet to state the actual cost: each watcher must process a larger Constraint update event.

## Review Notes
- Gatekeeper's current documentation confirms that `--constraint-violations-limit` defaults to 20, that `status.totalViolations` includes findings omitted from the bounded list, and that a limit of 0 suppresses individual status entries without suppressing all audit status writes.
- `gatekeeper_violations` is a last-value metric broken down by `enforcement_action`; trend reporting requires retaining the metric in a time-series monitoring system.
- Violation export remains an alpha feature and may drop messages depending on the configured backend, which the post correctly qualifies.
- Audit and the `generate` operation are designed to run as singletons because of status and generated-resource write contention.
