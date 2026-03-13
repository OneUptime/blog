# How to Configure Flux Proxy Secret for HTTP Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, Proxy, HTTP Proxy, Networking

Description: Learn how to configure Flux CD to route source controller traffic through an HTTP proxy using a proxy secret.

---

## Introduction

In many enterprise environments, outbound internet access from Kubernetes clusters is restricted and must pass through an HTTP proxy. Flux CD source controller supports proxy configuration through a dedicated Kubernetes secret, allowing Git and Helm repository connections to route through your corporate proxy. This guide covers how to set up an HTTP proxy secret for Flux.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` configured to access your cluster
- The HTTP proxy URL (e.g., `http://proxy.corp.example.com:8080`)
- Optional: proxy authentication credentials

## Understanding Flux Proxy Configuration

Flux source controller reads proxy settings from a secret referenced in `GitRepository`, `HelmRepository`, or `Bucket` resources. The secret must contain the proxy URL in a specific key format that the source controller understands.

## Step 1: Create the Proxy Secret Without Authentication

For a proxy that does not require authentication:

```bash
kubectl create secret generic flux-http-proxy \
  --namespace=flux-system \
  --from-literal=address=http://proxy.corp.example.com:8080
```

## Step 2: Create the Proxy Secret With Authentication

If your proxy requires a username and password:

```bash
kubectl create secret generic flux-http-proxy \
  --namespace=flux-system \
  --from-literal=address=http://proxy.corp.example.com:8080 \
  --from-literal=username=proxyuser \
  --from-literal=password=proxypassword
```

## Step 3: Declarative YAML Manifest

You can also define the secret as a YAML manifest for GitOps management.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: flux-http-proxy
  namespace: flux-system
type: Opaque
stringData:
  address: "http://proxy.corp.example.com:8080"
  username: "proxyuser"
  password: "proxypassword"
```

Apply it:

```bash
kubectl apply -f flux-http-proxy-secret.yaml
```

## Step 4: Reference the Proxy Secret in a GitRepository

Add the `proxySecretRef` field to your `GitRepository` resource.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-app.git
  ref:
    branch: main
  secretRef:
    name: my-app-auth
  proxySecretRef:
    name: flux-http-proxy
```

## Step 5: Reference the Proxy Secret in a HelmRepository

The same approach works for Helm repositories.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 30m
  url: https://charts.bitnami.com/bitnami
  proxySecretRef:
    name: flux-http-proxy
```

## Step 6: Reference the Proxy Secret in a Bucket Source

For S3-compatible bucket sources:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-bucket
  namespace: flux-system
spec:
  interval: 10m
  provider: generic
  bucketName: my-flux-artifacts
  endpoint: s3.amazonaws.com
  proxySecretRef:
    name: flux-http-proxy
```

## Step 7: Verify Proxy Connectivity

After applying the resources, check that Flux can connect through the proxy.

```bash
# Check GitRepository status
kubectl get gitrepository -n flux-system my-app -o yaml

# Look for successful fetch events
kubectl events -n flux-system --for gitrepository/my-app

# Force reconciliation
flux reconcile source git my-app
```

A ready status confirms the proxy is working:

```bash
kubectl get gitrepository -n flux-system
```

## Troubleshooting

### Connection Timeouts

If you see timeout errors, verify the proxy is reachable from within the cluster:

```bash
kubectl run proxy-test --rm -it --image=curlimages/curl -- \
  curl -x http://proxy.corp.example.com:8080 https://github.com
```

### Proxy Authentication Failures

Check that the username and password in the secret are correct:

```bash
kubectl get secret flux-http-proxy -n flux-system \
  -o jsonpath='{.data.username}' | base64 -d
```

### Source Controller Logs

Inspect the source controller logs for proxy-related errors:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i proxy
```

## Cluster-Wide vs Per-Resource Proxy

The `proxySecretRef` approach configures the proxy on a per-resource basis. If you need a cluster-wide proxy for all Flux operations, you can set the `HTTP_PROXY` and `HTTPS_PROXY` environment variables on the source controller deployment. However, the per-resource approach is more flexible and recommended for most setups.

```yaml
# Cluster-wide alternative (patch source-controller deployment)
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
        env:
        - name: HTTP_PROXY
          value: "http://proxy.corp.example.com:8080"
        - name: HTTPS_PROXY
          value: "http://proxy.corp.example.com:8080"
```

## Conclusion

Configuring an HTTP proxy secret in Flux allows the source controller to fetch Git repositories, Helm charts, and bucket artifacts through a corporate proxy. By using `proxySecretRef`, you keep the proxy configuration declarative and manageable within your GitOps workflow.
