# How to View Flux CD Logs with flux logs Command

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Logging, CLI, Debugging

Description: Learn how to use the flux logs command to view, filter, and analyze Flux CD controller logs for debugging reconciliation issues and tracking deployments.

---

The `flux logs` command provides a streamlined way to view logs from all Flux CD controllers without needing to identify individual pod names or use complex kubectl log queries. It aggregates logs across controllers and supports filtering by resource kind, name, namespace, and log level. This makes it an indispensable tool for daily GitOps operations and debugging.

## Basic Usage

The simplest invocation shows logs from all Flux CD controllers:

```bash
flux logs
```

This streams the most recent logs from source-controller, kustomize-controller, helm-controller, and notification-controller, all interleaved and sorted by timestamp.

## Filter Logs by Log Level

Flux controllers emit logs at different levels. Filter to see only errors or specific severities:

```bash
flux logs --level=error
```

Show info-level and above:

```bash
flux logs --level=info
```

When debugging a specific issue, start with error-level logs to quickly identify the problem:

```bash
flux logs --level=error --since=30m
```

## Filter Logs by Resource Kind

Focus on a specific type of Flux resource:

```bash
flux logs --kind=GitRepository
```

View logs related to Kustomization resources:

```bash
flux logs --kind=Kustomization
```

View logs related to HelmRelease resources:

```bash
flux logs --kind=HelmRelease
```

## Filter Logs by Specific Resource

When you know exactly which resource is having issues, filter by both kind and name:

```bash
flux logs --kind=GitRepository --name=flux-system
```

View logs for a specific Kustomization:

```bash
flux logs --kind=Kustomization --name=infrastructure
```

View logs for a specific HelmRelease in a given namespace:

```bash
flux logs --kind=HelmRelease --name=my-app --namespace=my-namespace
```

## Control the Time Range

Limit logs to a specific time window to reduce noise:

```bash
flux logs --since=10m
```

View logs from the last 2 hours:

```bash
flux logs --since=2h
```

Combine time range with filters:

```bash
flux logs --kind=Kustomization --level=error --since=1h
```

## Follow Logs in Real Time

Use the follow flag to stream logs as they are produced, similar to `tail -f`:

```bash
flux logs --follow
```

Follow logs for a specific resource:

```bash
flux logs --follow --kind=HelmRelease --name=my-app
```

Follow error logs only:

```bash
flux logs --follow --level=error
```

This is particularly useful when you are waiting for a reconciliation to complete or debugging an issue in real time.

## Combine Multiple Filters

Build precise queries by combining multiple flags:

```bash
flux logs --kind=Kustomization --level=error --since=1h
```

Follow error logs for a specific HelmRelease:

```bash
flux logs --follow --kind=HelmRelease --name=my-app --namespace=production --level=error
```

All logs for GitRepository resources in the last 30 minutes:

```bash
flux logs --kind=GitRepository --since=30m
```

## Export Logs for Analysis

Redirect logs to a file for deeper analysis or sharing with your team:

```bash
flux logs --level=error --since=24h > flux-errors-$(date +%Y%m%d).log
```

Save logs in a parseable format:

```bash
flux logs --since=1h 2>&1 | tee flux-debug.log
```

## Common Debugging Scenarios

Here are practical examples for common issues:

### A Deployment Is Not Updating

Check if the source is being fetched successfully:

```bash
flux logs --kind=GitRepository --name=my-app-repo --since=30m
```

### HelmRelease Is Stuck in Not Ready

Check helm-controller logs for the specific release:

```bash
flux logs --kind=HelmRelease --name=my-release --level=error --since=1h
```

### Kustomization Health Checks Are Failing

Check kustomize-controller logs for health check details:

```bash
flux logs --kind=Kustomization --name=apps --since=15m
```

### Source Controller Cannot Fetch a Repository

Check for authentication or network errors:

```bash
flux logs --kind=GitRepository --level=error --since=1h
```

## Comparing flux logs with kubectl logs

While `kubectl logs` works for viewing controller logs, `flux logs` provides several advantages:

| Feature | kubectl logs | flux logs |
|---------|-------------|-----------|
| Aggregate across controllers | Requires multiple commands | Built-in |
| Filter by Flux resource | Not supported | --kind, --name |
| Filter by log level | Not supported | --level |
| Time-based filtering | --since flag | --since flag |
| Follow mode | -f flag | --follow flag |

For basic pod-level debugging, kubectl is still useful:

```bash
kubectl logs -n flux-system deploy/source-controller --since=10m
```

View raw kustomize-controller logs:

```bash
kubectl logs -n flux-system deploy/kustomize-controller --since=10m --tail=100
```

## Summary

The `flux logs` command simplifies Flux CD debugging by aggregating logs across all controllers and providing filters for resource kind, name, namespace, log level, and time range. Use `--follow` for real-time debugging, `--level=error` to focus on failures, and combine filters to narrow down issues quickly. For production environments, complement CLI-based log inspection with a centralized logging platform that retains logs long-term and correlates them with metrics and alerts from your Flux CD controllers.
