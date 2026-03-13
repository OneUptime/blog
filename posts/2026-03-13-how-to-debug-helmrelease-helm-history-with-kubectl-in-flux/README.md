# How to Debug HelmRelease Helm History with kubectl in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HelmRelease, Kubernetes, GitOps, Helm, Debugging, kubectl

Description: Learn how to use kubectl and Helm commands to debug HelmRelease history, diagnose failed releases, and troubleshoot deployment issues in Flux.

---

## Introduction

When a Flux HelmRelease fails to reconcile, the error messages in the HelmRelease status often point to Helm-level issues. Understanding how to inspect Helm release history is essential for diagnosing these problems. Flux stores Helm release information as Kubernetes Secrets, and you can use both `kubectl` and the `helm` CLI to examine release history, find failed revisions, and understand what went wrong.

In this post, you will learn how to debug HelmRelease issues by examining Helm history through kubectl, interpreting release statuses, and using Flux-specific debugging commands.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- kubectl configured to access the cluster
- Helm CLI installed (v3.x)
- At least one HelmRelease deployed through Flux

## Checking HelmRelease Status with kubectl

The first step in debugging a HelmRelease is to check its status:

```bash
kubectl get helmrelease -A
```

This shows all HelmReleases across namespaces with their ready state. For more detail on a specific release:

```bash
kubectl get helmrelease my-app -n default -o yaml
```

The key sections to examine are `status.conditions` and `status.history`:

```bash
kubectl get helmrelease my-app -n default -o jsonpath='{range .status.conditions[*]}{.type}{"\t"}{.status}{"\t"}{.message}{"\n"}{end}'
```

This outputs the conditions in a readable format, showing you the ready state and any error messages.

## Examining Flux-Specific Events

Flux emits Kubernetes events during reconciliation. These events provide a timeline of what happened:

```bash
kubectl events --for helmrelease/my-app -n default
```

If your kubectl version does not support the `events` subcommand, use:

```bash
kubectl get events -n default --field-selector involvedObject.name=my-app,involvedObject.kind=HelmRelease --sort-by='.lastTimestamp'
```

Events include information about successful reconciliations, failed attempts, and remediation actions.

## Viewing Helm Release History

Flux-managed Helm releases are stored as Kubernetes Secrets in the release namespace. You can inspect them with the Helm CLI:

```bash
helm history my-app -n default
```

This outputs a table showing all revisions:

```
REVISION  UPDATED                   STATUS      CHART          APP VERSION  DESCRIPTION
1         2026-03-10 10:00:00       superseded  my-app-1.0.0   1.0.0       Install complete
2         2026-03-11 14:30:00       superseded  my-app-1.1.0   1.1.0       Upgrade complete
3         2026-03-12 09:00:00       failed      my-app-1.2.0   1.2.0       Upgrade "my-app" failed
4         2026-03-12 09:05:00       deployed    my-app-1.1.0   1.1.0       Rollback to 2
```

This history tells you that revision 3 failed and Flux rolled back to revision 2.

## Inspecting Helm Release Secrets

Helm stores release data as Secrets with the label `owner=helm`. You can list all release secrets for a given release:

```bash
kubectl get secrets -n default -l owner=helm,name=my-app
```

Each Secret represents a revision. To see the details of a specific revision:

```bash
kubectl get secret sh.helm.release.v1.my-app.v3 -n default -o yaml
```

The release data is base64-encoded and gzip-compressed. To decode it:

```bash
kubectl get secret sh.helm.release.v1.my-app.v3 -n default -o jsonpath='{.data.release}' | base64 -d | base64 -d | gunzip
```

This produces a JSON object containing the full release information, including the chart, values, and manifest.

## Getting the Rendered Manifests from a Failed Release

To see what manifests Helm tried to apply during a failed release, use:

```bash
helm get manifest my-app -n default --revision 3
```

This shows the rendered Kubernetes manifests for revision 3. Compare them with the previous successful revision:

```bash
diff <(helm get manifest my-app -n default --revision 2) <(helm get manifest my-app -n default --revision 3)
```

This diff shows exactly what changed between the working and broken versions.

## Examining Values Used in a Release

To see what values were used for a specific revision:

```bash
helm get values my-app -n default --revision 3
```

For all values including defaults:

```bash
helm get values my-app -n default --revision 3 --all
```

Compare values between revisions to identify configuration changes that may have caused the failure:

```bash
diff <(helm get values my-app -n default --revision 2 --all) <(helm get values my-app -n default --revision 3 --all)
```

## Using Flux CLI for Debugging

If you have the Flux CLI installed, it provides additional debugging commands:

```bash
flux get helmreleases -A
```

For detailed information about a specific HelmRelease:

```bash
flux get helmreleases my-app -n default
```

To force a reconciliation and watch the output:

```bash
flux reconcile helmrelease my-app -n default --with-source
```

The `--with-source` flag also reconciles the HelmRepository source, ensuring you have the latest chart version.

## Diagnosing Common Failure Patterns

### Timeout Failures

If pods fail to become ready within the timeout:

```bash
kubectl get pods -n default -l app.kubernetes.io/name=my-app
kubectl describe pod -n default <pod-name>
kubectl logs -n default <pod-name>
```

### Resource Quota Exceeded

Check if the namespace has resource quotas that block the deployment:

```bash
kubectl get resourcequota -n default
kubectl describe resourcequota -n default
```

### Pending Helm Operations

Sometimes a previous Helm operation gets stuck in a `pending-install` or `pending-upgrade` state:

```bash
helm history my-app -n default
```

If you see a `pending-*` status, the release is stuck. You may need to manually roll back:

```bash
helm rollback my-app <last-good-revision> -n default
```

Or, if the release is completely stuck, you can remove the pending release Secret:

```bash
kubectl delete secret sh.helm.release.v1.my-app.v<stuck-revision> -n default
```

Then suspend and resume the HelmRelease to trigger a fresh reconciliation:

```bash
flux suspend helmrelease my-app -n default
flux resume helmrelease my-app -n default
```

## Checking Helm Storage Limits

Flux sets a maximum history limit for Helm releases. By default, it keeps 5 revisions. You can check and adjust this:

```bash
kubectl get helmrelease my-app -n default -o jsonpath='{.spec.maxHistory}'
```

Too many stored revisions consume Secret storage. Too few may prevent you from debugging historical failures. A value between 3 and 10 is typical:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  maxHistory: 5
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
```

## Conclusion

Debugging Flux HelmRelease issues requires understanding both the Flux reconciliation layer and the underlying Helm release mechanism. Start by checking the HelmRelease conditions and events with kubectl, then drill down into Helm history to examine specific revisions. Use `helm get manifest` and `helm get values` to compare working and broken releases. When dealing with stuck releases, understanding Helm's Secret-based storage lets you manually intervene when necessary. This layered debugging approach helps you quickly identify and resolve deployment failures in your Flux-managed clusters.
