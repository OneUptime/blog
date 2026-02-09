# How to implement Pod Security Admission warnings and audit mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Pod Security Admission, Audit, Policy Enforcement

Description: Master Pod Security Admission warnings and audit mode to gradually roll out security policies, collect compliance data, and educate teams before enforcing restrictions across your Kubernetes cluster.

---

Pod Security Admission provides three modes for applying policies: enforce blocks non-compliant pods, warn returns warnings to users, and audit logs violations. Using these modes strategically enables gradual policy rollout, measuring compliance without disruption, and educating teams about security requirements before strict enforcement.

## Understanding the Three Modes

Enforce mode prevents pod creation when policies are violated. Warn mode allows pod creation but returns warning messages to the user. Audit mode silently logs violations to the audit log. These modes can use different security standards simultaneously, enabling progressive policy adoption.

The three modes operate independently. You can enforce baseline while warning about restricted violations, collecting data about what would break if you enforced stricter policies.

## Basic Audit and Warn Configuration

Start with audit and warn to understand your cluster's current state:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: applications
  labels:
    # Don't block anything
    pod-security.kubernetes.io/enforce: privileged
    # But audit restricted violations
    pod-security.kubernetes.io/audit: restricted
    # And warn users about restricted violations
    pod-security.kubernetes.io/warn: restricted
```

This configuration allows all pods while collecting information about security violations.

## Viewing Warning Messages

Users see warnings when creating pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: applications
spec:
  containers:
  - name: app
    image: nginx:1.21
    securityContext:
      runAsUser: 0
```

When you apply this pod, kubectl displays warnings:

```bash
kubectl apply -f pod.yaml
# Warning: would violate PodSecurity "restricted:latest": runAsNonRoot != true
# pod/test-pod created
```

The pod is created, but users receive feedback about security issues.

## Accessing Audit Logs

Audit mode logs violations to the Kubernetes audit log:

```bash
# View audit logs on the API server
kubectl logs -n kube-system kube-apiserver-<node> | grep "PodSecurity"

# Example audit log entry
{
  "kind": "Event",
  "apiVersion": "audit.k8s.io/v1",
  "level": "Metadata",
  "auditID": "...",
  "stage": "ResponseComplete",
  "requestURI": "/api/v1/namespaces/applications/pods",
  "verb": "create",
  "user": {
    "username": "developer@company.com"
  },
  "annotations": {
    "pod-security.kubernetes.io/audit-violations": "would violate PodSecurity \"restricted:latest\": runAsNonRoot != true"
  }
}
```

Parse audit logs to track violations over time.

## Progressive Policy Rollout

Use a staged approach to tighten security:

```yaml
# Stage 1: Audit and warn about baseline
apiVersion: v1
kind: Namespace
metadata:
  name: stage1
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
  annotations:
    rollout-stage: "1-collect-data"
    target-date: "2026-03-01"

---
# Stage 2: Enforce baseline, audit/warn restricted
apiVersion: v1
kind: Namespace
metadata:
  name: stage2
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
  annotations:
    rollout-stage: "2-enforce-baseline"
    target-date: "2026-06-01"

---
# Stage 3: Enforce restricted
apiVersion: v1
kind: Namespace
metadata:
  name: stage3
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
  annotations:
    rollout-stage: "3-enforce-restricted"
    completed-date: "2026-09-01"
```

Progress through stages as compliance improves.

## Collecting Compliance Metrics

Analyze audit logs to measure compliance:

```bash
# Count violations by namespace
kubectl logs -n kube-system kube-apiserver-<node> | \
  grep "pod-security.kubernetes.io/audit-violations" | \
  jq -r '.objectRef.namespace' | \
  sort | uniq -c

# Count violations by type
kubectl logs -n kube-system kube-apiserver-<node> | \
  grep "pod-security.kubernetes.io/audit-violations" | \
  jq -r '.annotations."pod-security.kubernetes.io/audit-violations"' | \
  sort | uniq -c

# Track compliance over time
kubectl logs -n kube-system kube-apiserver-<node> --since=24h | \
  grep "pod-security.kubernetes.io/audit-violations" | \
  wc -l
```

Use this data to prioritize remediation efforts.

## Version-Specific Audit and Warn

Pin audit and warn to specific versions while using latest for enforcement:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: version-aware
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/enforce-version: v1.27
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

This lets you prepare for future policy changes before they affect enforcement.

## Silencing Specific Warnings

Add labels to acknowledge known issues:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: acknowledged-violation
  namespace: applications
  labels:
    pod-security.kubernetes.io/exempt: "true"
  annotations:
    pod-security-violation: "runAsNonRoot=false"
    violation-reason: "Legacy application migration in progress"
    remediation-target: "2026-04-01"
    remediation-owner: "app-team@company.com"
spec:
  containers:
  - name: legacy
    image: legacy-app:1.0
```

Document exceptions while working toward compliance.

## Creating Compliance Dashboards

Build dashboards showing security posture:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: compliance-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "title": "Pod Security Compliance",
      "panels": [
        {
          "title": "Violations by Namespace",
          "query": "sum(pod_security_audit_violations) by (namespace)"
        },
        {
          "title": "Violation Trend",
          "query": "rate(pod_security_audit_violations[24h])"
        },
        {
          "title": "Compliance Rate",
          "query": "(total_pods - violating_pods) / total_pods * 100"
        }
      ]
    }
```

Visualize progress toward security goals.

## Automated Remediation Workflows

Create tickets for violations:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: violation-reporter
  namespace: security-system
spec:
  schedule: "0 9 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: reporter
            image: violation-reporter:1.0
            command: ["sh", "-c"]
            args:
            - |
              # Fetch audit logs
              violations=$(kubectl logs -n kube-system kube-apiserver-<node> --since=24h | \
                grep "pod-security.kubernetes.io/audit-violations")

              # Create tickets for new violations
              echo "$violations" | while read line; do
                # Extract namespace and pod
                # Create ticket in issue tracking system
                create_ticket "$line"
              done
          restartPolicy: OnFailure
```

Automate the process of tracking and resolving violations.

## Team Education Strategy

Use warnings to educate developers:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/warn: restricted
  annotations:
    policy-documentation: "https://wiki.company.com/pod-security"
    slack-channel: "#security-help"
    security-contact: "security-team@company.com"
```

Provide resources for developers to learn about security requirements.

## Exemption Tracking

Track pods that violate policies:

```bash
# Find pods with security violations
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] |
    select(.spec.securityContext.runAsNonRoot != true) |
    "\(.metadata.namespace)/\(.metadata.name)"'

# Generate exemption report
cat <<EOF > exemption-report.yaml
violations:
$(kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] |
    select(.spec.securityContext.runAsNonRoot != true) |
    "  - namespace: \(.metadata.namespace)\n    pod: \(.metadata.name)\n    violation: runAsNonRoot != true"')
EOF
```

Regular reports track outstanding violations.

## Testing Before Enforcement

Validate that enforcement won't break applications:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: pre-production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
  annotations:
    environment: "staging"
    enforcement-test: "true"
```

Test strict enforcement in staging before applying to production.

## Monitoring Warning Frequency

Track how often users see warnings:

```bash
# Count warnings per user
kubectl logs -n kube-system kube-apiserver-<node> | \
  grep "pod-security.kubernetes.io/warn" | \
  jq -r '.user.username' | \
  sort | uniq -c

# Identify most common violations
kubectl logs -n kube-system kube-apiserver-<node> | \
  grep "pod-security.kubernetes.io/warn" | \
  jq -r '.annotations."pod-security.kubernetes.io/audit-violations"' | \
  sort | uniq -c | sort -rn
```

Frequent warnings for the same issues indicate areas needing attention.

## Gradual Namespace Migration

Migrate namespaces systematically:

```yaml
# Week 1: Enable audit/warn
apiVersion: v1
kind: Namespace
metadata:
  name: app-namespace
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
  annotations:
    migration-week: "1"

# Week 4: Enforce baseline
---
apiVersion: v1
kind: Namespace
metadata:
  name: app-namespace
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
  annotations:
    migration-week: "4"

# Week 8: Enforce restricted
---
apiVersion: v1
kind: Namespace
metadata:
  name: app-namespace
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
  annotations:
    migration-week: "8"
    migration-complete: "true"
```

Gradual migration minimizes disruption.

## Conclusion

Pod Security Admission audit and warn modes enable progressive policy adoption without disrupting operations. Start by auditing and warning about violations to understand your security posture, then gradually tighten enforcement as compliance improves. Use audit logs to measure compliance and track progress. Warnings educate developers about security requirements in real-time. Version-specific configuration lets you prepare for future policy changes. Combine audit and warn modes with enforcement at different levels to balance security with operational needs. Create dashboards and reports that visualize compliance trends. The staged approach using audit and warn modes transforms security policy adoption from a disruptive mandate into a collaborative improvement process that brings teams along while systematically enhancing cluster security.
