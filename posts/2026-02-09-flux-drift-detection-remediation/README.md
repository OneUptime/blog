# How to Detect and Remediate Configuration Drift Using Flux Drift Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux, GitOps, Drift Detection, Configuration Management, Kubernetes

Description: Learn how to use Flux drift detection capabilities to identify when cluster state diverges from Git, automatically remediate unauthorized changes, and maintain strict GitOps compliance across your Kubernetes infrastructure.

---

Configuration drift happens when someone makes manual changes to your cluster that don't match what's in Git. An operator runs `kubectl edit` to quickly fix an issue, and suddenly your cluster state diverges from your source of truth. Flux's drift detection and automatic remediation ensure your cluster always matches Git, even when manual changes occur.

This guide shows you how to configure Flux to detect drift, alert on unauthorized changes, and automatically restore desired state.

## Understanding Flux Drift Detection

Flux continuously reconciles cluster state with Git. When it detects differences, it either updates the cluster (if Git changed) or alerts and remediates (if someone changed the cluster). The kustomize-controller and helm-controller both support drift detection with different strategies.

Drift detection works by comparing live cluster resources against the desired state from Git. When discrepancies exist, Flux can either alert, automatically fix, or both depending on your configuration.

## Enabling Automatic Drift Remediation

Configure automatic self-healing in Kustomization resources:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-apps
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Enable self-healing
  wait: true
  timeout: 5m
  force: false
  # Remediate drift automatically
  patches:
  - patch: |
      apiVersion: v1
      kind: Service
      metadata:
        name: api-gateway
      spec:
        $patch: replace
```

Set reconciliation frequency to detect drift quickly:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: critical-infrastructure
  namespace: flux-system
spec:
  interval: 1m  # Check every minute for critical services
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Configuring HelmRelease Drift Detection

Enable drift detection for Helm releases:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: ingress-nginx
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
  # Drift detection settings
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
      remediateLastFailure: true
    # Force recreation on drift
    force: false
    cleanupOnFail: true
```

Force helm-controller to detect all changes:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 5m
  chart:
    spec:
      chart: cert-manager
      sourceRef:
        kind: HelmRepository
        name: jetstack
  # Aggressive drift detection
  upgrade:
    remediation:
      retries: -1  # Retry indefinitely
    force: true  # Force resource updates
    preserveValues: false  # Always use Git values
```

## Monitoring Drift Events

Create alerts for drift detection:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: drift-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
  - kind: Kustomization
    name: '*'
  - kind: HelmRelease
    name: '*'
  eventMetadata:
    env: production
  exclusionList:
  - "^Dependencies.*"
---
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: gitops-alerts
  secretRef:
    name: slack-webhook-url
```

Filter for specific drift events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: drift-only-alert
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty
  eventSeverity: error
  eventSources:
  - kind: Kustomization
    namespace: flux-system
    name: production-apps
  inclusionList:
  - ".*drift.*"
  - ".*diverged.*"
  - ".*manual change.*"
```

## Detecting Drift with Health Checks

Use health checks to catch drift faster:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-with-health-checks
  namespace: flux-system
spec:
  interval: 2m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Health assessment
  healthChecks:
  - apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
    namespace: production
  - apiVersion: apps/v1
    kind: StatefulSet
    name: database
    namespace: production
  timeout: 5m
  wait: true
```

Health checks fail when someone manually scales deployments or modifies containers, triggering remediation.

## Creating Drift Detection Dashboards

Query Flux metrics for drift:

```promql
# Kustomization apply failures (potential drift)
gotk_reconcile_condition{kind="Kustomization",status="False",type="Ready"}

# Time since last successful reconciliation
time() - gotk_reconcile_condition_timestamp{kind="Kustomization",status="True",type="Ready"}

# Reconciliation duration (spikes indicate drift remediation)
gotk_reconcile_duration_seconds{kind="Kustomization"}
```

Create Grafana dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-drift-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "panels": [
        {
          "title": "Kustomizations Out of Sync",
          "expr": "count(gotk_reconcile_condition{kind=\"Kustomization\",status=\"False\",type=\"Ready\"})"
        },
        {
          "title": "Drift Remediation Events",
          "expr": "increase(gotk_reconcile_condition{kind=\"Kustomization\",type=\"Ready\"}[5m])"
        },
        {
          "title": "Last Successful Sync",
          "expr": "time() - gotk_reconcile_condition_timestamp{kind=\"Kustomization\",status=\"True\",type=\"Ready\"}"
        }
      ]
    }
```

## Implementing Audit Logging for Manual Changes

Deploy a webhook to log kubectl exec commands:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: audit-policy
  namespace: kube-system
data:
  audit-policy.yaml: |
    apiVersion: audit.k8s.io/v1
    kind: Policy
    rules:
    - level: RequestResponse
      verbs: ["update", "patch", "delete"]
      resources:
      - group: "apps"
        resources: ["deployments", "statefulsets", "daemonsets"]
      - group: ""
        resources: ["services", "configmaps", "secrets"]
    - level: Metadata
      omitStages:
      - RequestReceived
```

Forward audit logs to your monitoring system and correlate with Flux reconciliation events.

## Preventing Drift with Admission Controllers

Deploy a validating webhook to block unauthorized changes:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: prevent-manual-changes
webhooks:
- name: validate.flux.gitops
  rules:
  - operations: ["UPDATE", "PATCH"]
    apiGroups: ["apps"]
    apiVersions: ["v1"]
    resources: ["deployments", "statefulsets"]
  clientConfig:
    service:
      name: flux-validator
      namespace: flux-system
      path: /validate
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail
```

The webhook checks if changes come from Flux ServiceAccount and rejects others.

## Handling Intentional Manual Changes

Sometimes manual changes are necessary. Use suspend to allow them:

```bash
# Suspend reconciliation
flux suspend kustomization production-apps

# Make manual changes
kubectl edit deployment api-gateway -n production

# Resume reconciliation
flux resume kustomization production-apps
```

Or use annotations to mark resources as managed manually:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app
  annotations:
    kustomize.toolkit.fluxcd.io/reconcile: disabled
spec:
  # ... deployment spec
```

## Implementing Drift Reports

Create a CronJob to generate drift reports:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: drift-report
  namespace: flux-system
spec:
  schedule: "0 0 * * *"  # Daily at midnight
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: drift-reporter
          containers:
          - name: reporter
            image: fluxcd/flux-cli:latest
            command:
            - /bin/sh
            - -c
            - |
              flux get kustomizations --status-selector ready=false > /tmp/drift-report.txt
              flux get helmreleases --status-selector ready=false >> /tmp/drift-report.txt
              # Send report to Slack/email
              curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"$(cat /tmp/drift-report.txt)\"}" \
                $SLACK_WEBHOOK_URL
            envFrom:
            - secretRef:
                name: slack-webhook
          restartPolicy: OnFailure
```

## Testing Drift Detection

Intentionally create drift to test:

```bash
# Apply configuration via Git
kubectl apply -f apps/deployment.yaml

# Wait for Flux to sync
flux reconcile kustomization production-apps --with-source

# Manually change replica count
kubectl scale deployment api-gateway --replicas=5 -n production

# Watch Flux detect and remediate
flux get kustomizations --watch

# Verify remediation
kubectl get deployment api-gateway -n production -o jsonpath='{.spec.replicas}'
```

Expected behavior: Flux detects the change within its reconciliation interval and restores replicas to the Git-defined value.

## Best Practices

Set aggressive reconciliation intervals for critical services. Production infrastructure should reconcile every 1-2 minutes, development every 5-10 minutes.

Always enable prune to remove manually created resources. Without pruning, drift detection only catches modifications, not additions.

Use health checks on critical workloads. They catch functional drift faster than resource comparisons.

Implement admission controllers in production. Prevention is better than remediation.

Monitor reconciliation metrics and set up alerts. A Kustomization stuck in failed state indicates persistent drift or configuration errors.

Document the process for emergency manual changes. Teams need to know when and how to suspend Flux without breaking production.

Flux drift detection ensures your cluster state always matches Git, automatically remediating unauthorized changes and maintaining strict GitOps compliance across your infrastructure.
