# How to Configure K3s with CoreDNS Custom Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, CoreDNS, DNS, Networking, DevOps

Description: Learn how to customize CoreDNS configuration in K3s to support custom DNS zones, forwarding rules, search domains, and external DNS resolution.

## Introduction

K3s deploys CoreDNS as the cluster DNS provider. While the default configuration handles most use cases, custom DNS requirements - such as resolving internal company domains, overriding specific hostnames, or forwarding DNS queries to custom resolvers - require extending the CoreDNS configuration. In K3s, this is typically done with a `coredns-custom` ConfigMap. This guide covers common CoreDNS customization scenarios in K3s.

## Understanding CoreDNS Configuration

CoreDNS configuration (Corefile) uses a plugin-based architecture where plugins are chained to handle DNS queries. K3s packages CoreDNS as a managed AddOn, and the default Corefile imports `*.override` and `*.server` entries from a `coredns-custom` ConfigMap. Customizations must be done carefully to persist across restarts and upgrades.

## View Current CoreDNS Configuration

```bash
# View the current CoreDNS ConfigMap

kubectl get configmap coredns -n kube-system -o yaml

# The Corefile is in the 'data.Corefile' key
kubectl get configmap coredns -n kube-system \
  -o jsonpath='{.data.Corefile}'
```

## Step 1: Add Custom DNS Records (Hosts Plugin)

Override specific hostnames with custom IPs:

```yaml
# coredns-custom-hosts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  internal.example.com.server: |
    internal.example.com:53 {
        errors
        hosts {
            10.0.0.100 internal.example.com
            10.0.0.101 api.internal.example.com
            fallthrough
        }
    }
```

Apply the ConfigMap:

```bash
kubectl apply -f coredns-custom-hosts.yaml

# Restart CoreDNS to pick up changes immediately
kubectl rollout restart deployment/coredns -n kube-system
kubectl rollout status deployment/coredns -n kube-system
```

## Step 2: Forward Internal Domains to Custom DNS Servers

Route queries for specific domains to your corporate DNS:

```bash
# Edit the existing coredns-custom ConfigMap
kubectl edit configmap coredns-custom -n kube-system
```

```yaml
# Add these keys under data:
data:
  # Forward corp.example.com queries to internal corporate DNS
  corp.override: |
    forward corp.example.com 10.0.0.1 10.0.0.2 {
        prefer_udp
    }

  # Forward internal.local to a local DNS server
  internal-local.override: |
    forward internal.local 192.168.1.1
```

Restart CoreDNS to pick up changes:

```bash
kubectl rollout restart deployment/coredns -n kube-system

# Watch pods restart
kubectl rollout status deployment/coredns -n kube-system
```

## Step 3: Add Custom Search Domains

Configure additional search domains for pods. Search domains are configured on Pods or via kubelet settings, not in the CoreDNS Corefile:

```yaml
# This is typically done via the kubelet config or pod spec
# In a pod spec, you can add DNS config:
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  dnsPolicy: ClusterFirst
  dnsConfig:
    # Additional search domains
    searches:
      - corp.example.com
      - internal.example.com
    # Custom DNS options
    options:
      - name: ndots
        value: "5"
      - name: timeout
        value: "2"
      - name: attempts
        value: "3"
  containers:
    - name: app
      image: nginx:latest
```

## Step 4: Use ConfigMap for Persistent Custom Configuration

K3s may overwrite direct edits to the `coredns` ConfigMap. Use a separate `coredns-custom` ConfigMap for persistent custom configuration:

```yaml
# coredns-custom.yaml
---
# Custom configuration ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  # Custom hosts file mounted at /etc/coredns/custom/custom-hosts.txt
  custom-hosts.txt: |
    10.0.0.100 internal.example.com
    10.0.0.101 api.internal.example.com
    10.0.0.102 db.internal.example.com

  # Additional override imported into the default server block
  corp.override: |
    forward corp.example.com 10.0.0.1 10.0.0.2 {
        prefer_udp
    }

  # Additional server block imported by K3s
  custom.server: |
    internal.example.com:53 {
        errors
        hosts /etc/coredns/custom/custom-hosts.txt {
            fallthrough
        }
    }
```

Apply the custom ConfigMap:

```bash
kubectl apply -f coredns-custom.yaml
```

K3s mounts the `coredns-custom` ConfigMap at `/etc/coredns/custom` automatically, so no deployment patch is required.

## Step 5: Add the Import Plugin for Modular Config

Use CoreDNS's `import` plugin to include additional config files. In K3s, the packaged Corefile already includes the relevant imports:

```yaml
data:
  Corefile: |
    .:53 {
        errors
        health
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
          pods insecure
          fallthrough in-addr.arpa ip6.arpa
        }
        hosts /etc/coredns/NodeHosts {
          ttl 60
          reload 15s
          fallthrough
        }
        prometheus :9153
        cache 30
        loop
        reload
        loadbalance
        # Import additional plugin directives into the default server block
        import /etc/coredns/custom/*.override
        forward . /etc/resolv.conf
    }
    # Import additional server blocks
    import /etc/coredns/custom/*.server
```

## Step 6: Store the Custom ConfigMap in the Manifests Directory

For K3s-managed CoreDNS, store the `coredns-custom` ConfigMap in the K3s manifests directory so it is applied automatically on server startup:

```yaml
# /var/lib/rancher/k3s/server/manifests/coredns-custom.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  corp.override: |
    forward corp.example.com 10.0.0.1 10.0.0.2 {
        prefer_udp
    }
```

## Step 7: Test DNS Resolution

```bash
# Deploy a test pod
kubectl run dns-test --image=busybox:1.35 --restart=Never -- sleep 3600

# Test Kubernetes service DNS resolution
kubectl exec dns-test -- nslookup kubernetes.default.svc.cluster.local

# Test custom domain resolution
kubectl exec dns-test -- nslookup internal.example.com

# Test external DNS resolution
kubectl exec dns-test -- nslookup google.com

# Test corporate domain forwarding
kubectl exec dns-test -- nslookup service.corp.example.com

# Check DNS configuration in the pod
kubectl exec dns-test -- cat /etc/resolv.conf

# Clean up
kubectl delete pod dns-test
```

## Conclusion

CoreDNS in K3s is highly configurable through its plugin system. Common customizations include adding custom host entries, forwarding internal domains to corporate DNS servers, and adjusting search domains. For K3s clusters, using a `coredns-custom` ConfigMap and storing that manifest in `/var/lib/rancher/k3s/server/manifests` is the recommended approach for persistent customizations that survive K3s restarts and upgrades. Always test DNS changes with a test pod before deploying to production to ensure resolution works as expected.
