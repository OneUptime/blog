# How to Configure Flux Proxy Secret with No-Proxy List

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, Proxy, No-Proxy, Networking, Bypass

Description: How to configure a no-proxy list in Flux CD to bypass the proxy for specific hosts, domains, and internal services.

---

## Introduction

When using a proxy with Flux CD, certain destinations should bypass the proxy entirely. Internal Git servers, private Helm repositories hosted within your network, and cluster-internal services do not need to go through an external proxy. Flux supports a no-proxy configuration within the proxy secret that lets you specify hosts and domains that should be accessed directly. This guide explains how to set up a no-proxy list.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` configured to access your cluster
- An existing proxy configuration or proxy URL
- Knowledge of which internal hosts should bypass the proxy

## Why Use a No-Proxy List

Without a no-proxy list, all HTTP and HTTPS traffic from the source controller routes through the proxy. This causes problems when:

- Internal Git servers are not reachable through the proxy
- Cluster-internal Helm repositories should be accessed directly
- The proxy adds unnecessary latency for internal traffic
- Internal services use certificates not recognized by the proxy

## Important Note on No-Proxy Support

As of Flux v2.x, the `no_proxy` field is **not supported** in per-object proxy secrets (the secrets referenced by `proxySecretRef`). Per-object proxy secrets only support `address`, `username`, and `password` keys. There is an open feature request ([fluxcd/flux2#5062](https://github.com/fluxcd/flux2/issues/5062)) to add `no_proxy` support to per-object proxy configuration.

Currently, the supported way to configure a no-proxy list is through **controller-level environment variables** (`NO_PROXY`, `HTTP_PROXY`, `HTTPS_PROXY`). This guide covers that approach.

## Step 1: Configure No-Proxy via Controller Environment Variables

The recommended way to set a no-proxy list is by patching the Flux source-controller deployment with environment variables:

```bash
kubectl set env deployment/source-controller -n flux-system \
  HTTP_PROXY=http://proxy.corp.example.com:8080 \
  HTTPS_PROXY=http://proxy.corp.example.com:8080 \
  NO_PROXY=".internal.example.com,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,localhost,127.0.0.1,.cluster.local,.svc"
```

For a GitOps-managed approach, use a Kustomize patch in your Flux bootstrap repository:

## Step 2: Declarative Kustomize Patch

Create a patch file that adds the environment variables to the source-controller:

```yaml
# patches/source-controller-proxy.yaml
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
            - name: NO_PROXY
              value: ".internal.example.com,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,localhost,127.0.0.1,.cluster.local,.svc"
```

Reference it in your `kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: patches/source-controller-proxy.yaml
```

## Step 3: Understanding the No-Proxy Format

The `no_proxy` value is a comma-separated list of hosts, domains, and CIDR ranges. Here is a breakdown of common entries:

| Entry | Effect |
|-------|--------|
| `.internal.example.com` | Bypasses proxy for all subdomains of internal.example.com |
| `git.internal.example.com` | Bypasses proxy for this specific host |
| `10.0.0.0/8` | Bypasses proxy for all IPs in the 10.x.x.x range |
| `172.16.0.0/12` | Bypasses proxy for the 172.16-31.x.x range |
| `192.168.0.0/16` | Bypasses proxy for all 192.168.x.x IPs |
| `localhost` | Bypasses proxy for localhost |
| `127.0.0.1` | Bypasses proxy for the loopback address |
| `.cluster.local` | Bypasses proxy for Kubernetes internal DNS |
| `.svc` | Bypasses proxy for Kubernetes services |

## Step 4: How the No-Proxy List Affects Source Resources

With the `NO_PROXY` environment variable set on the source-controller, the proxy bypass applies globally to all sources managed by that controller.

### GitRepository with Internal Server (Bypasses Proxy)

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: internal-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://git.internal.example.com/team/internal-app.git
  ref:
    branch: main
  secretRef:
    name: internal-git-auth
```

Since `git.internal.example.com` matches `.internal.example.com` in the `NO_PROXY` environment variable, this connection bypasses the proxy automatically.

### GitRepository with External Server (Uses Proxy)

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: external-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/external-app.git
  ref:
    branch: main
```

Since `github.com` is not in the `NO_PROXY` list, this connection goes through the proxy defined in `HTTPS_PROXY`.

### HelmRepository with Cluster-Internal Chart Museum

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: internal-charts
  namespace: flux-system
spec:
  interval: 30m
  url: http://chartmuseum.default.svc.cluster.local:8080
```

The `.cluster.local` and `.svc` entries in the `NO_PROXY` variable ensure this bypasses the proxy.

Note: If a specific source needs a different proxy than the controller-level setting, you can use `proxySecretRef` on GitRepository or OCIRepository resources to override the environment variable proxy. However, `proxySecretRef` does not currently support a `no_proxy` field -- it overrides the proxy entirely for that source.

## Step 5: Verify the Configuration

```bash
# Check that internal sources reconcile without the proxy
flux get sources git internal-app

# Check that external sources reconcile through the proxy
flux get sources git external-app

# Verify the environment variables are set on the controller
kubectl get deployment source-controller -n flux-system -o jsonpath='{.spec.template.spec.containers[0].env[*]}' | jq .

# View source controller logs for proxy usage
kubectl logs -n flux-system deploy/source-controller --tail=100
```

## Step 6: Common No-Proxy Patterns for Different Environments

### AWS Environment

```text
NO_PROXY="169.254.169.254,.ec2.internal,.amazonaws.com,10.0.0.0/8,.cluster.local,.svc,localhost,127.0.0.1"
```

### GCP Environment

```text
NO_PROXY="169.254.169.254,metadata.google.internal,.googleapis.com,10.0.0.0/8,.cluster.local,.svc,localhost,127.0.0.1"
```

### Azure Environment

```text
NO_PROXY="169.254.169.254,.azure.com,.windows.net,10.0.0.0/8,.cluster.local,.svc,localhost,127.0.0.1"
```

### On-Premises Environment

```text
NO_PROXY=".corp.example.com,.internal.example.com,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.cluster.local,.svc,localhost,127.0.0.1"
```

## Troubleshooting

### Internal Host Still Going Through Proxy

Check that the domain or IP in the `NO_PROXY` variable matches exactly. A leading dot (`.example.com`) matches all subdomains, while `example.com` without the dot matches only the exact host.

```bash
# View the NO_PROXY value on the source-controller
kubectl get deployment source-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].env}' | jq '.[] | select(.name=="NO_PROXY")'
```

### Kubernetes Services Not Bypassing Proxy

Ensure `.cluster.local` and `.svc` are in the no-proxy list. Kubernetes DNS resolves service names to `<service>.<namespace>.svc.cluster.local`.

### CIDR Range Not Working

Verify the CIDR notation is correct. Use `ipcalc` or a similar tool to confirm ranges:

```bash
# Check if an IP is in a CIDR range
python3 -c "import ipaddress; print(ipaddress.ip_address('10.96.0.1') in ipaddress.ip_network('10.0.0.0/8'))"
```

## Conclusion

A no-proxy list is essential when using Flux with a proxy in environments that have both internal and external sources. By listing internal hosts, CIDR ranges, and Kubernetes DNS domains in the `NO_PROXY` environment variable on the source-controller deployment, you ensure that internal traffic goes direct while external traffic routes through the proxy. Note that per-object proxy secrets (`proxySecretRef`) do not currently support a `no_proxy` field -- this is configured at the controller level via environment variables.
