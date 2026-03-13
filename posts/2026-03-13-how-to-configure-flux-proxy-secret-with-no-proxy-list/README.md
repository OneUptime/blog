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

## Step 1: Create a Proxy Secret with No-Proxy

The proxy secret supports an `address` field for the proxy URL and a `no_proxy` field for the bypass list.

```bash
kubectl create secret generic flux-proxy-config \
  --namespace=flux-system \
  --from-literal=address=http://proxy.corp.example.com:8080 \
  --from-literal=no_proxy=".internal.example.com,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,localhost,127.0.0.1,.cluster.local,.svc"
```

## Step 2: Declarative YAML Manifest

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: flux-proxy-config
  namespace: flux-system
type: Opaque
stringData:
  address: "http://proxy.corp.example.com:8080"
  username: "proxyuser"
  password: "proxypassword"
  no_proxy: ".internal.example.com,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,localhost,127.0.0.1,.cluster.local,.svc"
```

Apply it:

```bash
kubectl apply -f flux-proxy-config.yaml
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

## Step 4: Reference the Secret in Source Resources

### GitRepository with Internal Server (No Proxy)

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
  proxySecretRef:
    name: flux-proxy-config
```

Since `git.internal.example.com` matches `.internal.example.com` in the no-proxy list, this connection bypasses the proxy.

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
  proxySecretRef:
    name: flux-proxy-config
```

Since `github.com` is not in the no-proxy list, this connection goes through the proxy.

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
  proxySecretRef:
    name: flux-proxy-config
```

The `.cluster.local` and `.svc` entries in the no-proxy list ensure this bypasses the proxy.

## Step 5: Verify the Configuration

```bash
# Check that internal sources reconcile without the proxy
flux get sources git internal-app

# Check that external sources reconcile through the proxy
flux get sources git external-app

# View source controller logs for proxy usage
kubectl logs -n flux-system deploy/source-controller --tail=100
```

## Step 6: Common No-Proxy Patterns for Different Environments

### AWS Environment

```yaml
stringData:
  no_proxy: "169.254.169.254,.ec2.internal,.amazonaws.com,10.0.0.0/8,.cluster.local,.svc,localhost,127.0.0.1"
```

### GCP Environment

```yaml
stringData:
  no_proxy: "169.254.169.254,metadata.google.internal,.googleapis.com,10.0.0.0/8,.cluster.local,.svc,localhost,127.0.0.1"
```

### Azure Environment

```yaml
stringData:
  no_proxy: "169.254.169.254,.azure.com,.windows.net,10.0.0.0/8,.cluster.local,.svc,localhost,127.0.0.1"
```

### On-Premises Environment

```yaml
stringData:
  no_proxy: ".corp.example.com,.internal.example.com,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.cluster.local,.svc,localhost,127.0.0.1"
```

## Troubleshooting

### Internal Host Still Going Through Proxy

Check that the domain or IP in the no-proxy list matches exactly. A leading dot (`.example.com`) matches all subdomains, while `example.com` without the dot matches only the exact host.

```bash
# View the no_proxy value
kubectl get secret flux-proxy-config -n flux-system \
  -o jsonpath='{.data.no_proxy}' | base64 -d
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

A no-proxy list is essential when using Flux with a proxy in environments that have both internal and external sources. By listing internal hosts, CIDR ranges, and Kubernetes DNS domains in the `no_proxy` field, you ensure that internal traffic goes direct while external traffic routes through the proxy. This keeps Flux working efficiently across mixed network environments.
