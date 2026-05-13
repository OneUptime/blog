# How to Configure Structured Logging for Flux Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Structured Logging, JSON, Observability

Description: Configure Flux CD controllers to emit structured JSON log output for improved log parsing, querying, and correlation in your observability stack.

---

## Introduction

Flux CD controllers emit structured JSON logs by default in current installations. If your installation has been customized to use console logs, Flux supports setting JSON logging explicitly so every log entry is a machine-parseable JSON object with consistent fields like `level`, `ts`, `msg`, `controllerGroup`, `controllerKind`, and `reconcileID`. This enables powerful queries in Loki, Elasticsearch, or CloudWatch such as "show all failed reconciliations for HelmRelease resources in the last hour."

Enabling structured logging is also a prerequisite for meaningful log-based alerting on Flux reconciliation events. With structured output, your ElastAlert or Grafana alerting rules can filter precisely on `"level":"error"` and `"controllerKind":"HelmRelease"` without relying on fragile string matching.

This post covers configuring all Flux controllers to emit structured JSON logs, verifying the output, and correlating Flux logs with your application logs in a unified log aggregation platform.

## Prerequisites

- Flux CD bootstrapped to your cluster
- A log aggregation stack (EFK, PLG, or CloudWatch) collecting pod logs
- `kubectl` and `flux` CLIs installed
- Access to the `flux-system` namespace

## Step 1: Understand Flux Controller Log Configuration

Flux controllers (source-controller, kustomize-controller, helm-controller, notification-controller, and the optional image-reflector-controller and image-automation-controller) accept `--log-encoding` and `--log-level` flags. These are set through the controller Deployment spec.

The `flux bootstrap` command generates these Deployments in `flux-system`. To modify them in a GitOps-compatible way, patch the Deployments in your bootstrap repository.

## Step 2: Create a Kustomize Patch for All Controllers

Add a JSON patch to your `flux-system` Kustomization that sets structured logging on all Flux controller Deployments without replacing their existing controller-specific arguments.

```yaml
# clusters/production/flux-system/log-format-patch.yaml

- op: add
  path: /spec/template/spec/containers/0/args/-
  value: --log-level=info
- op: add
  path: /spec/template/spec/containers/0/args/-
  value: --log-encoding=json
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
      labelSelector: app.kubernetes.io/part-of=flux
```

Commit and push. Flux will reconcile the bootstrap Kustomization and roll the controller Deployments with the updated arguments.

## Step 4: Verify Structured Log Output

```bash
# Check source-controller logs - should now be JSON
kubectl logs -n flux-system deployment/source-controller --tail=10

# Expected output format:
# {"level":"info","ts":"2026-03-13T12:00:00.000Z","msg":"stored artifact for commit","controllerGroup":"source.toolkit.fluxcd.io","controllerKind":"GitRepository","name":"flux-system","namespace":"flux-system","reconcileID":"..."}

# Check helm-controller for reconciliation events
kubectl logs -n flux-system deployment/helm-controller --tail=10 | jq .
```

## Step 5: Query Structured Logs in Your Aggregation Platform

With JSON logs flowing to Elasticsearch, use these queries:

```json
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
              sum(count_over_time(
                {namespace="flux-system"}
                | json
                | level="error"
                | __error__=""[5m]
              )) > 3
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
