# How to Fix failed to download artifact Error in Flux Source

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, Source Controller, Artifacts, OCI

Description: Learn how to diagnose and fix the "failed to download artifact" error in the Flux source-controller when pulling from Git, Helm, or OCI repositories.

---

When Flux attempts to fetch sources from a Git repository, Helm chart registry, or OCI artifact store, you may see the following error in the source-controller:

```
source-controller: failed to download artifact from 'oci://registry.example.com/charts/my-chart:1.2.0': GET https://registry.example.com/v2/charts/my-chart/manifests/1.2.0: UNAUTHORIZED: authentication required
```

or:

```
source-controller: failed to download artifact: unexpected EOF
```

This error indicates that the source-controller could not retrieve the artifact it needs to provide to other Flux controllers for reconciliation.

## Root Causes

### 1. Authentication Failure

The registry or repository requires credentials, but either no secret is configured or the credentials are incorrect or expired.

### 2. Network Connectivity Issues

The source-controller pod cannot reach the artifact source due to network policies, DNS resolution failures, or firewall rules.

### 3. Artifact Does Not Exist

The referenced tag, version, or branch does not exist in the source repository or registry.

### 4. Rate Limiting

Public registries such as Docker Hub enforce rate limits. If your cluster makes too many requests, downloads will be throttled or denied.

### 5. Corrupted or Incomplete Download

Network instability can cause partial downloads, resulting in unexpected EOF errors.

## Diagnostic Steps

### Step 1: Check Source Status

```bash
flux get sources all -A
```

This shows the status of all source resources across namespaces.

### Step 2: Inspect the Specific Source

For a HelmRepository:

```bash
kubectl describe helmrepository my-repo -n flux-system
```

For an OCIRepository:

```bash
kubectl describe ocirepository my-oci-repo -n flux-system
```

### Step 3: Verify Network Connectivity

Exec into the source-controller pod to test connectivity:

```bash
kubectl exec -it -n flux-system deploy/source-controller -- wget -qO- --spider https://registry.example.com/v2/
```

### Step 4: Check Source Controller Logs

```bash
kubectl logs -n flux-system deploy/source-controller --since=5m | grep "failed to download"
```

### Step 5: Validate Credentials

If using image pull secrets, verify the secret contents:

```bash
kubectl get secret regcred -n flux-system -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | jq .
```

## How to Fix

### Fix 1: Create or Update Registry Credentials

Create a Docker registry secret:

```bash
kubectl create secret docker-registry regcred \
  --namespace=flux-system \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword
```

Reference it in your source:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: my-oci-repo
  namespace: flux-system
spec:
  interval: 10m
  url: oci://registry.example.com/charts/my-chart
  ref:
    tag: "1.2.0"
  secretRef:
    name: regcred
```

### Fix 2: Fix the Artifact Reference

Verify the tag or version exists in the registry:

```bash
crane ls registry.example.com/charts/my-chart
```

Update the source spec to reference a valid tag.

### Fix 3: Configure a Registry Mirror or Proxy

If rate limiting is the issue, configure a pull-through cache:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 1h
  url: https://mirror.internal.example.com/charts
```

### Fix 4: Increase Timeout for Large Artifacts

For large artifacts on slow connections, increase the timeout:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-repo
  timeout: 5m
```

### Fix 5: Force Source Reconciliation

```bash
flux reconcile source git my-repo
```

or for Helm:

```bash
flux reconcile source helm my-repo
```

## Prevention

Use private registry mirrors to avoid rate limiting from public registries. Ensure credentials are rotated before expiration and manage them as SOPS-encrypted secrets in your Flux repository. Set appropriate timeouts based on your network conditions and artifact sizes.
