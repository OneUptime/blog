# How to Configure Gatekeeper Audit Mode for Compliance Reporting Without Blocking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Compliance, Audit

Description: Use Gatekeeper audit mode to assess cluster compliance and identify policy violations without blocking resource creation, enabling gradual policy adoption.

---

Gatekeeper audit mode evaluates existing resources against policies without enforcing them at admission time. This allows you to assess compliance, identify violations, and fix issues before enabling enforcement, making policy adoption less disruptive.

## Enabling Audit for Constraints

Set enforcement action to dryrun:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: audit-required-labels
spec:
  enforcementAction: dryrun
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Namespace"]
  parameters:
    labels:
      - "team"
      - "cost-center"
```

Resources violating this policy will be logged but not blocked.

## Viewing Audit Results

Check constraint status for violations:

```bash
kubectl get constraints

kubectl get k8srequiredlabels audit-required-labels -o yaml
```

Status section shows violations:

```yaml
status:
  auditTimestamp: "2026-02-09T15:30:00Z"
  byPod:
    - enforced: true
      id: gatekeeper-audit-xyz
      observedGeneration: 1
  totalViolations: 12
  violations:
    - enforcementAction: dryrun
      kind: Namespace
      message: "Missing required labels: [team]"
      name: dev-namespace
    - enforcementAction: dryrun
      kind: Namespace
      message: "Missing required labels: [team, cost-center]"
      name: test-namespace
```

## Configuring Audit Frequency

Adjust audit interval (default: 60 seconds):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gatekeeper-overrides
  namespace: gatekeeper-system
data:
  audit-interval: "120"  # Audit every 2 minutes
```

Apply and restart Gatekeeper:

```bash
kubectl apply -f gatekeeper-config.yaml
kubectl rollout restart deployment/gatekeeper-audit -n gatekeeper-system
```

## Multiple Enforcement Actions

Use warn to show warnings without blocking:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sContainerLimits
metadata:
  name: warn-missing-limits
spec:
  enforcementAction: warn
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
```

Users see warnings when creating resources:

```bash
kubectl apply -f deployment.yaml
# Warning: Constraint violation: Container missing resource limits
# deployment.apps/api created
```

## Progressive Policy Rollout

Adopt policies gradually:

1. **Phase 1**: Deploy with dryrun, monitor violations
2. **Phase 2**: Fix existing violations
3. **Phase 3**: Change to warn, observe user impact
4. **Phase 4**: Enable deny enforcement

Example workflow:

```yaml
# Phase 1: Audit only
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-labels-phase1
spec:
  enforcementAction: dryrun
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
  parameters:
    labels: ["app", "team"]
```

After fixing violations:

```yaml
# Phase 3: Warn users
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-labels-phase3
spec:
  enforcementAction: warn
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
  parameters:
    labels: ["app", "team"]
```

Finally:

```yaml
# Phase 4: Enforce
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-labels-enforced
spec:
  enforcementAction: deny  # or omit (deny is default)
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
  parameters:
    labels: ["app", "team"]
```

## Exporting Audit Results

Create reports from audit violations:

```bash
# Get all violations in JSON
kubectl get constraints -A -o json | \
  jq '.items[] | select(.status.totalViolations > 0) | {
    name: .metadata.name,
    violations: .status.violations
  }'

# Export to CSV
kubectl get k8srequiredlabels -o json | \
  jq -r '.items[].status.violations[] | 
    [.kind, .name, .message] | @csv' > violations.csv
```

## Monitoring Audit Status

Check audit health:

```bash
kubectl logs -n gatekeeper-system deployment/gatekeeper-audit

kubectl get -n gatekeeper-system deployment/gatekeeper-audit
```

View audit metrics:

```bash
kubectl port-forward -n gatekeeper-system svc/gatekeeper-webhook-service 8888:443

curl -k https://localhost:8888/metrics | grep gatekeeper_audit
```

Key metrics:
- `gatekeeper_audit_duration_seconds` - Audit cycle duration
- `gatekeeper_audit_last_run_time` - Last successful audit
- `gatekeeper_violations` - Total violations found

## Alerting on Violations

Create Prometheus alerts for violations:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: gatekeeper-alerts
  namespace: monitoring
spec:
  groups:
    - name: gatekeeper
      interval: 30s
      rules:
        - alert: GatekeeperViolationsHigh
          expr: sum(gatekeeper_violations) > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High number of Gatekeeper violations"
            description: "{{ $value }} policy violations detected"
```

Gatekeeper audit mode enables non-disruptive policy assessment and compliance reporting, allowing organizations to understand their security posture and fix violations before enabling enforcement.
