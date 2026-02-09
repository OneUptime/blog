# How to Configure CoreDNS Custom Forward Zones for Split-Horizon DNS in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, DNS, Networking

Description: Learn how to configure CoreDNS custom forward zones to implement split-horizon DNS in Kubernetes clusters, enabling different DNS responses for internal and external clients with zone-specific forwarding rules.

---

Split-horizon DNS is a critical networking pattern that allows you to return different DNS responses depending on where queries originate. In Kubernetes environments, you often need internal services to resolve to cluster IPs while external clients receive public IPs. CoreDNS forward zones provide the flexibility to implement this pattern effectively.

This guide walks you through configuring custom forward zones in CoreDNS to create sophisticated split-horizon DNS configurations that meet enterprise networking requirements.

## Understanding CoreDNS Forward Zones

Forward zones in CoreDNS allow you to selectively forward DNS queries for specific domains to designated upstream DNS servers. This becomes powerful when you need different resolution behavior for different namespaces or domain patterns.

The forward plugin supports multiple upstream servers, health checking, and various forwarding strategies. Unlike blanket forwarding of all queries, zone-specific forwarding gives you granular control over DNS resolution paths.

## Basic Forward Zone Configuration

Start by examining your existing CoreDNS configuration:

```bash
# View current CoreDNS ConfigMap
kubectl get configmap coredns -n kube-system -o yaml
```

Here is a basic forward zone configuration:

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

    # Custom forward zone for internal domain
    internal.company.com:53 {
        errors
        cache 30
        forward . 10.0.1.53 10.0.1.54 {
            policy sequential
            health_check 5s
        }
    }

    # Forward zone for specific partner domain
    partner.external.com:53 {
        errors
        cache 60
        forward . 8.8.8.8 8.8.4.4
    }
```

This configuration creates three DNS zones with different forwarding behaviors.

## Implementing Split-Horizon DNS Architecture

For true split-horizon DNS, configure different resolution paths based on query origin. Here is an advanced configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    # Default zone for cluster-internal queries
    .:53 {
        errors
        health {
           lameduck 5s
        }
        ready

        # Handle cluster-local DNS first
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }

        # Forward external queries to public DNS
        forward . 8.8.8.8 8.8.4.4 {
            prefer_udp
            max_concurrent 1000
        }

        cache 30
        loop
        reload
        loadbalance
        prometheus :9153
    }

    # Private zone for internal services
    private.company.com:53 {
        errors
        log

        # Forward to internal DNS servers
        forward . 10.0.1.10 10.0.1.11 {
            policy round_robin
            health_check 5s
            force_tcp
        }

        cache 300
    }

    # Development environment zone
    dev.company.com:53 {
        errors
        forward . 10.10.0.53 {
            expire 10s
            health_check 2s
        }
        cache 60
    }

    # Production services zone
    prod.company.com:53 {
        errors
        forward . 10.20.0.53 10.20.0.54 {
            policy sequential
            max_fails 3
            health_check 10s
        }
        cache 600
    }
```

This setup routes queries for different domains to environment-specific DNS servers.

## Configuring Zone-Specific Policies

The forward plugin supports multiple forwarding policies that determine how upstream servers are selected:

```yaml
# Round-robin for load distribution
forward . 10.0.1.10 10.0.1.11 {
    policy round_robin
}

# Sequential for failover behavior
forward . 10.0.1.10 10.0.1.11 {
    policy sequential
}

# Random selection
forward . 10.0.1.10 10.0.1.11 {
    policy random
}
```

For production environments, use sequential policy with health checks:

```yaml
api.internal.com:53 {
    errors
    log

    forward . 10.0.1.10 10.0.1.11 10.0.1.12 {
        policy sequential
        max_fails 2
        expire 10s
        health_check 5s
    }

    cache 120
}
```

This configuration attempts the first server, fails over to the second if unavailable, and marks servers as down after two consecutive failures.

## Implementing Conditional Forwarding with Wildcards

Use wildcards for flexible zone matching:

```yaml
# Match all subdomains of internal.company.com
*.internal.company.com:53 {
    errors
    forward . 10.0.1.53
    cache 60
}

# Match specific service patterns
*.svc.cluster.local:53 {
    kubernetes cluster.local {
        pods insecure
    }
    cache 30
}
```

## Advanced Split-Horizon with Multiple Networks

For multi-network scenarios, configure different zones per network segment:

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
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
        }
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
    }

    # DMZ network zone
    dmz.company.com:53 {
        errors
        forward . 172.16.0.53 172.16.0.54 {
            policy round_robin
            health_check 5s
        }
        cache 180
    }

    # Management network zone
    mgmt.company.com:53 {
        errors
        forward . 192.168.0.53 {
            force_tcp
            health_check 10s
        }
        cache 300
    }

    # Guest network (restricted)
    guest.company.com:53 {
        errors
        forward . 10.99.0.53
        cache 30
    }
```

## Testing Forward Zone Configuration

After applying your configuration, verify zone forwarding works correctly:

```bash
# Apply the ConfigMap
kubectl apply -f coredns-config.yaml

# Restart CoreDNS pods
kubectl rollout restart deployment coredns -n kube-system

# Deploy a test pod
kubectl run test-dns --image=busybox:1.28 --rm -it -- sh

# Inside the test pod, query different zones
nslookup api.private.company.com
nslookup service.dev.company.com
nslookup external.partner.external.com
```

Check CoreDNS logs to verify forwarding behavior:

```bash
# View CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100

# Look for forward plugin entries
kubectl logs -n kube-system -l k8s-app=kube-dns | grep forward
```

## Monitoring Forward Zone Health

Create a monitoring deployment to track zone resolution:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-monitor
data:
  check-zones.sh: |
    #!/bin/sh

    # Test each configured zone
    ZONES="private.company.com dev.company.com prod.company.com"

    for zone in $ZONES; do
        echo "Testing zone: $zone"
        nslookup test.$zone || echo "Failed: $zone"
    done
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dns-zone-monitor
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: monitor
            image: busybox:1.28
            command:
            - sh
            - /scripts/check-zones.sh
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: dns-monitor
          restartPolicy: OnFailure
```

## Troubleshooting Forward Zones

Common issues and solutions:

**Issue: Queries not forwarding to specified servers**

Enable logging to debug:

```yaml
private.company.com:53 {
    log
    errors
    forward . 10.0.1.53 {
        health_check 5s
    }
    cache 60
}
```

**Issue: Upstream server health check failures**

Adjust health check parameters:

```yaml
forward . 10.0.1.53 {
    max_fails 5
    expire 30s
    health_check 10s
}
```

**Issue: Zone conflicts**

Ensure more specific zones are defined before general ones in the Corefile. CoreDNS matches zones in order of specificity.

## Best Practices

Follow these guidelines for production deployments:

1. Always configure health checks for upstream servers
2. Use appropriate cache TTLs based on record volatility
3. Implement monitoring for zone resolution failures
4. Document your zone forwarding topology
5. Test failover behavior before production deployment
6. Use sequential policy for critical zones requiring failover
7. Enable logging during initial configuration and troubleshooting

Forward zones in CoreDNS provide the foundation for sophisticated DNS architectures in Kubernetes. By carefully configuring zone-specific forwarding rules, you can implement split-horizon DNS that meets complex enterprise networking requirements while maintaining the flexibility to adapt as your infrastructure evolves.

For more DNS configuration patterns, see our guides on [CoreDNS cache optimization](https://oneuptime.com/blog/post/coredns-cache-settings-high-qps/view) and [NodeLocal DNSCache implementation](https://oneuptime.com/blog/post/nodelocal-dnscache-reduce-coredns-load/view).
