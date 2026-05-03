# How to Debug Ingress Controller IPv6 Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Ingress, Networking, Debugging, Nginx

Description: A practical guide to diagnosing and resolving common IPv6 connectivity problems with Kubernetes Ingress controllers.

## Introduction

IPv6 support in Kubernetes Ingress controllers can be tricky to debug because issues may originate from the controller configuration, underlying CNI plugin, node networking, or load balancer setup. This guide walks you through a systematic debugging approach.

## Prerequisites

- A running Kubernetes cluster with IPv6 or dual-stack enabled
- `kubectl` access with cluster-admin rights
- Basic familiarity with NGINX Ingress controller

## Step 1: Verify the Cluster Has IPv6 Enabled

First, confirm that your cluster's API server and nodes are configured for IPv6 or dual-stack.

```bash
# Check node addresses - look for IPv6 entries

kubectl get nodes -o wide

# Inspect the node's podCIDR for IPv6 range
kubectl get node <node-name> -o jsonpath='{.spec.podCIDRs}'
```

## Step 2: Check Ingress Controller Pod Logs

Most issues surface quickly in the controller logs.

```bash
# Tail logs from the ingress-nginx controller
kubectl logs -n ingress-nginx \
  -l app.kubernetes.io/name=ingress-nginx \
  --tail=100

# Filter specifically for IPv6 or binding errors
kubectl logs -n ingress-nginx \
  -l app.kubernetes.io/name=ingress-nginx \
  --tail=200 | grep -i "ipv6\|bind\|listen\|address"
```

## Step 3: Inspect the Controller ConfigMap

NGINX Ingress listens on IPv6 by default (`use-ipv6` defaults to `true`), but verify the ConfigMap to make sure it has not been disabled.

```bash
# View the current ConfigMap
kubectl get configmap ingress-nginx-controller \
  -n ingress-nginx -o yaml
```

Add or verify this key in the ConfigMap data section:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
data:
  # Enable IPv6 listening on NGINX
  use-ipv6: "true"
  # Bind to both IPv4 and IPv6 wildcard addresses
  bind-address: "::,0.0.0.0"
```

## Step 4: Check the LoadBalancer Service

The Service fronting the Ingress controller must expose an IPv6 address.

```bash
# Get the external IPs assigned to the ingress service
kubectl get svc ingress-nginx-controller -n ingress-nginx

# Look for an IPv6 external IP in the output
kubectl get svc ingress-nginx-controller \
  -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress}'
```

If no IPv6 address is assigned, check your cloud provider's load balancer settings or your MetalLB configuration for dual-stack support.

## Step 5: Test Connectivity Directly

Use `curl` with explicit IPv6 to isolate whether the issue is DNS or connectivity.

```bash
# Test using an explicit IPv6 address (square brackets required)
curl -6 -v http://[2001:db8::1]/health

# Test with a hostname, forcing IPv6 resolution
curl -6 -v http://myapp.example.com/health

# Use ping6 to verify basic reachability
ping6 -c 4 myapp.example.com
```

## Step 6: Examine NGINX Internal Configuration

Connect to the NGINX pod and inspect the rendered configuration.

```bash
# Exec into the ingress controller pod
kubectl exec -it -n ingress-nginx \
  $(kubectl get pod -n ingress-nginx \
    -l app.kubernetes.io/name=ingress-nginx \
    -o name | head -1) -- /bin/bash

# Inside the pod, check the listen directives
grep -n "listen" /etc/nginx/nginx.conf | head -30
```

A properly configured dual-stack NGINX will show both:
- `listen 80;`
- `listen [::]:80;`

## Common Issues and Fixes

| Symptom | Likely Cause | Fix |
|---|---|---|
| No IPv6 external IP on Service | Cloud LB not IPv6-enabled | Enable dual-stack on LB or use MetalLB |
| `[::]:80` missing in nginx.conf | `use-ipv6: "false"` in ConfigMap | Set `use-ipv6: "true"` |
| Pods unreachable over IPv6 | CNI not dual-stack | Reconfigure CNI (e.g., Calico, Cilium) |
| DNS resolves only IPv4 | CoreDNS not returning AAAA | Add IPv6 to CoreDNS upstream or check `ndots` |

## Conclusion

Debugging IPv6 Ingress issues requires checking each layer: cluster config, controller ConfigMap, the fronting Service, and actual NGINX listen directives. Using OneUptime to monitor your Ingress endpoints over both IPv4 and IPv6 helps you catch regressions early.
