# How to Implement Kyverno Policy Reports

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kyverno, Kubernetes, Compliance, Reporting

Description: Learn how to use Kyverno PolicyReports and ClusterPolicyReports to track compliance status across your Kubernetes clusters with metrics, alerting, and dashboards.

---

Kyverno validates, mutates, and generates Kubernetes resources based on policies. But policies are only half the story. You need visibility into what passed, what failed, and what was blocked. That is where Policy Reports come in.

## Understanding Policy Reports

Kyverno generates two types of reports following the Kubernetes Policy Working Group standard:

- **PolicyReport** - Namespaced resource showing results for namespaced resources
- **ClusterPolicyReport** - Cluster-scoped resource showing results for cluster-scoped resources

```mermaid
flowchart LR
    subgraph Admission["Admission Time"]
        A[Resource Request] --> B{Kyverno}
        B -->|Validate| C[Allow/Deny]
        B -->|Mutate| D[Modified Resource]
        B -->|Generate| E[New Resources]
    end

    subgraph Background["Background Scan"]
        F[Existing Resources] --> G{Kyverno Scanner}
        G --> H[PolicyReport]
        G --> I[ClusterPolicyReport]
    end

    subgraph Reporting["Report Pipeline"]
        H --> J[Policy Reporter]
        I --> J
        J --> K[Prometheus Metrics]
        J --> L[Grafana Dashboard]
        J --> M[Slack/Teams Alerts]
    end
```

## Enabling Policy Reports

Policy reports are enabled by default in Kyverno. Verify they are working:

```bash
# Check if PolicyReport CRDs exist

kubectl get crd | grep policyreport

# Expected output:
# clusterpolicyreports.wgpolicyk8s.io
# policyreports.wgpolicyk8s.io
```

## PolicyReport Resource Structure

A PolicyReport contains results for policy evaluations against namespaced resources.

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  namespace: default
  ownerReferences:
    - apiVersion: v1
      kind: Pod
      name: nginx-without-labels
      uid: a1b2c3d4-e5f6-7890-abcd-ef1234567890
# Summary counts for quick overview
summary:
  pass: 45
  fail: 3
  warn: 2
  error: 0
  skip: 1
# Individual policy results
results:
  - policy: require-labels
    rule: check-team-label
    # Result can be: pass, fail, warn, error, skip
    result: fail
    # Severity from policy definition
    severity: medium
    # Category for grouping
    category: Best Practices
    message: "validation error: The label 'team' is required."
    # Resource that was evaluated
    resources:
      - apiVersion: v1
        kind: Pod
        name: nginx-without-labels
        namespace: default
        uid: a1b2c3d4-e5f6-7890-abcd-ef1234567890
    # Timestamp of evaluation
    timestamp:
      nanos: 0
      seconds: 1706620800
```

## ClusterPolicyReport Structure

ClusterPolicyReports track policy evaluations against cluster-scoped resources.

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: ClusterPolicyReport
metadata:
  name: clusterpolicyreport
# Summary across entire cluster
summary:
  pass: 120
  fail: 8
  warn: 5
  error: 0
  skip: 2
results:
  - policy: require-namespace-labels
    rule: check-owner-label
    result: fail
    severity: high
    category: Best Practices
    message: "validation error: The label 'owner' is required."
    resources:
      - apiVersion: v1
        kind: Namespace
        name: production
        uid: f1e2d3c4-b5a6-7890-fedc-ba0987654321
```

## Configuring Report Generation

### Background Scan Interval

Kyverno periodically scans existing resources. Configure the interval:

```yaml
# Kyverno ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: kyverno
  namespace: kyverno
data:
  # Scan existing resources every hour (default: 1h)
  backgroundScanInterval: "1h"
  # Number of workers for background scanning
  backgroundScanWorkers: "2"
```

### Report Generation

Control report generation by rule type:

```yaml
# Helm values for Kyverno installation
features:
  backgroundScan:
    enabled: true
  reporting:
    validate: true
    mutate: true
    mutateExisting: true
    imageVerify: true
    generate: true
```

## Scanning Existing Resources

When you create or update a policy, Kyverno automatically scans existing resources. To rerun scans sooner than the configured interval, restart the reports controller:

```bash
# Trigger background scan by restarting the reports controller
kubectl rollout restart deployment kyverno-reports-controller -n kyverno
```

### Viewing Reports

```bash
# List all PolicyReports
kubectl get policyreport -A

# Get report for specific namespace
kubectl get policyreport -n production -o yaml

# List ClusterPolicyReports
kubectl get clusterpolicyreport

# Get detailed report with results
kubectl get policyreport -n default a1b2c3d4-e5f6-7890-abcd-ef1234567890 -o yaml
```

### Filtering Failed Results

```bash
# Find all failing policies using jsonpath
kubectl get policyreport -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.summary.fail}{"\n"}{end}'

# Get details of failures
kubectl get policyreport -n production -o json | \
  jq '.results[] | select(.result=="fail")'
```

## Installing Policy Reporter

Policy Reporter provides a UI, metrics, and alerting for Kyverno reports.

```bash
# Add the Policy Reporter Helm repository
helm repo add policy-reporter https://kyverno.github.io/policy-reporter
helm repo update

# Install Policy Reporter with UI
helm install policy-reporter policy-reporter/policy-reporter \
  --namespace policy-reporter \
  --create-namespace \
  --set ui.enabled=true \
  --set plugin.kyverno.enabled=true \
  --set metrics.enabled=true
```

### Policy Reporter Architecture

```mermaid
flowchart TB
    subgraph Cluster["Kubernetes Cluster"]
        PR[PolicyReport]
        CPR[ClusterPolicyReport]

        subgraph PolicyReporter["Policy Reporter Stack"]
            Core[Policy Reporter Core]
            UI[Policy Reporter UI]
            KP[Kyverno Plugin]
        end
    end

    subgraph External["External Systems"]
        Prom[Prometheus]
        Graf[Grafana]
        Slack[Slack]
        Teams[Microsoft Teams]
        S3[S3 Bucket]
    end

    PR --> Core
    CPR --> Core
    Core --> KP
    KP --> UI
    Core --> Prom
    Prom --> Graf
    Core --> Slack
    Core --> Teams
    Core --> S3
```

### Accessing the UI

```bash
# Port forward to access the UI locally
kubectl port-forward svc/policy-reporter-ui -n policy-reporter 8080:8080

# Open browser to http://localhost:8080
```

## Prometheus Metrics

Policy Reporter exposes Prometheus metrics for compliance tracking.

### Available Metrics

```promql
# Individual policy results
policy_report_result{
  policy="require-labels",
  rule="check-team-label",
  kind="Pod",
  name="nginx",
  namespace="default",
  status="fail",
  severity="medium",
  category="Best Practices"
}

# Cluster policy results
cluster_policy_report_result{
  policy="require-namespace-labels",
  rule="check-owner-label",
  kind="Namespace",
  status="fail",
  severity="high"
}
```

### ServiceMonitor for Prometheus Operator

```yaml
# Helm values for Policy Reporter
monitoring:
  enabled: true
  serviceMonitor:
    labels:
      release: prometheus
```

Or create a ServiceMonitor manually:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: policy-reporter
  namespace: policy-reporter
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: policy-reporter
  endpoints:
    # Scrape metrics endpoint
    - port: http
      path: /metrics
      interval: 30s
```

### Prometheus Recording Rules

Pre-calculate common queries for dashboard performance:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: policy-report-rules
  namespace: monitoring
spec:
  groups:
    - name: policy-reports
      interval: 1m
      rules:
        # Total failures per namespace
        - record: policy_report:failures:sum_by_namespace
          expr: |
            sum by (namespace) (
              policy_report_result{status="fail"}
            )
        # Total failures per policy
        - record: policy_report:failures:sum_by_policy
          expr: |
            sum by (policy) (
              policy_report_result{status="fail"}
            )
        # Compliance percentage per namespace
        - record: policy_report:compliance_percentage:by_namespace
          expr: |
            100 * (
              sum by (namespace) (policy_report_result{status="pass"})
              /
              (sum by (namespace) (policy_report_result{status="pass"})
               + sum by (namespace) (policy_report_result{status="fail"}))
            )
```

## Alerting Configuration

### PrometheusRule for Alerting

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: policy-report-alerts
  namespace: monitoring
spec:
  groups:
    - name: policy-compliance
      rules:
        # Alert on high severity policy failures
        - alert: HighSeverityPolicyViolation
          expr: |
            policy_report_result{status="fail", severity="high"} > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "High severity policy violation detected"
            description: |
              Policy {{ $labels.policy }} rule {{ $labels.rule }}
              is failing for {{ $labels.kind }}/{{ $labels.name }}
              in namespace {{ $labels.namespace }}

        # Alert when compliance drops below threshold
        - alert: LowComplianceRate
          expr: |
            policy_report:compliance_percentage:by_namespace < 90
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Compliance rate below 90%"
            description: |
              Namespace {{ $labels.namespace }} has compliance rate
              of {{ $value | printf "%.1f" }}%

        # Alert on any current failures
        - alert: PolicyFailurePresent
          expr: |
            policy_report_result{status="fail"} > 0
          labels:
            severity: warning
          annotations:
            summary: "Policy failures detected"
            description: |
              Policy {{ $labels.policy }} rule {{ $labels.rule }}
              is failing for {{ $labels.kind }}/{{ $labels.name }}
              in namespace {{ $labels.namespace }}
```

### Policy Reporter Native Alerting

Configure Policy Reporter to send alerts directly:

```yaml
# Helm values for Policy Reporter
target:
  slack:
    webhook: "https://hooks.slack.com/services/xxx/yyy/zzz"
    # Only send fail and error results at high or critical severity
    minimumSeverity: "high"
    sources: ["kyverno"]
    # Skip passed results
    skipExistingOnStartup: true
    filter:
      status:
        include: ["fail", "error"]
    # Custom channel per namespace
    channels:
      - webhook: "https://hooks.slack.com/services/xxx/yyy/aaa"
        channel: "#security-alerts"
        filter:
          namespaces:
            include: ["production", "staging"]
          severities:
            include: ["high", "critical"]

  teams:
    webhook: "https://outlook.office.com/webhook/xxx"
    minimumSeverity: "high"
    sources: ["kyverno"]

  # Store reports in S3 for audit trail
  s3:
    bucket: "policy-reports-audit"
    region: "us-east-1"
    prefix: "kyverno/"
    # Use IRSA for authentication
    secretAccessKey: ""
    accessKeyId: ""
    sources: ["kyverno"]
```

## Grafana Dashboard

### Dashboard JSON

```json
{
  "title": "Kyverno Policy Compliance",
  "panels": [
    {
      "title": "Compliance Overview",
      "type": "gauge",
      "targets": [
        {
          "expr": "avg(policy_report:compliance_percentage:by_namespace)",
          "legendFormat": "Overall Compliance"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "min": 0,
          "max": 100,
          "unit": "percent",
          "thresholds": {
            "steps": [
              {"value": 0, "color": "red"},
              {"value": 80, "color": "yellow"},
              {"value": 95, "color": "green"}
            ]
          }
        }
      }
    },
    {
      "title": "Failures by Namespace",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum by (namespace) (policy_report_result{status=\"fail\"})",
          "legendFormat": "{{ namespace }}"
        }
      ]
    },
    {
      "title": "Top Failing Policies",
      "type": "table",
      "targets": [
        {
          "expr": "topk(10, sum by (policy) (policy_report_result{status=\"fail\"}))",
          "format": "table"
        }
      ]
    },
    {
      "title": "Failures by Severity",
      "type": "piechart",
      "targets": [
        {
          "expr": "sum by (severity) (policy_report_result{status=\"fail\"})",
          "legendFormat": "{{ severity }}"
        }
      ]
    }
  ]
}
```

## Sample Policies with Reporting

### Policy with Compliance Metadata

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
  annotations:
    # These annotations appear in reports
    policies.kyverno.io/title: Require Resource Limits
    policies.kyverno.io/category: Best Practices
    policies.kyverno.io/severity: medium
    policies.kyverno.io/subject: Pod
    policies.kyverno.io/description: >-
      All containers must have CPU and memory limits defined
      to prevent resource exhaustion.
spec:
  # Generate reports for existing resources
  background: true
  rules:
    - name: validate-limits
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Audit
        message: "CPU and memory limits are required for all containers."
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    memory: "?*"
                    cpu: "?*"
```

### Policy for Security Compliance

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-latest-tag
  annotations:
    policies.kyverno.io/title: Disallow Latest Tag
    policies.kyverno.io/category: Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/subject: Pod
spec:
  background: true
  rules:
    - name: validate-image-tag
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Audit
        message: "Images must use a specific tag, not 'latest'."
        pattern:
          spec:
            containers:
              - image: "!*:latest"
```

## Automated Compliance Reports

### CronJob for Compliance Summary

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: compliance-report
  namespace: policy-reporter
spec:
  # Run daily at midnight
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: compliance-reporter
          containers:
            - name: reporter
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Generate compliance summary
                  echo "=== Daily Compliance Report ==="
                  echo "Date: $(date -u +%Y-%m-%d)"
                  echo ""

                  # Get summary per namespace
                  echo "Namespace Compliance:"
                  for ns in $(kubectl get ns -o name | cut -d/ -f2); do
                    pass=$(kubectl get policyreport -n "$ns" -o go-template='{{range .items}}{{.summary.pass}}{{"\n"}}{{end}}' 2>/dev/null | awk '{s += $1} END {print s + 0}')
                    fail=$(kubectl get policyreport -n "$ns" -o go-template='{{range .items}}{{.summary.fail}}{{"\n"}}{{end}}' 2>/dev/null | awk '{s += $1} END {print s + 0}')
                    total=$((pass + fail))
                    if [ $total -gt 0 ]; then
                      pct=$((pass * 100 / total))
                      echo "  $ns: $pct% ($pass pass, $fail fail)"
                    fi
                  done

                  echo ""
                  echo "=== High Severity Failures ==="
                  kubectl get policyreport -A -o go-template='{{range .items}}{{range .results}}{{if and (eq .result "fail") (eq .severity "high")}}{{(index .resources 0).namespace}}/{{(index .resources 0).name}}: {{.policy}}/{{.rule}}{{"\n"}}{{end}}{{end}}{{end}}'
          restartPolicy: Never
```

### RBAC for Compliance Reporter

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: compliance-reporter
  namespace: policy-reporter
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: compliance-reporter
rules:
  - apiGroups: ["wgpolicyk8s.io"]
    resources: ["policyreports", "clusterpolicyreports"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: compliance-reporter
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: compliance-reporter
subjects:
  - kind: ServiceAccount
    name: compliance-reporter
    namespace: policy-reporter
```

## Report Lifecycle

```mermaid
stateDiagram-v2
    [*] --> ResourceCreated: kubectl apply
    ResourceCreated --> AdmissionReview: API Server

    AdmissionReview --> Allowed: Policy Pass
    AdmissionReview --> Denied: Policy Fail (Enforce)
    AdmissionReview --> Allowed: Policy Fail (Audit)

    Allowed --> ResourceExists
    Denied --> [*]

    ResourceExists --> BackgroundScan: Periodic
    BackgroundScan --> ReportUpdated
    ReportUpdated --> MetricsExposed
    MetricsExposed --> AlertTriggered: Threshold Breach
    MetricsExposed --> DashboardUpdated

    ResourceDeleted --> ReportCleaned
    ReportCleaned --> [*]
```

## Troubleshooting

### Reports Not Generating

```bash
# Check Kyverno reports controller logs
kubectl logs -n kyverno -l app.kubernetes.io/component=reports-controller \
  --tail=100 | grep -i report

# Verify background scanning is enabled
kubectl get cm kyverno -n kyverno -o yaml | grep background

# Check if policy has background enabled
kubectl get clusterpolicy require-labels -o yaml | grep background
```

### Reports Missing Results

```bash
# Ensure policy matches resources
kubectl get pods -A --show-labels

# Test policy against specific resource
kubectl get pod nginx -o yaml | kyverno apply policy.yaml --resource -

# Check for policy exceptions
kubectl get policyexception -A
```

### Metrics Not Appearing

```bash
# Verify Policy Reporter is running
kubectl get pods -n policy-reporter

# Check metrics endpoint
kubectl port-forward svc/policy-reporter -n policy-reporter 8080:8080
curl http://localhost:8080/metrics | grep policy_report

# Verify ServiceMonitor is detected
kubectl get servicemonitor -n policy-reporter
```

## Best Practices

1. **Use Audit mode first** - Set `failureAction: Audit` in validate rules to generate reports without blocking resources. Switch to `Enforce` after reviewing reports.

2. **Add metadata to policies** - Use annotations for title, category, severity, and description. These appear in reports and make filtering easier.

3. **Set appropriate severities** - Reserve `high` and `critical` for security issues. Use `medium` for best practices and `low` for informational policies.

4. **Plan external retention** - Policy reports represent the current state of the cluster. Use external storage for audit trails and historical reporting.

5. **Monitor the monitors** - Alert on Policy Reporter health, not just policy failures. A silent reporter is worse than no reporter.

6. **Integrate with CI/CD** - Use `kyverno apply` in pipelines to catch violations before deployment.

---

Policy Reports transform Kyverno from a gatekeeper into a compliance platform. You get visibility into your cluster's security posture, historical trends, and automated alerting. Start with audit mode, build your dashboards, and gradually move critical policies to enforcement as your confidence grows.
