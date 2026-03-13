# How to Collect Controller Debug Logs for Flux Support Tickets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Debug Logs, Support, Diagnostics, Logging

Description: Learn how to collect comprehensive debug logs and diagnostic information from Flux controllers to include in support tickets and bug reports for faster resolution.

---

When troubleshooting complex Flux issues or filing support tickets and bug reports, providing comprehensive debug logs and diagnostic information significantly speeds up resolution. This guide explains how to collect the right information from Flux controllers, enable debug logging, and package everything needed for an effective support request.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- Permissions to view and modify pods, deployments, and logs in the flux-system namespace
- The Flux CLI installed

## Step 1: Collect Flux Version and Environment Information

Start by gathering basic environment details:

```bash
flux version
```

Collect Kubernetes cluster information:

```bash
kubectl version --short
kubectl cluster-info
kubectl get nodes -o wide
```

Run the Flux health check and save the output:

```bash
flux check > flux-check.txt 2>&1
cat flux-check.txt
```

## Step 2: Enable Debug Logging

By default, Flux controllers log at the `info` level. To get detailed debug information, increase the log level.

### Enable Debug Logging on All Controllers

```bash
for deploy in source-controller kustomize-controller helm-controller notification-controller; do
  kubectl patch deployment $deploy -n flux-system --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/args", "value": ["--log-level=debug", "--log-encoding=json"]}]'
done
```

### Enable Debug Logging on a Specific Controller

```bash
kubectl patch deployment source-controller -n flux-system --type='json' -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--log-level=debug"}]'
```

Wait for the controllers to restart with debug logging enabled:

```bash
kubectl rollout status deployment -n flux-system -l app.kubernetes.io/part-of=flux
```

### Enable Trace Logging for Maximum Detail

For the most verbose output, use trace level:

```bash
kubectl patch deployment source-controller -n flux-system --type='json' -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--log-level=trace"}]'
```

Note that trace logging produces a very high volume of output and should only be enabled temporarily.

## Step 3: Reproduce the Issue

With debug logging enabled, reproduce the issue you are troubleshooting. This might involve:

```bash
# Trigger a specific reconciliation
flux reconcile source git <name> -n <namespace>
flux reconcile kustomization <name> -n <namespace>
flux reconcile helmrelease <name> -n <namespace>

# Or wait for the next automatic reconciliation
kubectl logs -n flux-system deploy/source-controller -f
```

## Step 4: Collect Controller Logs

After reproducing the issue, collect the logs from all relevant controllers:

```bash
# Source Controller logs
kubectl logs -n flux-system deploy/source-controller --tail=1000 > source-controller.log 2>&1

# Kustomize Controller logs
kubectl logs -n flux-system deploy/kustomize-controller --tail=1000 > kustomize-controller.log 2>&1

# Helm Controller logs
kubectl logs -n flux-system deploy/helm-controller --tail=1000 > helm-controller.log 2>&1

# Notification Controller logs
kubectl logs -n flux-system deploy/notification-controller --tail=1000 > notification-controller.log 2>&1
```

If the image automation components are installed:

```bash
kubectl logs -n flux-system deploy/image-reflector-controller --tail=1000 > image-reflector-controller.log 2>&1
kubectl logs -n flux-system deploy/image-automation-controller --tail=1000 > image-automation-controller.log 2>&1
```

Collect logs from previously crashed containers:

```bash
for deploy in source-controller kustomize-controller helm-controller notification-controller; do
  kubectl logs -n flux-system deploy/$deploy --previous > ${deploy}-previous.log 2>&1 || true
done
```

## Step 5: Collect Resource Status Information

Export the status of all Flux resources:

```bash
# All sources
flux get sources all --all-namespaces > flux-sources.txt 2>&1

# All Kustomizations
flux get kustomizations --all-namespaces > flux-kustomizations.txt 2>&1

# All HelmReleases
flux get helmreleases --all-namespaces > flux-helmreleases.txt 2>&1

# Image automation resources
flux get image all --all-namespaces > flux-images.txt 2>&1 || true
```

Export detailed resource descriptions for the specific resource having issues:

```bash
kubectl describe gitrepository <name> -n <namespace> > gitrepository-describe.txt
kubectl describe kustomization <name> -n <namespace> > kustomization-describe.txt
kubectl describe helmrelease <name> -n <namespace> > helmrelease-describe.txt
```

## Step 6: Collect Cluster Events

Gather recent events from the flux-system namespace:

```bash
kubectl get events -n flux-system --sort-by=.metadata.creationTimestamp > flux-events.txt
```

If the issue affects resources in other namespaces, collect those events too:

```bash
kubectl get events -n <target-namespace> --sort-by=.metadata.creationTimestamp > target-events.txt
```

## Step 7: Collect Pod and Deployment Information

Export pod and deployment details:

```bash
kubectl get pods -n flux-system -o wide > flux-pods.txt
kubectl describe pods -n flux-system > flux-pods-describe.txt
kubectl get deployments -n flux-system -o yaml > flux-deployments.yaml

# Resource usage
kubectl top pods -n flux-system > flux-pod-resources.txt 2>&1 || true
```

## Step 8: Collect Custom Resource Definitions

Export the Flux resource YAML (with secrets redacted):

```bash
# Export GitRepository resources (without secret values)
kubectl get gitrepositories --all-namespaces -o yaml | sed 's/password:.*/password: REDACTED/g' > gitrepositories.yaml

# Export Kustomizations
kubectl get kustomizations --all-namespaces -o yaml > kustomizations.yaml

# Export HelmReleases
kubectl get helmreleases --all-namespaces -o yaml > helmreleases.yaml

# Export HelmRepositories (without secret values)
kubectl get helmrepositories --all-namespaces -o yaml | sed 's/password:.*/password: REDACTED/g' > helmrepositories.yaml
```

## Step 9: Package the Diagnostic Bundle

Create a diagnostic bundle with all collected information:

```bash
mkdir flux-diagnostics-$(date +%Y%m%d)
mv *.txt *.log *.yaml flux-diagnostics-$(date +%Y%m%d)/
tar czf flux-diagnostics-$(date +%Y%m%d).tar.gz flux-diagnostics-$(date +%Y%m%d)/
```

Alternatively, use a single script to collect everything:

```bash
#!/bin/bash
DIAG_DIR="flux-diagnostics-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DIAG_DIR"

echo "Collecting Flux diagnostics..."

flux version > "$DIAG_DIR/flux-version.txt" 2>&1
flux check > "$DIAG_DIR/flux-check.txt" 2>&1
kubectl version --short > "$DIAG_DIR/k8s-version.txt" 2>&1
kubectl get nodes -o wide > "$DIAG_DIR/nodes.txt" 2>&1

for deploy in source-controller kustomize-controller helm-controller notification-controller image-reflector-controller image-automation-controller; do
  kubectl logs -n flux-system deploy/$deploy --tail=500 > "$DIAG_DIR/${deploy}.log" 2>&1
  kubectl logs -n flux-system deploy/$deploy --previous > "$DIAG_DIR/${deploy}-previous.log" 2>&1 || true
done

flux get sources all --all-namespaces > "$DIAG_DIR/sources.txt" 2>&1
flux get kustomizations --all-namespaces > "$DIAG_DIR/kustomizations.txt" 2>&1
flux get helmreleases --all-namespaces > "$DIAG_DIR/helmreleases.txt" 2>&1
flux get image all --all-namespaces > "$DIAG_DIR/images.txt" 2>&1 || true

kubectl get pods -n flux-system -o wide > "$DIAG_DIR/pods.txt" 2>&1
kubectl get events -n flux-system --sort-by=.metadata.creationTimestamp > "$DIAG_DIR/events.txt" 2>&1
kubectl top pods -n flux-system > "$DIAG_DIR/pod-resources.txt" 2>&1 || true

tar czf "${DIAG_DIR}.tar.gz" "$DIAG_DIR"
echo "Diagnostics saved to ${DIAG_DIR}.tar.gz"
```

## Step 10: Disable Debug Logging

After collecting the information you need, revert to normal logging to avoid excessive log volume and storage consumption:

```bash
for deploy in source-controller kustomize-controller helm-controller notification-controller; do
  kubectl patch deployment $deploy -n flux-system --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/args", "value": ["--log-level=info", "--log-encoding=json"]}]'
done
```

Wait for controllers to restart:

```bash
kubectl rollout status deployment -n flux-system -l app.kubernetes.io/part-of=flux
```

## Tips for Effective Support Tickets

When filing a support ticket or bug report, include:

- A clear description of the expected behavior versus the actual behavior
- Steps to reproduce the issue
- The diagnostic bundle collected above
- The Flux version and Kubernetes version
- Any recent changes to the cluster or Flux configuration
- Whether the issue is intermittent or consistent
- The timeline of when the issue first appeared

Redact any sensitive information such as passwords, tokens, private keys, or internal hostnames before sharing the diagnostic bundle.

## Summary

Collecting comprehensive debug logs and diagnostic information is essential for resolving complex Flux issues. Enable debug logging temporarily to capture detailed output, reproduce the issue, then collect logs, resource statuses, events, and pod information. Package everything into a diagnostic bundle and remember to disable debug logging afterward. A well-organized diagnostic bundle with clear reproduction steps will significantly speed up issue resolution.
