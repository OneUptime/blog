# How to Use CoreDNS Rewrite Plugin to Transform DNS Queries for External Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, DNS, Networking

Description: Learn how to configure the CoreDNS rewrite plugin to transform DNS queries and responses for external services, enabling flexible service routing and legacy system integration in Kubernetes clusters.

---

The CoreDNS rewrite plugin provides powerful DNS query and response manipulation capabilities that let you transform hostnames, redirect queries, and integrate legacy systems without changing application code. This becomes essential when migrating services, implementing service aliases, or routing traffic through intermediate proxies.

This guide covers practical rewrite plugin configurations that solve real-world DNS transformation challenges in Kubernetes environments.

## Understanding DNS Rewriting

DNS rewriting modifies queries or responses as they pass through CoreDNS. You can transform:

- Query names (QName rewriting)
- Response data (answer rewriting)
- Request types (A to AAAA, etc.)
- TTL values

Common use cases include:

- Creating service aliases without CNAME records
- Redirecting old service names to new endpoints
- Routing traffic through proxies or gateways
- Integrating legacy systems with hardcoded hostnames
- Implementing canary deployments via DNS

## Basic Rewrite Configuration

Edit the CoreDNS ConfigMap to add rewrite rules:

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

        # Simple name rewrite
        rewrite name legacy-api.company.com api-service.production.svc.cluster.local

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

This rewrites queries for `legacy-api.company.com` to resolve `api-service.production.svc.cluster.local` instead.

Apply the configuration:

```bash
# Apply ConfigMap
kubectl apply -f coredns-config.yaml

# Restart CoreDNS
kubectl rollout restart deployment coredns -n kube-system
```

## Pattern-Based Rewriting with Regular Expressions

Use regex patterns for flexible transformations:

```yaml
.:53 {
    errors
    health
    ready

    # Rewrite api-v1.service.com to api-service-v1.production.svc.cluster.local
    rewrite name regex (.+)-v([0-9]+)\.service\.com {1}-service-v{2}.production.svc.cluster.local

    # Rewrite region-specific endpoints
    rewrite name regex (.+)\.us-east\.company\.com {1}.us-east-region.svc.cluster.local
    rewrite name regex (.+)\.eu-west\.company\.com {1}.eu-west-region.svc.cluster.local

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
```

These patterns extract parts of the hostname and reconstruct them in a new format.

## Rewriting External Service References

For services hosted outside Kubernetes that need internal routing:

```yaml
.:53 {
    errors
    health
    ready

    # Rewrite external database endpoint to internal proxy
    rewrite name database.external.com database-proxy.infrastructure.svc.cluster.local

    # Rewrite external API to API gateway
    rewrite name api.partner.com api-gateway.gateway.svc.cluster.local

    # Rewrite legacy monitoring endpoint
    rewrite name monitor.old-domain.com prometheus-server.monitoring.svc.cluster.local

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
```

This allows applications to use external hostnames while routing through cluster services.

## Conditional Rewriting Based on Query Type

Apply rewrites only to specific query types:

```yaml
.:53 {
    errors
    health
    ready

    # Rewrite only A record queries
    rewrite name type A ipv4-api.company.com api-service.production.svc.cluster.local

    # Rewrite only AAAA record queries
    rewrite name type AAAA ipv6-api.company.com api-service-v6.production.svc.cluster.local

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
```

## Answer Section Rewriting

Rewrite responses instead of queries:

```yaml
.:53 {
    errors
    health
    ready

    # Forward to external DNS
    forward . 8.8.8.8 8.8.4.4

    # Rewrite response addresses
    rewrite answer name external.company.com internal-proxy.svc.cluster.local

    # Rewrite TTL in responses
    rewrite ttl 300

    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }

    prometheus :9153
    cache 30
    loop
    reload
}
```

This modifies DNS responses from upstream servers before returning to clients.

## Multi-Environment Service Routing

Implement environment-specific routing with rewrites:

```yaml
.:53 {
    errors
    health
    ready

    # Development environment rewrites
    rewrite name suffix .dev.company.com .dev.svc.cluster.local
    rewrite name regex (.+)\.dev\.company\.com {1}.dev.svc.cluster.local

    # Staging environment rewrites
    rewrite name suffix .staging.company.com .staging.svc.cluster.local
    rewrite name regex (.+)\.staging\.company\.com {1}.staging.svc.cluster.local

    # Production environment rewrites
    rewrite name suffix .prod.company.com .production.svc.cluster.local
    rewrite name regex (.+)\.prod\.company\.com {1}.production.svc.cluster.local

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
```

Applications use consistent naming (e.g., api.prod.company.com) while DNS transparently routes to the correct namespace.

## Implementing Canary Deployments with Rewrites

Route a percentage of traffic to canary versions:

```yaml
.:53 {
    errors
    health
    ready

    # Route 10% of api queries to canary
    rewrite stop {
        name regex ^api\.company\.com$ api-canary.production.svc.cluster.local
        answer auto
    }

    # Default routing for api
    rewrite name api.company.com api-stable.production.svc.cluster.local

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
```

Note: For true percentage-based routing, combine with service mesh features or use weighted DNS responses.

## Rewriting for Legacy Application Integration

Support applications with hardcoded hostnames:

```yaml
.:53 {
    errors
    health
    ready

    # Legacy application expects specific hostname
    rewrite name legacy-db.mainframe.local postgres-service.databases.svc.cluster.local

    # Old LDAP server reference
    rewrite name ldap.corp.internal openldap.authentication.svc.cluster.local

    # Legacy cache server
    rewrite name cache.internal.local redis-master.cache.svc.cluster.local

    # Old message queue
    rewrite name mq.internal.local rabbitmq.messaging.svc.cluster.local

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
```

## Advanced Rewrite with Stop Directive

The `stop` directive prevents further rewrite processing:

```yaml
.:53 {
    errors
    health
    ready

    # Apply this rewrite and stop processing
    rewrite stop {
        name regex ^critical-api\.company\.com$ critical-api.production.svc.cluster.local
        answer auto
    }

    # This rule won't apply to critical-api.company.com
    rewrite name suffix .company.com .svc.cluster.local

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
```

Use `stop` when you need precise control over rewrite precedence.

## Testing Rewrite Rules

Create a test suite for your rewrite configurations:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-rewrite-tests
data:
  test-rewrites.sh: |
    #!/bin/bash

    # Test legacy API rewrite
    echo "Testing legacy-api.company.com rewrite..."
    result=$(nslookup legacy-api.company.com | grep Address)
    echo "Result: $result"

    # Test pattern-based rewrite
    echo "Testing api-v1.service.com rewrite..."
    result=$(nslookup api-v1.service.com | grep Address)
    echo "Result: $result"

    # Test region-specific rewrite
    echo "Testing service.us-east.company.com rewrite..."
    result=$(nslookup service.us-east.company.com | grep Address)
    echo "Result: $result"

    # Test environment routing
    echo "Testing api.prod.company.com rewrite..."
    result=$(nslookup api.prod.company.com | grep Address)
    echo "Result: $result"
---
apiVersion: v1
kind: Pod
metadata:
  name: dns-rewrite-test
spec:
  containers:
  - name: test
    image: nicolaka/netshoot
    command:
    - sh
    - /scripts/test-rewrites.sh
    volumeMounts:
    - name: scripts
      mountPath: /scripts
  volumes:
  - name: scripts
    configMap:
      name: dns-rewrite-tests
  restartPolicy: Never
```

Run the tests:

```bash
# Deploy test pod
kubectl apply -f dns-rewrite-tests.yaml

# Check results
kubectl logs dns-rewrite-test

# Clean up
kubectl delete pod dns-rewrite-test
```

## Monitoring Rewrite Operations

Enable logging to track rewrites:

```yaml
.:53 {
    log  # Enable query logging
    errors
    health
    ready

    rewrite name legacy-api.company.com api-service.production.svc.cluster.local

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
```

View rewrite activity:

```bash
# Stream CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns -f

# Filter for rewrite operations
kubectl logs -n kube-system -l k8s-app=kube-dns | grep rewrite
```

## Troubleshooting Rewrite Issues

**Issue: Rewrite not applying**

Check rule ordering:

```yaml
# Rules are processed in order
# More specific rules should come first
rewrite name exact-match.company.com service1.svc.cluster.local
rewrite name suffix .company.com .svc.cluster.local
```

**Issue: Regex pattern not matching**

Test your regex patterns:

```bash
# Use a test pod to verify
kubectl run test --image=nicolaka/netshoot --rm -it -- bash

# Try the query
nslookup your-pattern.company.com
```

**Issue: Rewrite causing loops**

Use the loop plugin to detect and prevent loops:

```yaml
.:53 {
    errors
    loop  # Detects DNS loops
    rewrite name api.company.com api-service.svc.cluster.local
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
    }
    forward . /etc/resolv.conf
    cache 30
}
```

## Best Practices

Follow these guidelines for production rewrite configurations:

1. Document all rewrite rules with comments
2. Test rewrites thoroughly before production deployment
3. Use specific patterns over broad wildcards when possible
4. Monitor DNS query logs after deploying new rewrites
5. Keep rewrite rules as simple as possible
6. Use `stop` directive to optimize rule processing
7. Version control your CoreDNS configuration
8. Create automated tests for critical rewrite rules

The CoreDNS rewrite plugin transforms how your applications interact with DNS without requiring code changes. By strategically rewriting queries and responses, you can integrate legacy systems, implement sophisticated routing patterns, and maintain flexibility as your infrastructure evolves.

For more DNS configuration patterns, see our guides on [CoreDNS forward zones](https://oneuptime.com/blog/post/2026-02-09-coredns-custom-forward-zones/view) and [custom DNS resolvers](https://oneuptime.com/blog/post/2026-02-09-custom-dns-resolvers-pod-dnsconfig/view).
