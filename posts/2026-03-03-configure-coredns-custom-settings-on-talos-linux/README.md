# How to Configure CoreDNS Custom Settings on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CoreDNS, DNS, Kubernetes, Networking

Description: Customize CoreDNS configuration on Talos Linux clusters to handle custom domains, forwarding rules, and advanced DNS features.

---

CoreDNS is the default DNS server in Kubernetes, and Talos Linux clusters are no exception. Out of the box, CoreDNS handles service discovery within the cluster - resolving service names to ClusterIP addresses. But most real-world setups need more than the defaults. You might need to resolve internal corporate domains, add custom DNS records, or fine-tune caching behavior.

This guide covers practical CoreDNS customizations for Talos Linux clusters, from simple tweaks to advanced configurations.

## Understanding the Default CoreDNS Setup

On a fresh Talos Linux cluster, CoreDNS runs as a Deployment in the kube-system namespace with a ConfigMap called `coredns` that holds its configuration:

```bash
# View the current CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml
```

The default Corefile looks something like this:

```
.:53 {
    errors
    health {
       lazystart
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

Each line in the Corefile is a plugin. The order matters because CoreDNS processes plugins in the order they appear.

## Adding Custom DNS Records

One of the most common needs is adding static DNS records for internal services that live outside the cluster. Use the `hosts` plugin for this:

```bash
# Edit the CoreDNS ConfigMap
kubectl edit configmap coredns -n kube-system
```

Add the hosts plugin before the forward plugin:

```
.:53 {
    errors
    health {
       lazystart
    }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }
    hosts {
       192.168.1.100 gitlab.internal.company.com
       192.168.1.101 registry.internal.company.com
       192.168.1.102 vault.internal.company.com
       fallthrough
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

The `fallthrough` directive in the hosts block is important. Without it, DNS queries that do not match any host entry will not be passed to the next plugin.

After editing, CoreDNS will automatically reload (thanks to the `reload` plugin). You can verify:

```bash
# Check if CoreDNS picked up the change
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=20

# Test resolution from inside the cluster
kubectl run dns-test --rm -it --restart=Never --image=busybox -- \
    nslookup gitlab.internal.company.com
```

## Forwarding Specific Domains

If your organization has internal DNS servers for corporate domains, you can forward those queries to the right servers while keeping external resolution on the default path:

```
.:53 {
    errors
    health {
       lazystart
    }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }
    prometheus :9153
    forward . 8.8.8.8 8.8.4.4 {
       max_concurrent 1000
    }
    cache 30
    loop
    reload
    loadbalance
}

# Forward corporate domains to internal DNS
company.com:53 {
    errors
    cache 30
    forward . 10.0.1.53 10.0.2.53
}

internal.local:53 {
    errors
    cache 30
    forward . 10.0.1.53 10.0.2.53
}
```

Notice that each domain gets its own server block. CoreDNS routes queries to the most specific matching server block.

## Using the Rewrite Plugin

The rewrite plugin lets you modify DNS queries before they are processed. This is useful for aliasing or redirecting:

```
.:53 {
    errors
    health {
       lazystart
    }
    ready

    # Rewrite queries for old domain to new domain
    rewrite name old-service.default.svc.cluster.local new-service.default.svc.cluster.local

    # Rewrite a short name to a fully qualified name
    rewrite name mydb.local postgres-primary.database.svc.cluster.local

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

You can also use regex-based rewrites for more complex patterns:

```
# Rewrite all *.legacy.local to *.default.svc.cluster.local
rewrite name regex (.+)\.legacy\.local {1}.default.svc.cluster.local
```

## Customizing Cache Behavior

The default cache TTL of 30 seconds works for most cases, but you can tune it:

```
cache {
    success 9984 300   # Cache successful lookups for up to 300 seconds, max 9984 entries
    denial 9984 60     # Cache NXDOMAIN responses for up to 60 seconds
    prefetch 10 1m 10% # Prefetch popular entries before they expire
}
```

The prefetch option is particularly useful for high-traffic services. It refreshes cache entries before they expire, which means pods never have to wait for a cache miss on popular DNS names.

## Adding Logging for Debugging

When troubleshooting DNS issues, enable the log plugin temporarily:

```
.:53 {
    log
    errors
    health {
       lazystart
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

Then watch the logs:

```bash
# Stream CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns -f

# Filter for specific queries
kubectl logs -n kube-system -l k8s-app=kube-dns -f | grep "example.com"
```

Remember to remove the `log` plugin after debugging. It generates a lot of output and can impact performance in busy clusters.

## Applying Changes Through Talos Machine Config

On Talos Linux, you can also manage CoreDNS settings through the machine configuration. This is useful for setting upstream DNS servers that the node itself uses:

```yaml
# talos machine config patch
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
  kubelet:
    clusterDNS:
      - 10.96.0.10
cluster:
  coreDNS:
    disabled: false
```

Apply the patch:

```bash
talosctl patch machineconfig --nodes $NODE_IP --patch-file dns-patch.yaml
```

## Using ConfigMap for Custom Corefile

Rather than editing the coredns ConfigMap directly (which might get overwritten during upgrades), use the `coredns-custom` ConfigMap approach. Create a separate ConfigMap that CoreDNS imports:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  company.server: |
    company.com:53 {
        errors
        cache 30
        forward . 10.0.1.53 10.0.2.53
    }
  custom-hosts.override: |
    hosts {
        192.168.1.100 gitlab.internal.company.com
        192.168.1.101 registry.internal.company.com
        fallthrough
    }
```

Then reference it in the main Corefile using the `import` plugin:

```
.:53 {
    errors
    health {
       lazystart
    }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }
    import /etc/coredns/custom/*.override
    prometheus :9153
    forward . /etc/resolv.conf {
       max_concurrent 1000
    }
    cache 30
    loop
    reload
    loadbalance
}

import /etc/coredns/custom/*.server
```

## Verifying Your Configuration

After making changes, always verify that DNS resolution works correctly:

```bash
#!/bin/bash
# test-dns.sh
# Tests DNS resolution from inside the cluster

# Test cluster service resolution
kubectl run dns-test --rm -it --restart=Never --image=busybox -- sh -c '
    echo "=== Cluster DNS ==="
    nslookup kubernetes.default.svc.cluster.local

    echo "=== External DNS ==="
    nslookup google.com

    echo "=== Custom records ==="
    nslookup gitlab.internal.company.com

    echo "=== Corporate domain ==="
    nslookup intranet.company.com
'
```

## Wrapping Up

CoreDNS on Talos Linux is highly configurable once you understand the plugin system. Start with the defaults and layer on customizations as your needs grow. Keep your Corefile clean, use separate server blocks for different domains, and always test changes before relying on them in production. DNS is one of those things that everything depends on, so getting it right matters.
