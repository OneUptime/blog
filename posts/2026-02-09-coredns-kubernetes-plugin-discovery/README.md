# How to Use CoreDNS Kubernetes Plugin for Custom Service Discovery Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, Service Discovery, DNS

Description: Learn how to configure the CoreDNS kubernetes plugin for advanced service discovery patterns, enabling custom endpoint resolution, pod-based discovery, and flexible DNS naming schemes in Kubernetes clusters.

---

The CoreDNS kubernetes plugin provides the foundation for service discovery in Kubernetes clusters. Beyond basic service resolution, this plugin supports advanced patterns including pod DNS records, endpoint-based discovery, and custom namespace configurations that enable sophisticated service architectures.

This guide explores advanced kubernetes plugin configurations for custom service discovery requirements.

## Understanding the Kubernetes Plugin

The kubernetes plugin watches Kubernetes API for services and endpoints, creating DNS records dynamically. It supports:

- Service A/AAAA records
- Pod A/AAAA records
- SRV records for named ports
- Headless service endpoint enumeration
- PTR records for reverse DNS
- Custom TTL values
- Namespace-based resolution

Basic configuration:

```yaml
kubernetes cluster.local in-addr.arpa ip6.arpa {
    pods insecure
    fallthrough in-addr.arpa ip6.arpa
    ttl 30
}
```

## Advanced Kubernetes Plugin Configuration

Full plugin configuration with all options:

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
            # Pod resolution mode: insecure, verified, or disabled
            pods verified

            # Namespaces to watch (empty = all namespaces)
            namespaces production staging

            # API server endpoint
            endpoint https://kubernetes.default.svc.cluster.local:443

            # TTL for records
            ttl 30

            # Fall through for reverse DNS queries
            fallthrough in-addr.arpa ip6.arpa

            # Ignore empty services (no endpoints)
            ignore empty_service

            # Enable endpoint pod names
            endpoint_pod_names
        }

        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
```

## Pod-Based Service Discovery

Enable pod IP discovery:

```yaml
kubernetes cluster.local {
    pods verified  # Verify pod IP matches DNS query source
    endpoint_pod_names
    ttl 30
}
```

Pod DNS naming patterns:

```
# Format: pod-ip-address.namespace.pod.cluster.local
10-244-1-5.default.pod.cluster.local

# StatefulSet pods: pod-name.service-name.namespace.svc.cluster.local
web-0.nginx.default.svc.cluster.local
web-1.nginx.default.svc.cluster.local
```

Test pod resolution:

```bash
# Deploy test pod
kubectl run test --image=nicolaka/netshoot --rm -it -- bash

# Get pod IP
POD_IP=$(hostname -i)

# Convert IP to DNS format (replace dots with dashes)
DNS_IP=$(echo $POD_IP | tr '.' '-')

# Query pod DNS record
nslookup ${DNS_IP}.default.pod.cluster.local
```

## SRV Records for Service Discovery

Enable SRV record queries for named ports:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
    app: web
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: metrics
    port: 9090
    targetPort: 9090
```

Query SRV records:

```bash
# Format: _port-name._protocol.service-name.namespace.svc.cluster.local
dig SRV _http._tcp.web-service.default.svc.cluster.local
dig SRV _metrics._tcp.web-service.default.svc.cluster.local
```

Response includes:

```
_http._tcp.web-service.default.svc.cluster.local. 30 IN SRV 0 100 80 web-service.default.svc.cluster.local.
```

## Namespace-Scoped Service Discovery

Limit DNS resolution to specific namespaces:

```yaml
# Production CoreDNS - only resolves production namespace
kubernetes cluster.local {
    pods insecure
    namespaces production
    ttl 30
}
```

Or configure multiple namespaces:

```yaml
kubernetes cluster.local {
    pods insecure
    namespaces production staging qa
    ttl 30
}
```

This prevents pods from discovering services in unauthorized namespaces.

## Custom Endpoint Discovery

Configure endpoint-based discovery for direct pod access:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: database
spec:
  clusterIP: None  # Headless service
  selector:
    app: postgres
  ports:
  - port: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        ports:
        - containerPort: 5432
```

Each pod gets a stable DNS name:

```
postgres-0.database.default.svc.cluster.local
postgres-1.database.default.svc.cluster.local
postgres-2.database.default.svc.cluster.local
```

Query all endpoints:

```bash
# Returns all pod IPs
dig database.default.svc.cluster.local

# Query specific pod
dig postgres-0.database.default.svc.cluster.local
```

## Implementing Multi-Cluster Service Discovery

Configure cross-cluster service discovery:

```yaml
# Cluster A CoreDNS
kubernetes cluster.local {
    pods insecure
    endpoint https://cluster-a-api:443
    ttl 30
}

# Federation zone for Cluster B
kubernetes cluster-b.fed.local {
    pods disabled
    endpoint https://cluster-b-api:443
    ttl 60
}
```

Services in Cluster B accessible as:

```
service-name.namespace.svc.cluster-b.fed.local
```

## Custom TTL Configuration

Set different TTLs for different query patterns:

```yaml
kubernetes cluster.local {
    pods verified
    ttl 5  # Short TTL for rapid updates

    # Override TTL for specific zones
    endpoint_pod_names
}
```

Or use zone-specific configuration:

```yaml
# Stable services - longer TTL
stable.cluster.local:53 {
    kubernetes stable.cluster.local {
        namespaces production
        ttl 300
    }
}

# Dynamic services - shorter TTL
dynamic.cluster.local:53 {
    kubernetes dynamic.cluster.local {
        namespaces dev staging
        ttl 10
    }
}
```

## Implementing Service Aliases

Create service aliases using multiple DNS names:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-v1
  annotations:
    coredns.io/hostname: api.company.local,api-legacy.company.local
spec:
  selector:
    app: api
    version: v1
  ports:
  - port: 80
```

Configure CoreDNS to honor annotations:

```yaml
kubernetes cluster.local {
    pods insecure
    ttl 30
}

# Add template plugin for custom names
template IN A company.local {
    match "^api\\.company\\.local\\.$"
    answer "{{ .Name }} 60 IN A 10.96.0.50"
    fallthrough
}
```

## Monitoring Service Discovery

Track DNS queries and service discovery patterns:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: service-discovery-monitor
data:
  monitor.sh: |
    #!/bin/bash

    SERVICES="kubernetes.default web-service.production database.default"

    while true; do
        echo "=== $(date) ==="

        for svc in $SERVICES; do
            echo "Service: $svc"

            # Query service
            result=$(nslookup ${svc}.svc.cluster.local 2>&1)

            if echo "$result" | grep -q "Address:"; then
                ips=$(echo "$result" | grep Address | tail -n +2 | awk '{print $2}')
                count=$(echo "$ips" | wc -l)
                echo "  Status: OK"
                echo "  Endpoints: $count"
                echo "$ips" | sed 's/^/    /'
            else
                echo "  Status: FAILED"
            fi

            echo ""
        done

        sleep 60
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-discovery-monitor
spec:
  replicas: 1
  selector:
    matchLabels:
      app: monitor
  template:
    metadata:
      labels:
        app: monitor
    spec:
      containers:
      - name: monitor
        image: nicolaka/netshoot
        command:
        - sh
        - /scripts/monitor.sh
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: service-discovery-monitor
```

## Testing Advanced Discovery Patterns

Comprehensive discovery test:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: discovery-test
data:
  test.sh: |
    #!/bin/bash

    echo "Testing Kubernetes DNS Service Discovery"

    # Test 1: Basic service resolution
    echo "Test 1: Service resolution"
    nslookup kubernetes.default.svc.cluster.local

    # Test 2: Pod resolution
    echo "Test 2: Pod resolution"
    POD_IP=$(hostname -i | tr '.' '-')
    nslookup ${POD_IP}.default.pod.cluster.local

    # Test 3: SRV records
    echo "Test 3: SRV records"
    dig SRV _https._tcp.kubernetes.default.svc.cluster.local

    # Test 4: Headless service (multiple IPs)
    echo "Test 4: Headless service endpoints"
    dig database.default.svc.cluster.local

    # Test 5: StatefulSet pod
    echo "Test 5: StatefulSet pod DNS"
    nslookup postgres-0.database.default.svc.cluster.local

    # Test 6: Reverse DNS
    echo "Test 6: Reverse DNS"
    dig -x 10.96.0.1

    echo "Tests complete"
---
apiVersion: batch/v1
kind: Job
metadata:
  name: test-discovery
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
          name: discovery-test
      restartPolicy: Never
```

## Best Practices

Follow these guidelines for kubernetes plugin configuration:

1. Use verified pod mode for security
2. Set appropriate TTL values for your update frequency
3. Limit namespace scope when possible for security
4. Enable endpoint_pod_names for StatefulSets
5. Monitor DNS query patterns for optimization
6. Test service discovery thoroughly after changes
7. Document custom discovery patterns
8. Use headless services for direct pod access
9. Implement proper RBAC for CoreDNS service account
10. Regular audit of DNS resolution patterns

The CoreDNS kubernetes plugin provides flexible service discovery capabilities that extend far beyond basic service resolution. By understanding advanced configuration options, you can implement sophisticated discovery patterns that support complex application architectures, multi-cluster setups, and custom naming schemes in Kubernetes environments.

For more service discovery patterns, explore our guides on [headless services](https://oneuptime.com/blog/post/headless-services-pod-ip-discovery/view) and [StatefulSet DNS](https://oneuptime.com/blog/post/dns-service-discovery-statefulset/view).
