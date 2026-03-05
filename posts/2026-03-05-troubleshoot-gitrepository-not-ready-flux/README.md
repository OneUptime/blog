# How to Troubleshoot GitRepository Not Ready Errors in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, GitRepository, Troubleshooting, Debugging, Source Controller

Description: A comprehensive guide to diagnosing and fixing GitRepository Not Ready errors in Flux CD, covering authentication, network, and configuration issues.

---

When a Flux GitRepository resource shows a "Not Ready" status, it means the source controller cannot successfully fetch and store the repository content. This blocks all downstream Kustomizations and HelmReleases that depend on it. This guide walks through a systematic approach to diagnosing and resolving the most common causes of GitRepository failures.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with Flux CD installed
- The Flux CLI (`flux`) installed locally
- `kubectl` access to your cluster

## Step 1: Check the GitRepository Status

Start by getting an overview of the problem.

```bash
# Check the status of all GitRepository sources
flux get source git -A
```

Identify which sources are not ready.

```
NAME        REVISION    SUSPENDED   READY   MESSAGE
my-app                  False       False   failed to checkout and determine revision: ...
infra-repo  main@...    False       True    stored artifact for revision ...
```

Get detailed conditions for the failing resource.

```bash
# Describe the failing GitRepository for full status details
kubectl describe gitrepository my-app -n flux-system
```

Look at the `Conditions` section and `Events` at the bottom of the output. The `message` field in the Ready condition usually tells you exactly what went wrong.

## Step 2: Check Source Controller Logs

The source controller logs contain detailed error messages that may not appear in the resource status.

```bash
# View source controller logs filtered by the GitRepository name
kubectl logs -n flux-system deployment/source-controller --since=10m | grep my-app
```

For a broader view of errors.

```bash
# View all recent errors in the source controller
kubectl logs -n flux-system deployment/source-controller --since=10m | grep -i "error\|fail"
```

## Step 3: Identify the Error Category

GitRepository Not Ready errors generally fall into a few categories. Use the error message to determine which one applies.

### Authentication Errors

Error messages containing "authentication required", "invalid credentials", or "403 Forbidden" indicate credential problems.

```bash
# Verify the secret referenced by the GitRepository exists
kubectl get secret git-credentials -n flux-system

# Check the secret has the expected keys
kubectl get secret git-credentials -n flux-system -o jsonpath='{.data}' | jq 'keys'
```

Ensure the secret has the correct format for your authentication method.

```yaml
# HTTPS authentication secret format
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: git
  password: <personal-access-token>
```

```yaml
# SSH authentication secret format
apiVersion: v1
kind: Secret
metadata:
  name: git-ssh-credentials
  namespace: flux-system
type: Opaque
stringData:
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    <your-private-key>
    -----END OPENSSH PRIVATE KEY-----
  known_hosts: |
    github.com ssh-rsa AAAA...
```

### Network and Connectivity Errors

Error messages containing "connection refused", "connection timed out", "no such host", or "dial tcp" point to network problems.

```bash
# Test connectivity from the source controller to the Git host
kubectl exec -n flux-system deployment/source-controller -- \
  wget -q --spider https://github.com && echo "reachable" || echo "unreachable"

# Check DNS resolution
kubectl exec -n flux-system deployment/source-controller -- \
  nslookup github.com
```

Verify that network policies are not blocking egress traffic from the flux-system namespace.

```bash
# Check for network policies that might block outbound traffic
kubectl get networkpolicies -n flux-system
```

### TLS Certificate Errors

Error messages containing "x509", "certificate", or "TLS" indicate certificate trust issues.

```bash
# Check if the Git server uses a self-signed certificate
openssl s_client -connect git.internal.example.com:443 -servername git.internal.example.com </dev/null 2>/dev/null | openssl x509 -noout -issuer
```

If your Git server uses a self-signed or internal CA certificate, provide it in the Git credentials secret.

```yaml
# Secret with custom CA certificate
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: git
  password: <token>
  caFile: |
    -----BEGIN CERTIFICATE-----
    <your-ca-certificate>
    -----END CERTIFICATE-----
```

### Reference Errors

Error messages containing "couldn't find remote ref" or "reference not found" mean the specified branch, tag, or commit does not exist.

```bash
# Verify the ref exists in the remote repository
git ls-remote https://github.com/your-org/my-app.git

# Check the GitRepository spec for typos in the ref
kubectl get gitrepository my-app -n flux-system -o jsonpath='{.spec.ref}'
```

Fix the reference in the GitRepository spec.

```yaml
# Correct the branch reference
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/my-app.git
  ref:
    # Make sure this branch exists in the remote repository
    branch: main
```

### Timeout Errors

Error messages containing "context deadline exceeded" or "timeout" mean the clone operation took too long.

```bash
# Check the current timeout setting
kubectl get gitrepository my-app -n flux-system -o jsonpath='{.spec.timeout}'
```

Increase the timeout for large repositories.

```yaml
# GitRepository with extended timeout
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/my-app.git
  ref:
    branch: main
  # Increase timeout for large repos (default is 60s)
  timeout: 3m
```

## Step 4: Check Source Controller Health

Sometimes the issue is with the source controller itself rather than the GitRepository configuration.

```bash
# Check if the source controller pod is running
kubectl get pods -n flux-system -l app=source-controller

# Check for OOM kills or restarts
kubectl get pods -n flux-system -l app=source-controller -o jsonpath='{.items[0].status.containerStatuses[0].restartCount}'

# Check resource usage
kubectl top pod -n flux-system -l app=source-controller
```

If the source controller is running out of memory, increase its resource limits.

```bash
# Patch source controller resources
kubectl patch deployment source-controller -n flux-system --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/memory","value":"512Mi"}]'
```

## Step 5: Force a Reconciliation

After fixing the issue, force an immediate reconciliation instead of waiting for the interval.

```bash
# Force reconciliation and watch for the result
flux reconcile source git my-app --with-source
```

If the issue persists, you can delete and recreate the GitRepository as a last resort.

```bash
# Export the current GitRepository spec
kubectl get gitrepository my-app -n flux-system -o yaml > my-app-gitrepo-backup.yaml

# Delete and recreate
kubectl delete gitrepository my-app -n flux-system
kubectl apply -f my-app-gitrepo-backup.yaml
```

## Quick Reference: Error Messages and Solutions

| Error Message | Likely Cause | Solution |
|---|---|---|
| authentication required | Missing or invalid credentials | Check `secretRef` and secret contents |
| 403 Forbidden | Token lacks required permissions | Regenerate token with correct scopes |
| connection refused | Git server unreachable | Check network policies and DNS |
| x509: certificate signed by unknown authority | Self-signed or internal CA | Add CA cert to the credentials secret |
| couldn't find remote ref | Branch or tag does not exist | Verify `spec.ref` matches the remote |
| context deadline exceeded | Clone takes too long | Increase `spec.timeout` |
| failed to verify signature | GPG verification failed | Check verify secret and commit signatures |

## Step 6: Prevent Future Issues

Set up monitoring to catch GitRepository failures early.

```bash
# Check all GitRepository sources for issues
flux get source git -A --status-selector ready=false
```

Consider adding a Prometheus alert for Flux source failures.

```yaml
# Alert on GitRepository reconciliation failures
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-source-alerts
  namespace: flux-system
spec:
  groups:
  - name: flux.rules
    rules:
    - alert: GitRepositoryNotReady
      expr: gotk_reconcile_condition{kind="GitRepository",type="Ready",status="False"} == 1
      for: 15m
      labels:
        severity: critical
      annotations:
        summary: "GitRepository {{ $labels.name }} is not ready"
```

## Summary

Troubleshooting GitRepository Not Ready errors in Flux follows a systematic pattern: check the resource status and conditions, examine source controller logs, identify the error category, and apply the appropriate fix. Most issues fall into authentication, network, TLS, reference, or timeout categories. After resolving the underlying problem, force a reconciliation to verify the fix. Setting up monitoring for source failures helps you catch issues before they block deployments.
