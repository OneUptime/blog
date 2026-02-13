# How to Implement CoreDNS Federation Plugin for Multi-Cluster DNS Resolution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, Multi-Cluster, DNS

Description: Learn how to configure the CoreDNS federation plugin to enable DNS resolution across multiple Kubernetes clusters, facilitating service discovery and communication in multi-cluster architectures.

---

Multi-cluster Kubernetes deployments require cross-cluster service discovery for distributed applications. The CoreDNS federation plugin enables DNS-based service discovery across clusters by allowing queries for services in remote clusters to resolve correctly. This creates a unified DNS namespace spanning multiple Kubernetes environments.

This guide shows you how to implement CoreDNS federation for multi-cluster DNS resolution.

## Understanding DNS Federation

DNS federation allows services in one cluster to discover and communicate with services in other clusters using DNS names. Federation provides:

- Cross-cluster service discovery
- Unified DNS namespace across clusters
- Location transparency for distributed applications
- Support for multi-region deployments
- Failover and disaster recovery capabilities

Common use cases:

- Multi-region application deployments
- Hybrid cloud architectures
- Blue-green deployments across clusters
- Database replication across data centers
- Cross-cluster service mesh integration

## Federation Architecture

A federated DNS setup typically includes:

1. **Home clusters**: Where services run
2. **Federation DNS**: Centralized or distributed DNS for federation
3. **CoreDNS configuration**: Routes federation queries appropriately
4. **Service exports**: Services made available to other clusters

Basic federation pattern:

```
Cluster A (us-east) → Federation DNS → Cluster B (us-west)
Query: api.cluster-b.federation.com
Response: 10.20.30.40 (service IP in Cluster B)
```

## Basic Federation Configuration

Configure CoreDNS to support federated queries:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    # Local cluster zone
    cluster.local:53 {
        errors
        cache 30
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
    }

    # Federation zone for remote clusters
    federation.svc.cluster.local:53 {
        errors
        cache 30

        # Forward to federation DNS servers
        forward . 10.100.0.10 10.100.0.11 {
            policy round_robin
        }
    }

    # Default zone
    .:53 {
        errors
        health
        ready
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

This configuration routes queries for `federation.svc.cluster.local` to dedicated federation DNS servers.

## Multi-Cluster Service Discovery Pattern

Implement standard naming convention:

```
<service>.<namespace>.<cluster-id>.federation.svc.cluster.local
```

Example service mappings:

```
api.production.us-east-1.federation.svc.cluster.local
api.production.us-west-2.federation.svc.cluster.local
api.production.eu-west-1.federation.svc.cluster.local
```

Configure CoreDNS per cluster:

**Cluster us-east-1:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    cluster.local:53 {
        errors
        cache 30
        kubernetes cluster.local {
           pods insecure
           ttl 30
        }
    }

    # Federation zone
    federation.svc.cluster.local:53 {
        errors
        cache 60

        # Rewrite local cluster queries
        rewrite name regex (.+)\.(.+)\.us-east-1\.federation\.svc\.cluster\.local {1}.{2}.svc.cluster.local

        # Try local cluster first
        kubernetes cluster.local {
           pods insecure
           fallthrough
        }

        # Forward other federation queries to central DNS
        forward . 10.100.0.10 10.100.0.11
    }

    .:53 {
        errors
        health
        kubernetes cluster.local {
           pods insecure
           fallthrough
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
    }
```

**Cluster us-west-2:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    cluster.local:53 {
        errors
        cache 30
        kubernetes cluster.local {
           pods insecure
           ttl 30
        }
    }

    federation.svc.cluster.local:53 {
        errors
        cache 60

        # Rewrite local cluster queries
        rewrite name regex (.+)\.(.+)\.us-west-2\.federation\.svc\.cluster\.local {1}.{2}.svc.cluster.local

        kubernetes cluster.local {
           pods insecure
           fallthrough
        }

        forward . 10.100.0.10 10.100.0.11
    }

    .:53 {
        errors
        health
        kubernetes cluster.local {
           pods insecure
           fallthrough
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
    }
```

## External Federation DNS Server

Set up a central federation DNS using CoreDNS with etcd backend:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: federation-coredns
  namespace: federation-system
data:
  Corefile: |
    federation.svc.cluster.local:53 {
        errors
        log

        # Store federation records in etcd
        etcd federation.svc.cluster.local {
            path /coredns
            endpoint http://etcd-cluster:2379
        }

        cache 120
        loadbalance
        prometheus :9153
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: federation-dns
  namespace: federation-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: federation-dns
  template:
    metadata:
      labels:
        app: federation-dns
    spec:
      containers:
      - name: coredns
        image: coredns/coredns:1.10.1
        args:
        - -conf
        - /etc/coredns/Corefile
        volumeMounts:
        - name: config
          mountPath: /etc/coredns
        ports:
        - containerPort: 53
          name: dns
          protocol: UDP
        - containerPort: 53
          name: dns-tcp
          protocol: TCP
        - containerPort: 9153
          name: metrics
          protocol: TCP
      volumes:
      - name: config
        configMap:
          name: federation-coredns
---
apiVersion: v1
kind: Service
metadata:
  name: federation-dns
  namespace: federation-system
spec:
  type: LoadBalancer
  selector:
    app: federation-dns
  ports:
  - name: dns
    port: 53
    protocol: UDP
  - name: dns-tcp
    port: 53
    protocol: TCP
  - name: metrics
    port: 9153
    protocol: TCP
```

## Registering Services with Federation

Create a controller to register services in federation DNS:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: federation-register
data:
  register.sh: |
    #!/bin/bash

    CLUSTER_ID="us-east-1"
    ETCD_ENDPOINT="http://etcd-cluster.federation-system:2379"
    FEDERATION_ZONE="federation.svc.cluster.local"

    # Watch for service changes
    kubectl get svc --all-namespaces -w --output-watch-events | while read event type namespace name rest; do
        if [[ "$type" == "Service" ]]; then
            # Get service cluster IP
            CLUSTER_IP=$(kubectl get svc $name -n $namespace -o jsonpath='{.spec.clusterIP}')

            if [[ -n "$CLUSTER_IP" && "$CLUSTER_IP" != "None" ]]; then
                # Register in etcd
                KEY="/coredns/${FEDERATION_ZONE}/${CLUSTER_ID}/${namespace}/${name}"
                VALUE="{\"host\": \"$CLUSTER_IP\"}"

                echo "Registering: $KEY -> $VALUE"
                curl -X PUT "${ETCD_ENDPOINT}/v2/keys${KEY}" -d value="$VALUE"
            fi
        fi
    done
```

## Testing Federation Setup

Create cross-cluster communication test:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: federation-test
data:
  test.sh: |
    #!/bin/bash

    echo "Testing federation DNS..."

    # Test local service
    echo "Test 1: Local service"
    nslookup api.production.svc.cluster.local

    # Test service in remote cluster
    echo "Test 2: Remote cluster service (us-west-2)"
    nslookup api.production.us-west-2.federation.svc.cluster.local

    # Test service in another remote cluster
    echo "Test 3: Remote cluster service (eu-west-1)"
    nslookup api.production.eu-west-1.federation.svc.cluster.local

    # Test connectivity
    echo "Test 4: HTTP connectivity to remote service"
    REMOTE_IP=$(nslookup api.production.us-west-2.federation.svc.cluster.local | grep Address | tail -1 | awk '{print $2}')
    curl -v http://$REMOTE_IP:8080/health || echo "Connection failed"
---
apiVersion: batch/v1
kind: Job
metadata:
  name: test-federation
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
          name: federation-test
      restartPolicy: Never
```

## Application Integration

Update applications to use federated service names:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: app
        image: frontend:latest
        env:
        # Local API service
        - name: API_SERVICE_LOCAL
          value: "api.production.svc.cluster.local"
        # Federated API services for failover
        - name: API_SERVICE_PRIMARY
          value: "api.production.us-east-1.federation.svc.cluster.local"
        - name: API_SERVICE_SECONDARY
          value: "api.production.us-west-2.federation.svc.cluster.local"
        - name: API_SERVICE_TERTIARY
          value: "api.production.eu-west-1.federation.svc.cluster.local"
```

## Monitoring Federation Health

Track federation DNS performance:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: federation-monitor
data:
  monitor.sh: |
    #!/bin/bash

    CLUSTERS="us-east-1 us-west-2 eu-west-1"
    SERVICE="api.production"

    while true; do
        echo "=== $(date) ==="

        for cluster in $CLUSTERS; do
            fqdn="${SERVICE}.${cluster}.federation.svc.cluster.local"
            echo "Checking: $fqdn"

            start=$(date +%s%N)
            result=$(nslookup $fqdn 2>&1)
            end=$(date +%s%N)

            duration=$((($end - $start) / 1000000))

            if echo "$result" | grep -q "Address:"; then
                ip=$(echo "$result" | grep Address | tail -1 | awk '{print $2}')
                echo "  Status: OK ($ip)"
                echo "  Latency: ${duration}ms"
            else
                echo "  Status: FAILED"
            fi
        done

        echo ""
        sleep 60
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: federation-monitor
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
          name: federation-monitor
```

## Best Practices

Follow these guidelines for federation:

1. Use consistent naming conventions across clusters
2. Implement health checks for federated services
3. Monitor federation DNS performance
4. Cache federation queries appropriately
5. Document cluster IDs and federation zones
6. Test failover scenarios regularly
7. Consider network latency between clusters
8. Implement gradual rollout for federation changes
9. Use service mesh for advanced traffic management
10. Plan for federation DNS high availability

DNS federation enables sophisticated multi-cluster architectures in Kubernetes. By implementing CoreDNS federation with proper naming conventions and monitoring, you create a unified service discovery layer that spans multiple clusters and regions, enabling truly distributed applications.

For related multi-cluster topics, explore our guides on [CoreDNS forward zones](https://oneuptime.com/blog/post/2026-02-09-coredns-custom-forward-zones/view) and [cross-cluster networking](https://oneuptime.com/blog/post/2026-02-09-cross-cluster-dns-resolution/view).
