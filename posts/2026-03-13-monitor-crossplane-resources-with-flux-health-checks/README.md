# How to Monitor Crossplane Resources with Flux Health Checks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Crossplane, Health Checks, Monitoring, GitOps, Kubernetes, Observability

Description: Configure Flux health checks to monitor Crossplane managed resource status and create alerting pipelines for infrastructure provisioning failures.

---

## Introduction

Flux's health checking mechanism is a powerful but often underutilized feature when working with Crossplane. By default, Flux considers a Kustomization reconciled once all manifests are applied to the cluster. But for Crossplane resources, "applied" means "the Kubernetes object exists"-not "the cloud resource has been provisioned successfully." A health check bridges this gap by waiting for the `Ready` condition to become `True`.

Beyond blocking dependent Kustomizations, health checks enable Flux to report infrastructure failures through its standard alerting channels-Slack, PagerDuty, GitHub, and more. When an RDS instance fails to provision or a Crossplane provider becomes unhealthy, Flux can notify your team immediately.

This guide covers configuring health checks for Crossplane resources, setting appropriate timeouts, and wiring up Flux Alerts for operational notifications.

## Prerequisites

- Crossplane installed with at least one provider and managed resources
- Flux CD bootstrapped on the cluster
- A notification target (Slack webhook, PagerDuty routing key, or similar)

## Step 1: Understand Crossplane Resource Health

Crossplane resources expose health through standard Kubernetes conditions.

```bash
# Check the conditions of a Crossplane managed resource
kubectl get instance.rds.aws.upbound.io production-postgres \
  -o jsonpath='{.status.conditions}' | jq .

# Expected output for a healthy resource:
# [
#   {
#     "lastTransitionTime": "2026-03-13T10:00:00Z",
#     "reason": "Available",
#     "status": "True",
#     "type": "Ready"
#   },
#   {
#     "lastTransitionTime": "2026-03-13T10:00:00Z",
#     "reason": "ReconcileSuccess",
#     "status": "True",
#     "type": "Synced"
#   }
# ]
```

## Step 2: Add Health Checks to a Kustomization

```yaml
# clusters/my-cluster/infrastructure/databases.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: databases
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/databases/production
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: crossplane-providers-aws
  # Health checks for each Crossplane managed resource
  healthChecks:
    # Check the RDS subnet group
    - apiVersion: rds.aws.upbound.io/v1beta1
      kind: SubnetGroup
      name: production-db-subnet-group
      namespace: ""  # Cluster-scoped resources have no namespace
    # Check the RDS instance - this typically takes 5-15 minutes
    - apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      name: production-postgres
      namespace: ""
    # Check the S3 bucket
    - apiVersion: s3.aws.upbound.io/v1beta1
      kind: Bucket
      name: my-app-assets-prod
      namespace: ""
  # Timeout accounts for slow cloud resource provisioning
  timeout: 30m
```

## Step 3: Create a Flux Alert Provider

```yaml
# clusters/my-cluster/notifications/slack-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-infrastructure
  namespace: flux-system
spec:
  type: slack
  channel: "#infrastructure-alerts"
  # Reference a secret containing the Slack webhook URL
  secretRef:
    name: slack-webhook-url

---
apiVersion: v1
kind: Secret
metadata:
  name: slack-webhook-url
  namespace: flux-system
type: Opaque
stringData:
  # In production, encrypt this with SOPS before committing
  address: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

## Step 4: Create Flux Alerts for Infrastructure Events

```yaml
# clusters/my-cluster/notifications/infrastructure-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: crossplane-health-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-infrastructure
  # Alert on error and warning events
  eventSeverity: error
  # Watch these event sources
  eventSources:
    - kind: Kustomization
      name: databases
      namespace: flux-system
    - kind: Kustomization
      name: crossplane-providers-aws
      namespace: flux-system
    - kind: HelmRelease
      name: crossplane
      namespace: crossplane-system
  # Optional: exclude noisy events
  exclusionList:
    - ".*flux reconciliation.*"
```

## Step 5: Monitor Provider Health with Alerts

```yaml
# clusters/my-cluster/notifications/provider-health-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: crossplane-provider-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-infrastructure
  eventSeverity: warning
  eventSources:
    # Watch all Kustomizations for provider-related failures
    - kind: Kustomization
      name: "*"
      namespace: flux-system
```

## Step 6: Add Custom Health Checks with Kustomize Post-Build

For Crossplane Composite Resources (XRs), you can check readiness at the claim level.

```yaml
# clusters/my-cluster/infrastructure/platform-databases.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: platform-databases
  namespace: flux-system
spec:
  interval: 10m
  path: ./platform/databases
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    # Check a Crossplane Composite Resource (cluster-scoped)
    - apiVersion: platform.example.com/v1alpha1
      kind: XPostgreSQLInstance
      name: platform-postgres
    # Check the claim (namespace-scoped)
    - apiVersion: platform.example.com/v1alpha1
      kind: PostgreSQLInstance
      name: my-app-db
      namespace: my-app
  timeout: 20m
```

## Step 7: Verify Alerts and Health Checks

```bash
# Check the status of a Kustomization including health check results
flux get kustomization databases --verbose

# Get Flux events for a specific Kustomization
kubectl get events \
  -n flux-system \
  --field-selector reason=ReconciliationFailed

# Check Alert provider connectivity
flux get alert-providers

# Test the alert manually by temporarily breaking a resource
kubectl annotate instance.rds.aws.upbound.io production-postgres \
  crossplane.io/paused=true
```

## Best Practices

- Always add `healthChecks` for Crossplane managed resources to prevent dependent Kustomizations from deploying against unready infrastructure.
- Set `timeout` based on the slowest resource in the path. RDS takes up to 15 minutes, GKE cluster creation can take 30+ minutes.
- Alert on both `error` and `warning` severity events. Crossplane frequently emits warnings during transient API rate limiting that escalate to errors if not addressed.
- Use the Flux notification controller to send alerts to your incident management tool (PagerDuty, Opsgenie) for production infrastructure failures.
- Monitor the `Synced` condition in addition to `Ready`. A resource can be `Ready` but not `Synced` if Crossplane cannot reconcile it due to permission errors.

## Conclusion

Flux health checks now actively monitor Crossplane managed resources, blocking dependent workloads until cloud infrastructure is truly ready and alerting your team when provisioning fails. This turns Flux's reconciliation loop into an active infrastructure monitoring system, giving you operational visibility without separate tooling.
