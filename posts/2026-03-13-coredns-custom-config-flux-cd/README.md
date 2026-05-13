# CoreDNS Custom Config with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux-cd, CoreDNS, DNS, Kubernetes, GitOps, Networking

Description: Learn how to customize CoreDNS configuration using Flux CD to add custom DNS zones, stub resolvers, and forwarding rules as version-controlled GitOps resources.

---

## Introduction

CoreDNS is the default DNS server for Kubernetes clusters. While the default configuration works for most cases, production environments often need customizations: custom DNS zones for internal services, forwarders for specific domains, rewrite rules, or stub zones for on-premises DNS servers. Managing these changes through GitOps with Flux CD ensures they are versioned, auditable, and consistent across cluster recreations.

## Prerequisites

- A Kubernetes cluster with CoreDNS installed and a provider that allows managing the `kube-system/coredns` ConfigMap directly (default for kubeadm and many self-managed clusters; AKS uses the provider-supported `coredns-custom` ConfigMap instead of editing the main Corefile)
- Flux CD bootstrapped on the cluster
- Understanding of CoreDNS Corefile syntax

## Step 1: Understand the CoreDNS Configuration Structure

CoreDNS configuration lives in the `coredns` ConfigMap in the `kube-system` namespace:

```bash
# View the current CoreDNS configuration

kubectl get configmap coredns -n kube-system -o yaml
```

Default Corefile:

```plaintext
.:53 {
    errors
    health {
       lameduck 5s
    }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }
    prometheus :9153
    forward . /etc/resolv.conf {
       max_concurrent 1000
    }
    cache 30
    loop
    reload
    loadbalance
}
```

## Step 2: Create a Flux-Managed CoreDNS ConfigMap

```yaml
# infrastructure/coredns/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153

        # Custom: Forward corporate domain to internal DNS
        forward corporate.example.com 10.0.0.10 10.0.0.11 {
          prefer_udp
        }

        # Custom: Forward to specific nameservers for on-premises domain
        forward onprem.internal 192.168.1.1 192.168.1.2

        forward . /etc/resolv.conf {
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }

    # Custom: Serve a stub zone for internal.example.com
    internal.example.com:53 {
        errors
        file /etc/coredns/internal.db {
           reload 30s
        }
    }
```

## Step 3: Add a Custom DNS Zone File

```yaml
# infrastructure/coredns/configmap.yaml (add the zone file to the same ConfigMap)
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153

        # Custom: Forward corporate domain to internal DNS
        forward corporate.example.com 10.0.0.10 10.0.0.11 {
          prefer_udp
        }

        # Custom: Forward to specific nameservers for on-premises domain
        forward onprem.internal 192.168.1.1 192.168.1.2

        forward . /etc/resolv.conf {
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }

    # Custom: Serve a stub zone for internal.example.com
    internal.example.com:53 {
        errors
        file /etc/coredns/internal.db {
           reload 30s
        }
    }

  internal.db: |
    ; Zone file for internal.example.com
    $ORIGIN internal.example.com.
    $TTL 300
    @   IN  SOA  ns1.internal.example.com. admin.example.com. (
                    2024010101 ; Serial
                    3600       ; Refresh
                    900        ; Retry
                    604800     ; Expire
                    300 )      ; Negative TTL

    @      IN  NS   ns1.internal.example.com.
    ns1    IN  A    10.0.1.10
    api    IN  A    10.0.1.100
    db     IN  A    10.0.1.200
    cache  IN  A    10.0.1.150
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/production/infrastructure/coredns.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: coredns-config
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/coredns
  prune: false
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: kube-system
```

## Step 5: Add a CoreDNS Rewrite Rule

```yaml
# For Kubernetes service name rewrites
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

        # Rewrite: myapp.legacy.com -> myapp.myapp.svc.cluster.local
        rewrite name myapp.legacy.com myapp.myapp.svc.cluster.local

        # Rewrite with response: rewrites both query and response
        rewrite name regex (.+)\.legacy\.example\.com {1}.cluster.local answer auto

        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
```

## Step 6: Verify CoreDNS Reload

```bash
# Check that Flux applied the ConfigMap
flux get kustomizations coredns-config -n flux-system

# Verify the ConfigMap was updated
kubectl get configmap coredns -n kube-system -o yaml

# CoreDNS watches the Corefile with the reload plugin.
# The file plugin reloads zone files when the SOA serial changes.
# Verify CoreDNS is running correctly
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=20

# Test DNS resolution
kubectl run test-dns --image=busybox:1.36 --rm -it --restart=Never -- \
  nslookup corporate.example.com

# Test custom zone
kubectl run test-zone --image=busybox:1.36 --rm -it --restart=Never -- \
  nslookup api.internal.example.com
```

## Best Practices

- Use `prune: false` when managing the CoreDNS ConfigMap alone; if the path is removed from Git with pruning enabled, CoreDNS would lose its configuration.
- Use the `reload` plugin in CoreDNS (it's in the default config) to allow hot-reload of the Corefile without pod restart.
- Use the `file` plugin's `reload` option for custom zone files, and increment the zone SOA serial when the zone changes.
- Test DNS configuration changes in a staging cluster before deploying to production.
- Use the `health` and `ready` plugins to ensure CoreDNS readiness probes work correctly after configuration changes.
- If you manage the CoreDNS Deployment in Git, roll the pods only for changes that the CoreDNS plugins cannot reload.
- Keep a copy of the original CoreDNS ConfigMap in Git history before making any changes.

## Conclusion

Managing CoreDNS configuration through Flux CD ensures that your cluster's DNS behavior is version-controlled and reproducible. Custom forwarders, stub zones, and rewrite rules are common production requirements that can easily drift if managed manually. With Flux CD, every DNS configuration change has a Git commit, a PR review, and is automatically applied to all cluster recreations.
