# How to Verify Flux CD Installation with flux check Command

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Troubleshooting, Health Checks, DevOps

Description: Learn how to use the flux check command to verify your Flux CD installation, diagnose issues, and ensure all components are healthy.

---

After installing Flux CD on a Kubernetes cluster, verifying that everything is working correctly is a critical step. The `flux check` command is a built-in diagnostic tool that validates the Flux CLI version, Kubernetes cluster compatibility, and the health of all installed Flux components. This guide covers everything you need to know about using `flux check` effectively.

## What Does flux check Do?

The `flux check` command performs a series of health checks against your Kubernetes cluster. It validates:

1. The Flux CLI version and whether updates are available
2. Kubernetes cluster version compatibility
3. The presence and health of Flux custom resource definitions (CRDs)
4. The status of all Flux controller deployments
5. Controller readiness and availability

## Pre-Installation Checks with flux check --pre

Before installing Flux CD, use the `--pre` flag to verify your cluster meets all requirements.

```bash
# Run pre-flight checks before installing Flux
flux check --pre
```

Typical successful output:

```
► checking prerequisites
✔ Kubernetes 1.28.2 >=1.25.0-0
✔ prerequisites checks passed
```

The pre-flight check validates:

- **Kubernetes version**: Flux requires Kubernetes 1.25 or later
- **API resources**: Checks that the cluster API server is reachable
- **RBAC**: Verifies the current user has sufficient permissions

If the pre-flight check fails, you will see error messages indicating what needs to be fixed.

```bash
# Example of a failed pre-flight check on an old cluster
# ✗ Kubernetes 1.23.0 <1.25.0-0
# ✗ prerequisites checks failed
```

## Post-Installation Checks with flux check

After bootstrapping or installing Flux CD, run the full check without any flags.

```bash
# Run the full Flux health check
flux check
```

Successful output looks like this:

```
► checking prerequisites
✔ Kubernetes 1.28.2 >=1.25.0-0
► checking controllers
✔ helm-controller: deployment ready
ℹ ghcr.io/fluxcd/helm-controller:v1.1.0
✔ kustomize-controller: deployment ready
ℹ ghcr.io/fluxcd/kustomize-controller:v1.4.0
✔ notification-controller: deployment ready
ℹ ghcr.io/fluxcd/notification-controller:v1.4.0
✔ source-controller: deployment ready
ℹ ghcr.io/fluxcd/source-controller:v1.4.1
✔ all checks passed
```

## Understanding the Output

Each line in the `flux check` output tells you something specific.

### Prerequisites Section

The prerequisites section confirms cluster compatibility.

```
► checking prerequisites
✔ Kubernetes 1.28.2 >=1.25.0-0
```

A checkmark means the check passed. A cross means it failed.

### Controllers Section

The controllers section validates each Flux component.

```
► checking controllers
✔ helm-controller: deployment ready
ℹ ghcr.io/fluxcd/helm-controller:v1.1.0
```

For each controller, the check verifies:

- The Deployment exists in the `flux-system` namespace
- The Deployment has the desired number of ready replicas
- The container image version is reported for informational purposes

## Common Failure Scenarios and Diagnostics

### Controller Not Ready

If a controller deployment is not ready, `flux check` reports the issue.

```
✗ source-controller: deployment not ready
```

Diagnose this by checking the deployment status and pod logs.

```bash
# Check the deployment status
kubectl describe deployment source-controller -n flux-system

# Check pod status
kubectl get pods -n flux-system -l app=source-controller

# View pod logs for errors
kubectl logs -n flux-system deploy/source-controller
```

Common causes include:

- **Image pull errors**: The cluster cannot pull controller images. Verify network connectivity and image pull secrets.
- **Insufficient resources**: The node does not have enough CPU or memory. Check for resource pressure on the node.
- **CrashLoopBackOff**: A controller is crashing on startup. Check logs for configuration errors.

### CRDs Missing

If Flux CRDs are not installed, you will see errors about missing resources.

```bash
# Verify Flux CRDs are installed
kubectl get crds | grep fluxcd
```

Expected CRDs include:

```
gitrepositories.source.toolkit.fluxcd.io
helmreleases.helm.toolkit.fluxcd.io
helmrepositories.source.toolkit.fluxcd.io
kustomizations.kustomize.toolkit.fluxcd.io
```

If CRDs are missing, re-run the bootstrap or install command.

```bash
# Reinstall Flux components including CRDs
flux install
```

### Version Mismatch

The `flux check` command reports the version of each controller. If you see unexpected versions, it may indicate a partial upgrade.

```bash
# Check if the CLI version matches the installed controllers
flux --version
flux check
```

If versions are mismatched, re-run bootstrap to align them.

```bash
# Re-bootstrap to align versions
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/my-cluster \
  --personal
```

## Checking Specific Components

You can also verify individual Flux resources beyond what `flux check` covers.

### Git Sources

```bash
# List all Git repository sources and their status
flux get sources git
```

This shows whether each GitRepository is syncing successfully, when it was last reconciled, and any error messages.

### Kustomizations

```bash
# List all Kustomizations and their reconciliation status
flux get kustomizations
```

### Helm Releases

```bash
# List all Helm releases managed by Flux
flux get helmreleases --all-namespaces
```

### All Resources

```bash
# Get a complete overview of all Flux resources
flux get all --all-namespaces
```

## Automating Health Checks

You can integrate `flux check` into CI/CD pipelines and monitoring systems.

### CI/CD Pipeline Check

Add `flux check` as a post-deployment step in your pipeline.

```bash
# Run flux check and fail the pipeline if checks do not pass
flux check || exit 1
```

### Monitoring Script

Create a simple monitoring script that runs periodically.

```bash
#!/bin/bash
# flux-health-check.sh
# Run periodic Flux health checks and alert on failures

if ! flux check > /tmp/flux-check-output.txt 2>&1; then
    echo "Flux CD health check FAILED at $(date)"
    cat /tmp/flux-check-output.txt
    # Add your alerting mechanism here (email, Slack webhook, etc.)
    exit 1
fi

echo "Flux CD health check PASSED at $(date)"
```

### Using Flux Events for Monitoring

Flux controllers emit Kubernetes events that can be watched for issues.

```bash
# Watch Flux-related events in the flux-system namespace
kubectl events -n flux-system --watch

# Get events for a specific resource
kubectl events -n flux-system --for=gitrepository/flux-system
```

## Advanced Diagnostics

When `flux check` passes but resources are not reconciling as expected, use these additional diagnostic commands.

### Check Controller Logs

```bash
# View source-controller logs for Git sync issues
kubectl logs -n flux-system deploy/source-controller --since=1h

# View kustomize-controller logs for apply errors
kubectl logs -n flux-system deploy/kustomize-controller --since=1h

# View helm-controller logs for Helm release issues
kubectl logs -n flux-system deploy/helm-controller --since=1h
```

### Trace a Specific Resource

The `flux trace` command shows the chain of Flux resources that manage a specific Kubernetes object.

```bash
# Trace which Flux resources manage a specific deployment
flux trace deployment my-app -n default
```

### Suspend and Resume Reconciliation

For debugging, you can suspend reconciliation to prevent Flux from making changes while you investigate.

```bash
# Suspend a specific kustomization
flux suspend kustomization my-app

# Resume after investigation
flux resume kustomization my-app
```

### Force Reconciliation

To trigger an immediate reconciliation instead of waiting for the interval, use the reconcile command.

```bash
# Force reconciliation of a Git source and its downstream kustomizations
flux reconcile source git flux-system --with-source

# Force reconciliation of a specific kustomization
flux reconcile kustomization my-app
```

## Summary of Key Commands

| Command | Purpose |
|---------|---------|
| `flux check --pre` | Pre-installation cluster validation |
| `flux check` | Full post-installation health check |
| `flux get all -A` | Overview of all Flux resources |
| `flux get sources git` | Check Git source sync status |
| `flux get kustomizations` | Check Kustomization reconciliation |
| `flux get helmreleases -A` | Check Helm release status |
| `flux trace` | Trace resource management chain |
| `flux reconcile` | Force immediate reconciliation |
| `flux logs` | View aggregated Flux controller logs |

## Conclusion

The `flux check` command is your first line of defense for verifying and troubleshooting a Flux CD installation. Run `flux check --pre` before installing to validate cluster compatibility, and `flux check` after installation to confirm all components are healthy. For deeper diagnostics, combine `flux check` with resource-specific commands like `flux get`, `flux trace`, and controller log inspection. Making `flux check` a regular part of your operational routine ensures your GitOps pipeline stays healthy and any issues are caught early.
