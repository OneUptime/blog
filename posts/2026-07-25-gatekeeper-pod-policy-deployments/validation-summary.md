# Validation Summary: Why a Gatekeeper Pod Policy Does Not Block Violating Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Open Policy Agent Gatekeeper
- Gatekeeper Constraints and ConstraintTemplates
- Gatekeeper ExpansionTemplate workload expansion
- Gatekeeper mutation and audit
- Gator CLI
- Kubernetes admission control
- Kubernetes Deployments, ReplicaSets, Pods, StatefulSets, DaemonSets, Jobs, and CronJobs
- Kubernetes ServiceAccounts
- kubectl

## Sources Consulted
- [Gatekeeper: Working with Workload Resources](https://open-policy-agent.github.io/gatekeeper/website/docs/workload-resources/)
- [Gatekeeper: Validating Workload Resources using ExpansionTemplate](https://open-policy-agent.github.io/gatekeeper/website/docs/expansion/)
- [Gatekeeper: The gator CLI](https://open-policy-agent.github.io/gatekeeper/website/docs/gator/)
- [Gatekeeper: How to use Gatekeeper](https://open-policy-agent.github.io/gatekeeper/website/docs/howto/)
- [Gatekeeper: Admission Review Input](https://open-policy-agent.github.io/gatekeeper/website/docs/input/)
- [Gatekeeper: Audit](https://open-policy-agent.github.io/gatekeeper/website/docs/audit/)
- [Gatekeeper v3.23.0 release](https://github.com/open-policy-agent/gatekeeper/releases/tag/v3.23.0)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes API: Deployment v1](https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/)
- [Kubernetes API: Job v1](https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/)
- [Kubernetes API: CronJob v1](https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/)
- [Kubernetes: Managing Service Accounts](https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/)
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found
- The post said `match.source` could be used to warn on generated Pods while denying original Pods without stating that enforcement action belongs to the Constraint. Changed the example to specify separate Constraints. This makes clear that `source` selects original or generated resources, while each Constraint supplies its own enforcement action; an `ExpansionTemplate` enforcement override is the other documented option.
- The ServiceAccount guidance did not account for an omitted `spec.serviceAccountName`. Changed it to state that policy must treat an omitted value as the namespace's `default` ServiceAccount, matching Kubernetes Pod admission behavior.

## Review Notes
- Reviewed against Gatekeeper v3.23.0, released July 9, 2026. Workload expansion remains beta and enabled by default, while `ExpansionTemplate` remains at `expansion.gatekeeper.sh/v1alpha1`.
- All three YAML snippets parse successfully. The complete `ExpansionTemplate` snippet was also exercised with the official Gator v3.23.0 binary and correctly expanded an `apps/v1` Deployment into a `v1` Pod.
- The `gator expand`, `gator test`, and `kubectl get events --sort-by=.metadata.creationTimestamp` command forms and repeatable `--filename` usage are current and valid.
