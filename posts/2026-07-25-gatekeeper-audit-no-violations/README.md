# Gatekeeper Audit Shows No Violations: A Diagnostic Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, Audit, Troubleshooting, Policy as Code

Description: Diagnose an empty Gatekeeper audit by checking run health, Constraint ingestion, match scope, exclusions, cache population, and audit-only limitations.

---

An empty `status.violations` can mean the cluster is compliant. It can also mean audit has not run, the Constraint matches nothing, cache-backed audit lacks the kind, or the policy depends on admission-only data.

Use the following order to distinguish those cases.

## Confirm a completed audit

Start with the Constraint:

```bash
kubectl get <constraint-kind> <constraint-name> -o jsonpath='
auditTimestamp={.status.auditTimestamp}
totalViolations={.status.totalViolations}
'
```

An absent or stale `auditTimestamp` is not a clean result. It means you do not yet have a recent audit result for that Constraint.

Gatekeeper also exposes:

- `gatekeeper_audit_last_run_time`
- `gatekeeper_audit_last_run_end_time`
- `gatekeeper_violations`

The end time distinguishes a completed run from one that started and stalled.

## Find the audit operation

The audit operation commonly runs in a singleton Deployment:

```bash
kubectl get deploy,pods -n gatekeeper-system
kubectl get pods -n gatekeeper-system \
  -o jsonpath='{range .items[*]}{.metadata.name}{"  "}{.spec.containers[0].args}{"\\n"}{end}'
```

Locate the process with `--operation=audit`, then inspect its logs:

```bash
kubectl logs -n gatekeeper-system <audit-pod> \
  --since=15m | grep -E \
  '"event_type":"(audit_started|constraint_audited|audit_finished)"'
```

The default interval is 60 seconds. `--audit-interval=0` disables periodic runs. Look for list permission errors, resource discovery failures, policy ingestion errors, timeouts, and out-of-memory restarts.

Audit should run as a singleton because it writes results to Constraint status. Scaling replicas is not a fix for a silent audit.

## Confirm the policy was ingested

Check both the template and the Constraint:

```bash
kubectl get constrainttemplate <template-name> -o yaml
kubectl get <constraint-kind> <constraint-name> -o yaml
kubectl get constrainttemplatepodstatus,constraintpodstatus \
  -n gatekeeper-system
```

Compilation errors appear in the template's per-pod status. A Constraint can also have ingestion errors or a stale observed generation.

If admission denies the expected test but audit is empty, policy compilation is less likely to be the cause. Focus next on scope, audit settings, and fields unavailable during audit.

## Verify every match dimension

Gatekeeper combines top-level matchers. The object must satisfy all configured dimensions:

- `kinds`
- `scope`
- `namespaces`
- `excludedNamespaces`
- `labelSelector`
- `namespaceSelector`
- `name`
- `source`

Inspect the real stored object, not the manifest you expected to be applied:

```bash
kubectl get <kind> <name> -n <namespace> -o yaml
```

Frequent mistakes include:

- Using `apiGroups: ["v1"]` for a core resource instead of `apiGroups: [""]`.
- Matching a Deployment while the policy logic expects a Pod shape.
- Selecting a label only present on the Deployment, not its Pod template.
- Setting `scope: Cluster` for namespaced resources.
- Excluding the namespace in the Constraint.
- Expecting a Pod Constraint to report its owning Deployment.

Create one deliberately violating fixture in a test namespace and confirm it matches every selector.

## Check global audit exclusions

The Gatekeeper `Config` can exclude namespaces by process:

```bash
kubectl get config.config.gatekeeper.sh config \
  -n gatekeeper-system -o yaml
```

An entry with `processes: ["audit"]` or `processes: ["*"]` suppresses audit results for those namespaces. A webhook-only exclusion does not automatically disable audit.

Current Gatekeeper also supports scoped enforcement points. A Constraint using `enforcementAction: scoped` participates in audit only if its `scopedEnforcementActions` includes `audit.gatekeeper.sh` or an applicable wildcard.

## Diagnose cache-backed audit

By default, audit queries Kubernetes resources directly. With `--audit-from-cache=true`, the internal informer cache becomes the source of truth. Only synchronized kinds can be audited.

Check the audit Pod arguments:

```bash
kubectl get pod -n gatekeeper-system <audit-pod> \
  -o jsonpath='{.spec.containers[0].args}'
```

If cache-backed audit is enabled, inspect `SyncSet` and the singleton `Config`:

```bash
kubectl get syncsets.syncset.gatekeeper.sh -o yaml
kubectl get config.config.gatekeeper.sh config \
  -n gatekeeper-system -o yaml
```

The union of all `SyncSet.spec.gvks` and `Config.spec.sync.syncOnly` entries is cached. Ensure group, version, and kind exactly match the Constraint. The `gatekeeper_sync` metric and sync logs help confirm that objects arrived.

## Check audit-only input limitations

Audit cannot populate the original request's `userInfo`, `operation`, `uid`, or `dryRun`. A policy that requires one of these fields is not auditable.

For example, this admission guard needs an explicit audit-safe condition:

```rego
violation[{"msg": msg}] {
  input.review.operation != ""
  input.review.userInfo.username == "alice"
  # Additional condition.
  msg := "request is not allowed"
}
```

Do not interpret an empty audit as proof that a user-dependent admission rule is satisfied.

## Verify RBAC and resource discovery

The audit operation needs read access to the objects it evaluates:

```bash
kubectl auth can-i list <resource> \
  --all-namespaces \
  --as=system:serviceaccount:gatekeeper-system:<audit-serviceaccount>
```

Read the ServiceAccount name from the audit Pod. Custom resources added after a restrictive Gatekeeper installation may require additional permissions.

Once the issue is fixed, wait for a new `audit_finished` event and a newer `auditTimestamp`. A previous empty status does not update until another run completes.

## Official documentation

- [Gatekeeper audit configuration and results](https://open-policy-agent.github.io/gatekeeper/website/docs/audit/)
- [Gatekeeper replicated data and cache-backed audit](https://open-policy-agent.github.io/gatekeeper/website/docs/sync/)
- [Gatekeeper Constraint matching](https://open-policy-agent.github.io/gatekeeper/website/docs/howto/#the-match-field)
- [Gatekeeper admission review input limitations](https://open-policy-agent.github.io/gatekeeper/website/docs/input/)

