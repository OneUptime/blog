# How to Configure Structured Logging for Flux Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Structured Logging, JSON, Observability

Description: Configure Flux CD controllers to emit structured JSON log output for improved log parsing, querying, and correlation in your observability stack.

---

## Introduction

By default, Flux CD controllers emit human-readable log lines that are convenient for terminal inspection but difficult to parse programmatically in a log aggregation system. Flux supports structured JSON logging that makes every log entry a machine-parseable JSON object with consistent fields like `level`, `ts`, `msg`, `controller`, and `reconciler`. This enables powerful queries in Loki, Elasticsearch, or CloudWatch such as "show all failed reconciliations for HelmRelease resources in the last hour."

Enabling structured logging is also a prerequisite for meaningful log-based alerting on Flux reconciliation events. With structured output, your Elastalert or Grafana alerting rules can filter precisely on `"level":"error"` and `"controller":"helmrelease"` without relying on fragile string matching.

This post covers configuring all Flux controllers to emit structured JSON logs, verifying the output, and correlating Flux logs with your application logs in a unified log aggregation platform.

## Prerequisites

- Flux CD v0.38+ bootstrapped to your cluster
- A log aggregation stack (EFK, PLG, or CloudWatch) collecting pod logs
- `kubectl` and `flux` CLIs installed
- Access to the `flux-system` namespace

## Step 1: Understand Flux Controller Log Configuration

Flux controllers (source-controller, kustomize-controller, helm-controller, notification-controller, image-automation-controller) accept `--log-encoding` and `--log-level` flags. These are set through the controller Deployment spec.

The `flux bootstrap` command generates these Deployments in `flux-system`. To modify them in a GitOps-compatible way, patch the Deployments in your bootstrap repository.

## Step 2: Create a Kustomize Patch for All Controllers

Add a strategic merge patch to your `flux-system` Kustomization that sets structured logging on all controllers.

```yaml
# clusters/production/flux-system/log-format-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            - --watch-all-namespaces
            - --log-level=info
            # Enable JSON structured logging
            - --log-encoding=json
            - --enable-leader-election
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            - --watch-all-namespaces
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            - --watch-all-namespaces
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            - --watch-all-namespaces
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election
```

## Step 3: Apply the Patch via Kustomize

Reference the patch in your `flux-system` kustomization file:

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: log-format-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
```

Commit and push. Flux will reconcile its own controllers (the source-controller updates first, then triggers the kustomize-controller to apply the patch to all others).

## Step 4: Verify Structured Log Output

```bash
# Check source-controller logs - should now be JSON
kubectl logs -n flux-system deployment/source-controller --tail=10

# Expected output format:
# {"level":"info","ts":"2026-03-13T12:00:00.000Z","msg":"stored artifact for commit","controller":"gitrepository","controllerGroup":"source.toolkit.fluxcd.io","controllerKind":"GitRepository","name":"flux-system","namespace":"flux-system"}

# Check helm-controller for reconciliation events
kubectl logs -n flux-system deployment/helm-controller --tail=10 | jq .
```

## Step 5: Query Structured Logs in Your Aggregation Platform

With JSON logs flowing to Elasticsearch, use these queries:

```json
// Kibana/OpenSearch query: all Flux errors in the last hour
{
  "query": {
    "bool": {
      "must": [
        { "term": { "kubernetes.namespace_name": "flux-system" } },
        { "term": { "level": "error" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  }
}
```

In Grafana with Loki:
```logql
# All failed reconciliations
{namespace="flux-system"} | json | level="error"

# HelmRelease failures only
{namespace="flux-system", container="manager"}
  | json
  | level="error"
  | controllerKind="HelmRelease"
  | line_format "{{.name}}: {{.msg}}"
```

## Step 6: Set Up Alerting on Flux Reconciliation Failures

Create a Grafana alert rule on Flux error logs:

```yaml
# infrastructure/monitoring/flux-alerts-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-alert-rules
  namespace: monitoring
data:
  flux-rules.yaml: |
    groups:
      - name: flux-reconciliation
        rules:
          - alert: FluxReconciliationFailed
            expr: |
              count_over_time(
                {namespace="flux-system"}
                | json
                | level="error"[5m]
              ) > 3
            for: 2m
            labels:
              severity: warning
            annotations:
              summary: "Flux reconciliation failures detected"
              description: "More than 3 Flux controller errors in 5 minutes"
```

## Best Practices

- Set `--log-level=debug` only in development - debug logs are very verbose and will significantly increase log volume in production.
- Use `--log-encoding=json` in all environments, including staging, so you can test log queries before they matter in production.
- Add `cluster` and `environment` labels to Flux controller pods via the patch so logs from multiple clusters are distinguishable in a shared aggregation system.
- Create Grafana dashboard panels showing Flux reconciliation error rates over time using the structured `level` and `controllerKind` fields.
- Correlate Flux reconciliation IDs with application deployment events for end-to-end deployment tracing.

## Conclusion

Enabling structured JSON logging for Flux controllers via a Kustomize patch is a small change with a significant observability payoff. Once logs are machine-parseable, your log aggregation platform can surface reconciliation failures, slow syncs, and error patterns without any manual log grepping. Combined with Grafana alerting and a GitOps-managed logging stack, you have a fully observable, fully automated platform where even the operator managing your infrastructure is itself under observability.
