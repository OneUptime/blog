# How to Use CoreDNS Hosts Plugin to Inject Custom DNS Entries Cluster-Wide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, DNS, Configuration

Description: Learn how to configure the CoreDNS hosts plugin to inject custom DNS entries across your Kubernetes cluster, enabling static host mappings for legacy systems, testing, and special routing requirements.

---

The CoreDNS hosts plugin allows you to define static DNS records that apply cluster-wide, similar to entries in a traditional /etc/hosts file. This capability proves invaluable when you need to override DNS resolution for specific domains, support legacy systems with hardcoded hostnames, or implement testing scenarios without modifying individual pod configurations.

This guide shows you how to configure and manage custom DNS entries using the CoreDNS hosts plugin.

## Understanding the Hosts Plugin

The hosts plugin reads DNS records from a hosts file format and serves them before other resolution methods. Key features:

- Static A, AAAA, and CNAME records
- Applies to all pods in the cluster
- Higher priority than forward/kubernetes plugins
- Supports fallthrough for unmatched queries
- Reloadable without pod restarts

Common use cases:

- Override external domain resolution
- Support legacy systems with specific IP requirements
- Testing and development environments
- Split-horizon DNS implementations
- Emergency DNS overrides

## Basic Hosts Plugin Configuration

Edit the CoreDNS ConfigMap to add the hosts plugin:

```bash
# Get current configuration
kubectl get configmap coredns -n kube-system -o yaml > coredns-config.yaml
```

Add hosts plugin configuration:

```yaml
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

        # Hosts plugin with inline entries
        hosts {
            10.0.1.100 legacy-db.company.com
            10.0.1.101 legacy-api.company.com
            fallthrough
        }

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

Apply and restart CoreDNS:

```bash
# Apply configuration
kubectl apply -f coredns-config.yaml

# Restart CoreDNS pods
kubectl rollout restart deployment coredns -n kube-system

# Verify pods are running
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

Test the custom entries:

```bash
# Deploy test pod
kubectl run test --image=nicolaka/netshoot --rm -it -- bash

# Inside test pod
nslookup legacy-db.company.com
nslookup legacy-api.company.com
```

## Using External Hosts File

For better maintainability, store hosts entries in a separate ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom-hosts
  namespace: kube-system
data:
  customhosts: |
    # Legacy systems
    10.0.1.100 legacy-db.company.com db.legacy.local
    10.0.1.101 legacy-api.company.com api.legacy.local
    10.0.1.102 legacy-cache.company.com cache.legacy.local

    # Development overrides
    192.168.1.10 dev-api.company.com
    192.168.1.11 dev-db.company.com

    # Test environment
    172.16.0.50 test-service.company.com

    # Partner integration endpoints
    203.0.113.10 partner-api.external.com
    203.0.113.11 partner-webhook.external.com
```

Update CoreDNS to use the external file:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health
        ready

        # Load hosts from file
        hosts /etc/coredns/customhosts {
            fallthrough
            reload 30s  # Reload every 30 seconds
        }

        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }

        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
```

Mount the custom hosts ConfigMap:

```bash
# Edit CoreDNS deployment to add volume mount
kubectl edit deployment coredns -n kube-system
```

Add volume and volume mount:

```yaml
spec:
  template:
    spec:
      containers:
      - name: coredns
        volumeMounts:
        - name: config-volume
          mountPath: /etc/coredns
          readOnly: true
        - name: custom-hosts
          mountPath: /etc/coredns/customhosts
          subPath: customhosts
          readOnly: true
      volumes:
      - name: config-volume
        configMap:
          name: coredns
      - name: custom-hosts
        configMap:
          name: coredns-custom-hosts
```

## Environment-Specific Host Mappings

Configure different hosts per environment using namespaced resolution:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health
        ready

        # Production mappings
        hosts /etc/coredns/prod-hosts {
            fallthrough
        }

        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }

        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
    }
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-prod-hosts
  namespace: kube-system
data:
  prod-hosts: |
    # Production external services
    10.10.0.10 database.company.com
    10.10.0.11 cache.company.com
    10.10.0.12 queue.company.com

    # Production APIs
    10.10.1.10 api.company.com
    10.10.1.11 auth.company.com
```

## Wildcard and Pattern Support

While the hosts plugin doesn't support wildcards directly, you can define multiple entries:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom-hosts
  namespace: kube-system
data:
  customhosts: |
    # Multiple subdomains pointing to same IP
    10.0.1.100 api.internal.com
    10.0.1.100 api-v1.internal.com
    10.0.1.100 api-v2.internal.com

    # Service discovery endpoints
    10.0.2.10 service1.discovery.local
    10.0.2.11 service2.discovery.local
    10.0.2.12 service3.discovery.local
```

For true wildcard support, combine with the rewrite plugin:

```yaml
.:53 {
    errors
    health

    # Rewrite all *.internal.com to api.internal.com
    rewrite name regex (.+)\.internal\.com api.internal.com

    # Hosts resolves api.internal.com
    hosts {
        10.0.1.100 api.internal.com
        fallthrough
    }

    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
    }

    forward . /etc/resolv.conf
    cache 30
}
```

## IPv6 Support in Hosts Plugin

Define both IPv4 and IPv6 addresses:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom-hosts
  namespace: kube-system
data:
  customhosts: |
    # IPv4 addresses
    10.0.1.100 dual-stack-service.company.com

    # IPv6 addresses
    2001:db8::1 dual-stack-service.company.com

    # IPv4 only
    192.168.1.50 ipv4-only.company.com

    # IPv6 only
    2001:db8::2 ipv6-only.company.com
```

## CNAME Records in Hosts Plugin

The hosts plugin doesn't support CNAME records directly. Use the rewrite plugin instead:

```yaml
.:53 {
    errors
    health

    # CNAME-like behavior using rewrite
    rewrite name alias.company.com target.company.com

    # Actual host resolution
    hosts {
        10.0.1.100 target.company.com
        fallthrough
    }

    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
    }

    forward . /etc/resolv.conf
    cache 30
}
```

## Dynamic Host Updates with Reload

Enable automatic reloading when hosts file changes:

```yaml
.:53 {
    errors
    health
    ready

    # Reload hosts file every 30 seconds
    hosts /etc/coredns/customhosts {
        reload 30s
        fallthrough
    }

    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }

    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
    loadbalance
}
```

Update hosts without restarting CoreDNS:

```bash
# Edit custom hosts ConfigMap
kubectl edit configmap coredns-custom-hosts -n kube-system

# CoreDNS will reload automatically after 30 seconds
# Or trigger manual reload
kubectl rollout restart deployment coredns -n kube-system
```

## Testing Custom Host Entries

Create a comprehensive test suite:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hosts-test
data:
  test.sh: |
    #!/bin/bash

    echo "Testing custom host entries..."

    # Test legacy system mapping
    echo "Test 1: Legacy DB"
    result=$(nslookup legacy-db.company.com | grep Address | tail -1 | awk '{print $2}')
    if [ "$result" = "10.0.1.100" ]; then
        echo "PASS: legacy-db.company.com resolves to 10.0.1.100"
    else
        echo "FAIL: Expected 10.0.1.100, got $result"
    fi

    # Test API endpoint
    echo "Test 2: Legacy API"
    result=$(nslookup legacy-api.company.com | grep Address | tail -1 | awk '{print $2}')
    if [ "$result" = "10.0.1.101" ]; then
        echo "PASS: legacy-api.company.com resolves to 10.0.1.101"
    else
        echo "FAIL: Expected 10.0.1.101, got $result"
    fi

    # Test connectivity
    echo "Test 3: Connectivity"
    if nc -zv 10.0.1.100 5432 2>&1 | grep -q succeeded; then
        echo "PASS: Can connect to legacy-db"
    else
        echo "WARN: Cannot connect to legacy-db (may be expected)"
    fi

    # Test fallthrough
    echo "Test 4: Fallthrough to normal resolution"
    if nslookup kubernetes.default.svc.cluster.local | grep -q "Address:"; then
        echo "PASS: Normal DNS resolution still works"
    else
        echo "FAIL: Normal DNS resolution broken"
    fi
---
apiVersion: batch/v1
kind: Job
metadata:
  name: test-custom-hosts
spec:
  template:
    spec:
      containers:
      - name: test
        image: nicolaka/netshoot
        command:
        - sh
        - /scripts/test.sh
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: hosts-test
      restartPolicy: Never
```

Run tests:

```bash
# Deploy test job
kubectl apply -f hosts-test.yaml

# Check results
kubectl logs job/test-custom-hosts

# Clean up
kubectl delete job test-custom-hosts
```

## Monitoring Host Resolution

Track which hosts are being queried:

```bash
# Enable logging in CoreDNS
kubectl edit configmap coredns -n kube-system
```

Add log directive:

```yaml
.:53 {
    log  # Enable query logging
    errors
    health

    hosts /etc/coredns/customhosts {
        fallthrough
    }

    # ... rest of configuration
}
```

View query logs:

```bash
# Stream logs
kubectl logs -n kube-system -l k8s-app=kube-dns -f

# Filter for custom host queries
kubectl logs -n kube-system -l k8s-app=kube-dns | grep "legacy-db.company.com"
```

## Security Considerations

Be careful with custom host entries:

```yaml
# Example: Override security-sensitive domains (DON'T DO THIS)
# BAD: Don't redirect security domains maliciously
# hosts {
#     192.168.1.1 bank.com
#     192.168.1.1 secure-site.com
# }
```

Best practices:

1. Document all custom host entries
2. Restrict access to CoreDNS ConfigMap
3. Use RBAC to control who can modify DNS
4. Audit changes to DNS configuration
5. Test thoroughly before production
6. Monitor for unexpected resolution changes

## Troubleshooting

**Issue: Custom hosts not resolving**

Check hosts plugin configuration:

```bash
kubectl get configmap coredns -n kube-system -o yaml | grep -A10 hosts
```

Verify ConfigMap is mounted:

```bash
kubectl describe deployment coredns -n kube-system | grep -A5 Mounts
```

**Issue: Hosts file not reloading**

Check reload interval:

```yaml
hosts /etc/coredns/customhosts {
    reload 30s  # Ensure this is set
    fallthrough
}
```

**Issue: Hosts overriding cluster services**

Ensure proper fallthrough:

```yaml
hosts {
    10.0.1.100 legacy-db.company.com
    fallthrough  # Critical for other plugins to work
}
```

## Best Practices

Follow these guidelines for production use:

1. Use external ConfigMap for hosts file
2. Enable reload for dynamic updates
3. Always include fallthrough directive
4. Document each custom entry with comments
5. Test in non-production first
6. Monitor query logs after changes
7. Version control hosts configuration
8. Implement change approval process
9. Regular audit of custom entries
10. Remove obsolete entries promptly

The CoreDNS hosts plugin provides a powerful mechanism for injecting custom DNS entries across your Kubernetes cluster. By understanding how to configure, manage, and troubleshoot the hosts plugin, you can support legacy systems, implement testing scenarios, and handle special routing requirements without modifying individual pod configurations.

For more DNS customization patterns, explore our guides on [CoreDNS rewrite plugin](https://oneuptime.com/blog/post/2026-02-09-coredns-rewrite-plugin-transform/view) and [custom DNS configuration](https://oneuptime.com/blog/post/2026-02-09-custom-dns-resolvers-pod-dnsconfig/view).
