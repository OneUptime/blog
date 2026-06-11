# How to Build Kyverno Background Scans

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kyverno, Kubernetes, Compliance, Scanning

Description: Validate existing Kubernetes resources continuously with Kyverno background scans for ongoing compliance enforcement.

---

When you install Kyverno and apply policies, new resources get validated at admission time. But what about the thousands of resources already running in your cluster? Background scans solve this by continuously validating existing resources against your policies.

## Understanding Background Scans

Background scans run periodically to check existing resources against policies. Unlike admission control (which only validates at creation/update time), background scans catch resources that were created before a policy existed or that drifted out of compliance.

```mermaid
flowchart LR
    subgraph AdmissionControl["Admission Control"]
        direction TB
        A1[New Resource] --> A2[Validate]
        A2 --> A3[Allow/Deny]
    end

    subgraph BackgroundScan["Background Scan"]
        direction TB
        B1[Existing Resources] --> B2[Periodic Scan]
        B2 --> B3[Generate Reports]
    end

    A3 --> C[Running Cluster]
    C --> B1
```

### Why Background Scans Matter

- **Policy Retroactivity**: Policies applied after resources were created still get evaluated
- **Configuration Drift Detection**: Catch resources that were manually modified outside GitOps
- **Continuous Compliance**: Generate ongoing compliance reports for auditors
- **Soft Enforcement**: Background scanning records results for existing resources without blocking them

## Basic Background Scan Configuration

Background scanning is controlled at the policy level with the `background` field.

### Enable Background Scanning on a Policy

```yaml
# require-labels-policy.yaml

# This policy validates that all Pods have required labels
# Background scanning checks existing Pods periodically
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-team-label
spec:
  # Enable background scanning for this policy
  background: true
  # Audit mode reports violations without blocking
  rules:
    - name: check-team-label
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Audit
        message: "The label 'team' is required."
        pattern:
          metadata:
            labels:
              team: "?*"
```

### Disable Background Scanning

```yaml
# admission-only-policy.yaml
# This policy only validates at admission time
# Useful for policies that check transient state
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: check-image-digest
spec:
  # Disable background scanning
  background: false
  rules:
    - name: require-digest
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Enforce
        message: "Images must use digests, not tags."
        pattern:
          spec:
            containers:
              - image: "*@sha256:*"
```

## Scan Interval Configuration

The background scan interval is configured globally for the reports controller.

### Adjust Scan Interval

```yaml
# values.yaml
# Controls how often background scans run when installing with Helm
features:
  backgroundScan:
    # Background scans are enabled by default
    enabled: true
    # Scan interval (default is 1h)
    backgroundScanInterval: 1h
    # For more frequent scans during testing
    # backgroundScanInterval: 15m
```

Apply the updated Helm values:

```bash
# Apply the updated values
helm upgrade kyverno kyverno/kyverno -n kyverno -f values.yaml
```

### Scan Interval Guidelines

| Cluster Size | Recommended Interval | Rationale |
|--------------|---------------------|-----------|
| Small (< 1000 resources) | 15m | Fast scans, quick feedback |
| Medium (1000-10000 resources) | 1h | Balance between load and freshness |
| Large (> 10000 resources) | 2h-4h | Reduce API server pressure |

## Resource Selection and Filtering

Control which resources get scanned with match and exclude rules.

### Scan Specific Namespaces Only

```yaml
# namespace-scoped-policy.yaml
# Only scan resources in specific namespaces
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: prod-security-baseline
spec:
  background: true
  rules:
    - name: check-security-context
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
                - staging
      validate:
        failureAction: Audit
        message: "Pods must run as non-root."
        anyPattern:
          - spec:
              securityContext:
                runAsNonRoot: true
              =(initContainers):
                - =(securityContext):
                    =(runAsNonRoot): true
              containers:
                - =(securityContext):
                    =(runAsNonRoot): true
          - spec:
              =(initContainers):
                - securityContext:
                    runAsNonRoot: true
              containers:
                - securityContext:
                    runAsNonRoot: true
```

### Exclude System Namespaces

```yaml
# exclude-system-namespaces.yaml
# Skip kube-system and other system namespaces
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  background: true
  rules:
    - name: check-limits
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
                - cert-manager
                - ingress-nginx
      validate:
        failureAction: Audit
        message: "Resource limits are required."
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    memory: "?*"
                    cpu: "?*"
```

### Filter by Labels

```yaml
# label-filtered-policy.yaml
# Only scan resources with specific labels
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: pci-compliance
spec:
  background: true
  rules:
    - name: pci-encryption-check
      match:
        any:
          - resources:
              kinds:
                - Pod
              selector:
                matchLabels:
                  compliance-scope: pci
      validate:
        failureAction: Audit
        message: "PCI workloads must not use hostPath volumes."
        pattern:
          spec:
            =(volumes):
              - X(hostPath): "null"
```

## Background Scan Workflow

Here is how Kyverno processes background scans end to end:

```mermaid
sequenceDiagram
    participant Timer as Scan Timer
    participant Controller as Reports Controller
    participant API as Kubernetes API
    participant Policy as Policy Engine
    participant Report as Report Generator

    Timer->>Controller: Trigger scan interval
    Controller->>API: List policies with background=true
    API-->>Controller: Return policy list

    loop For each policy
        Controller->>API: List matching resources
        API-->>Controller: Return resource list

        loop For each resource
            Controller->>Policy: Evaluate resource against rules
            Policy-->>Controller: Return pass/fail result
            Controller->>Report: Record result
        end
    end

    Report->>API: Create/Update PolicyReport
    API-->>Report: Confirm saved
```

## Report Generation from Background Scans

Background scans generate PolicyReport and ClusterPolicyReport resources.

### View Policy Reports

```bash
# List all policy reports in a namespace
kubectl get policyreport -n production

# Get detailed report
kubectl get policyreport -n production -o yaml

# List cluster-wide reports
kubectl get clusterpolicyreport
```

### PolicyReport Structure

```yaml
# Example PolicyReport generated by background scan
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: polr-ns-production
  namespace: production
summary:
  pass: 45
  fail: 3
  warn: 0
  error: 0
  skip: 0
results:
  - message: "The label 'team' is required."
    policy: require-team-label
    rule: check-team-label
    result: fail
    severity: medium
    source: kyverno
    timestamp:
      nanos: 0
      seconds: 1706620800
    resources:
      - apiVersion: v1
        kind: Pod
        name: legacy-app-7d8f9b6c4-x2k9p
        namespace: production
        uid: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Query Reports with kubectl

```bash
# Find all failing resources
kubectl get policyreport -A -o json | \
  jq -r '.items[].results[] | select(.result=="fail") | "\(.resources[0].namespace)/\(.resources[0].name): \(.message)"'

# Count failures by policy
kubectl get policyreport -A -o json | \
  jq -r '.items[].results[] | select(.result=="fail") | .policy' | \
  sort | uniq -c | sort -rn

# Get summary across all namespaces
kubectl get policyreport -A -o json | \
  jq '[.items[].summary] | {pass: (map(.pass) | add), fail: (map(.fail) | add)}'
```

### Export Reports for Compliance

```bash
# Export all reports to JSON for auditors
kubectl get policyreport -A -o json > compliance-report-$(date +%Y%m%d).json

# Generate CSV summary
kubectl get policyreport -A -o json | jq -r '
  ["Namespace","Pass","Fail","Total"],
  (.items[] | [.metadata.namespace, .summary.pass, .summary.fail, (.summary.pass + .summary.fail)]) | @csv
' > compliance-summary.csv
```

## Integrating with External Systems

### Send Reports to Prometheus

```yaml
# values.yaml
# Enable the reports controller ServiceMonitor when using Prometheus Operator
reportsController:
  metricsService:
    create: true
  serviceMonitor:
    enabled: true
    interval: 30s
```

Key metrics to monitor:

```bash
# Prometheus queries for background scan results
# Count of policy violations by namespace
sum by (resource_namespace) (
  increase(kyverno_policy_results{rule_result="fail",rule_execution_cause="background_scan"}[1h])
)

# Background scan policy execution latency
histogram_quantile(
  0.95,
  sum(rate(kyverno_policy_execution_duration_seconds_bucket{rule_execution_cause="background_scan"}[5m])) by (le)
)

# Number of background scan evaluations
sum(increase(kyverno_policy_results{rule_execution_cause="background_scan"}[1h]))
```

### Alert Metadata for Downstream Tools

```yaml
# high-severity-policy.yaml
# Mark high-severity violations for downstream alerting tools
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: critical-violation-alert
  annotations:
    # Expose severity metadata in policy reports
    policies.kyverno.io/severity: high
spec:
  background: true
  rules:
    - name: no-privileged-containers
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Audit
        message: "Privileged containers are not allowed."
        pattern:
          spec:
            containers:
              - securityContext:
                  privileged: "!true"
```

## Performance Tuning for Large Clusters

### Optimize Resource Requests

```yaml
# values.yaml
# Increase reports controller resources for large clusters
reportsController:
  resources:
    requests:
      # Increase for clusters with many resources
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "2Gi"

features:
  backgroundScan:
    # Number of reports-controller workers for background scanning
    backgroundScanWorkers: 4
```

### Distribute Load Across Replicas

```yaml
# values.yaml
# Run multiple reports-controller replicas for HA
reportsController:
  # Multiple replicas improve availability; one leader processes reports
  replicas: 3

features:
  backgroundScan:
    enabled: true
```

### Limit Concurrent Scans

```yaml
# values.yaml
# Configure scan behavior for large clusters
features:
  backgroundScan:
    enabled: true
  # Longer interval for large clusters
    backgroundScanInterval: 4h
    # Lower worker count reduces concurrent API activity
    backgroundScanWorkers: 1
```

### Monitor Scan Performance

```bash
#!/bin/bash
# monitor-background-scans.sh
# Track background scan performance over time

echo "=== Kyverno Background Scan Status ==="

# Check if scans are running
kubectl logs -n kyverno deployment/kyverno-reports-controller --tail=100 | \
  grep -i "background scan" | tail -5

echo -e "\n=== Scan Duration Metrics ==="
# Get scan duration from metrics endpoint
kubectl port-forward -n kyverno svc/kyverno-reports-controller-metrics 8000:8000 &
PF_PID=$!
sleep 2

curl -s http://localhost:8000/metrics 2>/dev/null | \
  grep 'kyverno_policy_execution_duration_seconds.*background_scan'

kill $PF_PID 2>/dev/null

echo -e "\n=== Resource Count by Kind ==="
# Count resources that will be scanned
for kind in pods deployments services configmaps secrets; do
  count=$(kubectl get $kind -A --no-headers 2>/dev/null | wc -l)
  echo "$kind: $count"
done
```

## Practical Examples

### Example 1: Drift Detection Policy

```yaml
# detect-manual-changes.yaml
# Detect resources modified outside GitOps
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: detect-gitops-drift
spec:
  background: true
  rules:
    - name: check-managed-by-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - Service
                - ConfigMap
              namespaces:
                - production
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
      validate:
        failureAction: Audit
        message: "Resource missing ArgoCD management label. Was it modified manually?"
        pattern:
          metadata:
            labels:
              argocd.argoproj.io/instance: "?*"
```

### Example 2: Security Baseline Audit

```yaml
# security-baseline-audit.yaml
# Comprehensive security baseline for all workloads
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: security-baseline-audit
spec:
  background: true
  rules:
    # Rule 1: No privileged containers
    - name: no-privileged
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Audit
        message: "Privileged containers are not allowed."
        pattern:
          spec:
            =(ephemeralContainers):
              - =(securityContext):
                  =(privileged): "false"
            =(initContainers):
              - =(securityContext):
                  =(privileged): "false"
            containers:
              - =(securityContext):
                  =(privileged): "false"

    # Rule 2: No host networking
    - name: no-host-network
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Audit
        message: "Host networking is not allowed."
        pattern:
          spec:
            =(hostNetwork): "false"

    # Rule 3: No host PID
    - name: no-host-pid
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Audit
        message: "Host PID namespace is not allowed."
        pattern:
          spec:
            =(hostPID): "false"

    # Rule 4: Read-only root filesystem
    - name: readonly-root
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Audit
        message: "Root filesystem should be read-only."
        pattern:
          spec:
            containers:
              - securityContext:
                  readOnlyRootFilesystem: true
```

### Example 3: Resource Quota Compliance

```yaml
# resource-quota-compliance.yaml
# Ensure all workloads have resource limits defined
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: resource-quota-compliance
spec:
  background: true
  rules:
    - name: require-requests-limits
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
      validate:
        failureAction: Audit
        message: "CPU and memory requests/limits are required."
        pattern:
          spec:
            containers:
              - resources:
                  requests:
                    memory: "?*"
                    cpu: "?*"
                  limits:
                    memory: "?*"
                    cpu: "?*"
```

## Troubleshooting Background Scans

### Scans Not Running

```bash
# Check Kyverno logs for background scan activity
kubectl logs -n kyverno deployment/kyverno-reports-controller | grep -i "background"

# Verify reports controller arguments include background scan settings
kubectl get deployment kyverno-reports-controller -n kyverno -o json | \
  jq '.spec.template.spec.containers[].args[] | select(test("backgroundScan"))'

# Check if policies have background=true
kubectl get clusterpolicy -o json | \
  jq '.items[] | {name: .metadata.name, background: .spec.background}'
```

### Reports Not Generated

```bash
# Check if PolicyReport CRD exists
kubectl get crd | grep policyreport

# Verify report controller is running
kubectl get pods -n kyverno -l app.kubernetes.io/component=reports-controller

# Check for errors in report controller logs
kubectl logs -n kyverno -l app.kubernetes.io/component=reports-controller
```

### High API Server Load

```bash
# Increase scan interval
helm upgrade kyverno kyverno/kyverno -n kyverno \
  --reuse-values \
  --set features.backgroundScan.backgroundScanInterval=4h

# Reduce concurrent workers
helm upgrade kyverno kyverno/kyverno -n kyverno \
  --reuse-values \
  --set features.backgroundScan.backgroundScanWorkers=1
```

## Best Practices Checklist

- [ ] Enable background scanning for audit-mode policies
- [ ] Set appropriate scan intervals based on cluster size
- [ ] Exclude system namespaces from scanning
- [ ] Monitor scan duration and API server load
- [ ] Export reports regularly for compliance records
- [ ] Use label selectors to target specific workloads
- [ ] Tune Kyverno resources for large clusters
- [ ] Set up alerting on policy violations via metrics
- [ ] Review PolicyReports as part of security reviews

---

Background scans transform Kyverno from a gatekeeper into a continuous compliance engine. By validating existing resources periodically, you catch configuration drift, enforce policies retroactively, and generate audit trails for compliance teams. Start with audit mode policies, tune your scan intervals, and build confidence before moving to enforcement.
