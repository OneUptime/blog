# How to Debug HelmRelease with flux debug helmrelease in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Debugging, CLI, Flux debug

Description: Learn how to use the flux debug helmrelease CLI command to diagnose HelmRelease issues in Flux CD with detailed output and troubleshooting information.

---

The `flux debug helmrelease` command (also available as `flux debug hr`) is a CLI tool that helps troubleshoot failing HelmRelease reconciliations. It can print the HelmRelease status, export the final merged values, or print reconciliation history depending on the flags you use. This makes it faster to diagnose many common issues.

## Prerequisites

- Flux CLI v2.x or later installed
- `kubectl` configured with access to your cluster
- At least one HelmRelease deployed in the cluster

## Basic Usage

The simplest form of the command targets a specific HelmRelease:

```bash
# Print the status of a HelmRelease in the default Flux namespace

flux debug helmrelease my-app --show-status

# Debug a HelmRelease in a specific namespace
flux debug helmrelease my-app -n production --show-status

# Using the short alias
flux debug hr my-app -n production --show-status
```

## What the Command Shows

The `flux debug hr` command can display:

1. **HelmRelease status** -- The current conditions, including Ready status, last applied revision, and failure messages.
2. **Final values** -- The computed values after merging inline values with referenced ConfigMaps and Secrets.
3. **Reconciliation history** -- Previous release entries recorded in the HelmRelease status.

For related source status, events, and controller logs, use complementary Flux and Kubernetes commands such as `flux get sources helm`, `kubectl events --for HelmRelease/<name>`, and `flux logs`.

## Example Output

When you run `flux debug hr` against a healthy HelmRelease, the output looks like this:

```bash
# Debug a healthy HelmRelease
flux debug hr nginx -n default --show-status
```

The output will show the HelmRelease status, including conditions and failure messages. For a failing HelmRelease, the output highlights the error conditions and provides context about the failure.

## Debugging a Failing HelmRelease

When a HelmRelease is in a failed state, `flux debug hr` shows the failure reason directly:

```bash
# Debug a failing HelmRelease
flux debug hr my-app -n default --show-status
```

The output will include details such as:
- The specific failure reason (InstallFailed, UpgradeFailed, etc.)
- The error message from the Helm operation
- The last successful revision vs. the attempted revision

## Combining with Other Flux Commands

The debug command is often the first step in a debugging workflow. Based on its output, you can follow up with more specific commands:

```bash
# Step 1: Get the overview
flux debug hr my-app -n default --show-status

# Step 2: If the source is the issue, check it
flux get sources helm -n flux-system

# Step 3: If the install/upgrade failed, check controller logs
flux logs --level=error --kind=HelmRelease --name=my-app --namespace=default

# Step 4: If pods are not ready, check them
kubectl get pods -n default -l app.kubernetes.io/instance=my-app
kubectl describe pod -n default -l app.kubernetes.io/instance=my-app
```

## Debugging All HelmReleases

To get an overview of all HelmReleases across namespaces:

```bash
# List all HelmReleases with their status
flux get helmreleases --all-namespaces

# Filter for only failing HelmReleases
flux get helmreleases --all-namespaces --status-selector ready=false
```

Then debug specific failing ones:

```bash
# Debug each failing HelmRelease
flux debug hr failing-app-1 -n namespace-a --show-status
flux debug hr failing-app-2 -n namespace-b --show-status
```

## Using flux debug hr in CI/CD Pipelines

You can incorporate `flux debug hr` into your CI/CD pipelines to verify deployments:

```bash
#!/bin/bash
# Script to verify a HelmRelease deployment

RELEASE_NAME="my-app"
NAMESPACE="default"
TIMEOUT=300  # 5 minutes
INTERVAL=10  # Check every 10 seconds

echo "Waiting for HelmRelease ${RELEASE_NAME} to become ready..."

elapsed=0
while [ $elapsed -lt $TIMEOUT ]; do
    # Check if the HelmRelease is ready
    STATUS=$(kubectl get helmrelease "${RELEASE_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')

    if [ "$STATUS" = "True" ]; then
        echo "HelmRelease ${RELEASE_NAME} is ready."
        flux debug hr ${RELEASE_NAME} -n ${NAMESPACE} --show-status
        exit 0
    fi

    echo "Not ready yet (${elapsed}s elapsed). Checking again in ${INTERVAL}s..."
    sleep $INTERVAL
    elapsed=$((elapsed + INTERVAL))
done

echo "Timeout: HelmRelease ${RELEASE_NAME} did not become ready within ${TIMEOUT}s."
echo "Debug output:"
flux debug hr ${RELEASE_NAME} -n ${NAMESPACE} --show-status
exit 1
```

## Comparing flux debug hr with Manual Commands

The following table shows what `flux debug hr` replaces:

| Information | Manual Command | With flux debug hr |
|---|---|---|
| HelmRelease status | `kubectl get hr my-app -o yaml` | `flux debug hr my-app --show-status` |
| Final merged values | Manual inspection of HelmRelease values and referenced ConfigMaps/Secrets | `flux debug hr my-app --show-values` |
| Reconciliation history | `kubectl get hr my-app -o jsonpath=...` | `flux debug hr my-app --show-history` |

## Additional Flux Debug Commands

The `flux debug` family includes other useful subcommands:

```bash
# Debug a Kustomization
flux debug kustomization my-kustomization -n flux-system --show-status

# Kustomization debug also supports --show-history and --show-vars
```

## Reconciliation After Debugging

Once you have identified and fixed the issue, trigger a reconciliation:

```bash
# Reconcile the HelmRelease
flux reconcile helmrelease my-app -n default

# Verify with debug
flux debug hr my-app -n default --show-status

# If stuck, suspend and resume
flux suspend hr my-app -n default
flux resume hr my-app -n default
```

## Practical Debugging Workflow

Here is a complete debugging workflow using `flux debug hr` as the starting point:

```bash
# 1. Start with the debug command
flux debug hr my-app -n default --show-status

# 2. Based on the output, take the appropriate action:

# If source is not ready:
flux reconcile source helm my-repo -n flux-system

# If install failed with values error:
# Fix values in Git, push, then:
flux reconcile helmrelease my-app -n default

# If upgrade failed with timeout:
kubectl get pods -n default -l app.kubernetes.io/instance=my-app
kubectl describe pod <pod-name> -n default

# If retries exhausted:
flux suspend hr my-app -n default
# Fix the issue in Git, push
flux resume hr my-app -n default

# 3. Verify the fix
flux debug hr my-app -n default --show-status
```

## Best Practices

1. **Start with flux debug hr.** It should be one of your first commands when investigating a HelmRelease issue.
2. **Use the short alias.** `flux debug hr` is faster to type than `flux debug helmrelease`.
3. **Check all namespaces.** When diagnosing cluster-wide issues, use `flux get helmreleases -A` first to find which releases are affected.
4. **Incorporate into runbooks.** Include `flux debug hr` commands in your operational runbooks and incident response procedures.
5. **Use in automation.** Add debug output to your CI/CD pipeline logs for easier post-deployment troubleshooting, but be careful with `--show-values` because referenced Secrets can be printed.

## Conclusion

The `flux debug helmrelease` (or `flux debug hr`) command is a useful tool for diagnosing HelmRelease issues in Flux CD. It can print status, final values, and reconciliation history, saving time and reducing the number of commands you need to run. Make it an early stop in your debugging workflow whenever a HelmRelease is not behaving as expected.
