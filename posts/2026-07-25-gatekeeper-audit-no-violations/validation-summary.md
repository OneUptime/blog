# Validation Summary: Gatekeeper Audit Shows No Violations: A Diagnostic Guide

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OPA Gatekeeper
- Kubernetes
- kubectl
- Rego
- Prometheus metrics
- Gatekeeper ConstraintTemplates and Constraints
- Gatekeeper Config and SyncSet resources

## Sources Consulted
- [Gatekeeper audit documentation (v3.23.x)](https://open-policy-agent.github.io/gatekeeper/website/docs/audit/)
- [Gatekeeper runtime flags (v3.23.x)](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Gatekeeper metrics and observability (v3.23.x)](https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/)
- [Gatekeeper Constraint matching (v3.23.x)](https://open-policy-agent.github.io/gatekeeper/website/docs/howto/#the-match-field)
- [Gatekeeper replicated data and cache-backed audit (v3.23.x)](https://open-policy-agent.github.io/gatekeeper/website/docs/sync/)
- [Gatekeeper namespace exemptions (v3.23.x)](https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/)
- [Gatekeeper admission review input (v3.23.x)](https://open-policy-agent.github.io/gatekeeper/website/docs/input/)
- [Gatekeeper enforcement points (v3.23.x)](https://open-policy-agent.github.io/gatekeeper/website/docs/enforcement-points/)
- [Gatekeeper workload expansion (v3.23.x)](https://open-policy-agent.github.io/gatekeeper/website/docs/expansion/)
- [Gatekeeper ConstraintPodStatus CRD (v3.23.0)](https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/charts/gatekeeper/crds/constraintpodstatus-customresourcedefinition.yaml)
- [Gatekeeper ConstraintTemplatePodStatus CRD (v3.23.0)](https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/charts/gatekeeper/crds/constrainttemplatepodstatus-customresourcedefinition.yaml)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [kubectl auth can-i reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes API groups](https://kubernetes.io/docs/reference/using-api/)

## Issues Found
- The metrics guidance said the audit end time by itself distinguishes a completed run from a stalled run. Because `gatekeeper_audit_last_run_end_time` records the last completed run and can predate the latest start, the text now says to compare the start and end times.
- The matching checklist implied that a Pod Constraint can never report against an owning Deployment. Gatekeeper can evaluate expanded Pods produced from Deployments when an `ExpansionTemplate` is configured, so the statement now explicitly applies when such an expansion is not configured.
- The cache-backed audit section said synchronized GVKs must match "the Constraint," which could be read as the Constraint custom resource's own GVK. It now correctly says that the entries must match the cluster resource kinds audit is expected to read.

## Review Notes
- The post is accurate for current Gatekeeper v3.23.x. `SyncSet` remains an alpha API (`syncset.gatekeeper.sh/v1alpha1`), and `Config`-based replication and namespace exemption are also documented as alpha features.
- The commands use placeholders and assume the default `gatekeeper-system` installation namespace. Operators using another installation namespace or additional sidecars must substitute the applicable namespace and container.
