# How to Implement DNS-Based Service Discovery for StatefulSet Pods with Stable Network IDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, StatefulSet, Service Discovery

Description: Learn how to implement DNS-based service discovery for StatefulSet pods using stable network identities, enabling reliable peer discovery and communication for stateful applications like databases and distributed systems.

---

StatefulSets provide stable network identities for pods through predictable DNS names. Unlike regular deployments where pods get random names, StatefulSet pods maintain consistent hostnames across restarts. This stability is essential for stateful applications requiring peer discovery, leader election, and consistent addressing.

This guide shows you how to implement DNS-based service discovery for StatefulSets in Kubernetes.

## Understanding StatefulSet DNS

StatefulSets provide:

- Stable pod names (pod-0, pod-1, pod-2)
- Predictable DNS names for each pod
- Ordered pod creation and deletion
- Stable storage attachments

DNS naming pattern:

```
<pod-name>.<service-name>.<namespace>.svc.cluster.local
```

Example:

```
web-0.nginx.default.svc.cluster.local
web-1.nginx.default.svc.cluster.local
web-2.nginx.default.svc.cluster.local
```

## Creating Basic StatefulSet with Headless Service

Deploy a StatefulSet with DNS discovery:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: default
spec:
  clusterIP: None  # Headless service for direct pod access
  selector:
    app: nginx
  ports:
  - name: http
    port: 80
    targetPort: 80
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
  namespace: default
spec:
  serviceName: nginx  # Must match service name
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
          name: http
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
```

Deploy and verify:

```bash
# Create StatefulSet
kubectl apply -f statefulset.yaml

# Watch pods come up in order
kubectl get pods -w

# Verify DNS names
kubectl run test --image=nicolaka/netshoot --rm -it -- bash
nslookup web-0.nginx.default.svc.cluster.local
nslookup web-1.nginx.default.svc.cluster.local
nslookup web-2.nginx.default.svc.cluster.local
```

## Implementing Peer Discovery for Databases

Deploy a PostgreSQL cluster with peer discovery:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: database
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - name: postgres
    port: 5432
  - name: replication
    port: 5433
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: postgres
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
          name: postgres
        - containerPort: 5433
          name: replication
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        # Construct peer list using DNS
        - name: POSTGRES_PRIMARY
          value: "postgres-0.postgres.database.svc.cluster.local"
        - name: POSTGRES_REPLICAS
          value: "postgres-1.postgres.database.svc.cluster.local,postgres-2.postgres.database.svc.cluster.local"
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

## Cassandra Cluster with Seed Discovery

Implement Cassandra cluster using StatefulSet DNS:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cassandra
  namespace: database
spec:
  clusterIP: None
  selector:
    app: cassandra
  ports:
  - name: cql
    port: 9042
  - name: thrift
    port: 9160
  - name: gossip
    port: 7000
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
  namespace: database
spec:
  serviceName: cassandra
  replicas: 3
  selector:
    matchLabels:
      app: cassandra
  template:
    metadata:
      labels:
        app: cassandra
    spec:
      containers:
      - name: cassandra
        image: cassandra:4.0
        ports:
        - containerPort: 9042
          name: cql
        - containerPort: 7000
          name: gossip
        env:
        - name: CASSANDRA_SEEDS
          value: "cassandra-0.cassandra.database.svc.cluster.local,cassandra-1.cassandra.database.svc.cluster.local"
        - name: CASSANDRA_CLUSTER_NAME
          value: "K8S_Cluster"
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        volumeMounts:
        - name: data
          mountPath: /var/lib/cassandra
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 20Gi
```

## Distributed Application with Leader Election

Implement leader election using StatefulSet DNS:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: leader-election-config
data:
  discover-peers.sh: |
    #!/bin/bash

    # Get own pod name and namespace
    POD_NAME=${HOSTNAME}
    NAMESPACE=${POD_NAMESPACE}
    SERVICE_NAME="app-cluster"

    # Construct own FQDN
    OWN_FQDN="${POD_NAME}.${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local"

    # Discover all peers
    echo "Discovering cluster peers..."
    PEERS=$(nslookup ${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local | grep Address | tail -n +2 | awk '{print $2}')

    echo "Found peers:"
    echo "$PEERS"

    # First pod in StatefulSet is leader
    LEADER_FQDN="${SERVICE_NAME}-0.${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local"
    LEADER_IP=$(nslookup $LEADER_FQDN | grep Address | tail -1 | awk '{print $2}')

    if [ "$OWN_FQDN" == "$LEADER_FQDN" ]; then
        echo "I am the leader"
        export ROLE="leader"
    else
        echo "I am a follower, leader is: $LEADER_FQDN"
        export ROLE="follower"
        export LEADER_ADDRESS=$LEADER_IP
    fi

    # Start application with role
    exec /app/start --role=$ROLE
---
apiVersion: v1
kind: Service
metadata:
  name: app-cluster
spec:
  clusterIP: None
  selector:
    app: distributed-app
  ports:
  - port: 8080
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: app-cluster
spec:
  serviceName: app-cluster
  replicas: 3
  selector:
    matchLabels:
      app: distributed-app
  template:
    metadata:
      labels:
        app: distributed-app
    spec:
      containers:
      - name: app
        image: my-distributed-app:latest
        command:
        - sh
        - /scripts/discover-peers.sh
        env:
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: leader-election-config
```

## Kafka Cluster with Broker Discovery

Deploy Kafka using StatefulSet DNS:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka
  namespace: messaging
spec:
  clusterIP: None
  selector:
    app: kafka
  ports:
  - name: client
    port: 9092
  - name: internal
    port: 9093
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: messaging
spec:
  serviceName: kafka
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
      - name: kafka
        image: confluentinc/cp-kafka:7.4.0
        ports:
        - containerPort: 9092
          name: client
        - containerPort: 9093
          name: internal
        env:
        - name: KAFKA_BROKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: KAFKA_ZOOKEEPER_CONNECT
          value: "zookeeper:2181"
        - name: KAFKA_ADVERTISED_LISTENERS
          value: "INTERNAL://$(POD_NAME).kafka.messaging.svc.cluster.local:9093,EXTERNAL://$(POD_NAME).kafka.messaging.svc.cluster.local:9092"
        - name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
          value: "INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT"
        - name: KAFKA_INTER_BROKER_LISTENER_NAME
          value: "INTERNAL"
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        volumeMounts:
        - name: data
          mountPath: /var/lib/kafka/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 50Gi
```

## Testing StatefulSet DNS Discovery

Comprehensive test suite:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: statefulset-dns-test
data:
  test.sh: |
    #!/bin/bash

    SERVICE="nginx"
    NAMESPACE="default"
    REPLICAS=3

    echo "Testing StatefulSet DNS Discovery"
    echo "Service: $SERVICE"
    echo "Expected replicas: $REPLICAS"
    echo ""

    # Test 1: Individual pod DNS resolution
    echo "Test 1: Individual pod DNS"
    for i in $(seq 0 $(($REPLICAS - 1))); do
        pod_name="web-${i}"
        fqdn="${pod_name}.${SERVICE}.${NAMESPACE}.svc.cluster.local"

        echo "Testing: $fqdn"
        result=$(nslookup $fqdn 2>&1)

        if echo "$result" | grep -q "Address:"; then
            ip=$(echo "$result" | grep Address | tail -1 | awk '{print $2}')
            echo "  PASS: Resolved to $ip"
        else
            echo "  FAIL: Could not resolve"
        fi
    done
    echo ""

    # Test 2: Headless service returns all pods
    echo "Test 2: Headless service enumeration"
    fqdn="${SERVICE}.${NAMESPACE}.svc.cluster.local"
    result=$(nslookup $fqdn 2>&1)

    if echo "$result" | grep -q "Address:"; then
        ips=$(echo "$result" | grep Address | tail -n +2 | awk '{print $2}')
        count=$(echo "$ips" | wc -l)

        echo "Service: $fqdn"
        echo "Resolved IPs: $count"
        echo "$ips" | sed 's/^/  /'

        if [ "$count" -eq "$REPLICAS" ]; then
            echo "  PASS: All pods discovered"
        else
            echo "  WARN: Expected $REPLICAS, found $count"
        fi
    else
        echo "  FAIL: Could not resolve service"
    fi
    echo ""

    # Test 3: Pod connectivity
    echo "Test 3: Pod connectivity"
    for i in $(seq 0 $(($REPLICAS - 1))); do
        pod_name="web-${i}"
        fqdn="${pod_name}.${SERVICE}.${NAMESPACE}.svc.cluster.local"

        if nc -zv $fqdn 80 2>&1 | grep -q succeeded; then
            echo "  $fqdn: REACHABLE"
        else
            echo "  $fqdn: UNREACHABLE"
        fi
    done

    echo ""
    echo "Tests complete"
---
apiVersion: batch/v1
kind: Job
metadata:
  name: test-statefulset-dns
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
          name: statefulset-dns-test
      restartPolicy: Never
```

Run tests:

```bash
kubectl apply -f statefulset-dns-test.yaml
kubectl logs job/test-statefulset-dns
```

## Monitoring StatefulSet Discovery

Track StatefulSet DNS health:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: statefulset-monitor
data:
  monitor.sh: |
    #!/bin/bash

    STATEFULSET="web"
    SERVICE="nginx"
    NAMESPACE="default"

    while true; do
        echo "=== $(date) ==="

        # Get expected replicas
        EXPECTED=$(kubectl get statefulset $STATEFULSET -n $NAMESPACE -o jsonpath='{.spec.replicas}')
        READY=$(kubectl get statefulset $STATEFULSET -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')

        echo "StatefulSet: $STATEFULSET"
        echo "Expected: $EXPECTED, Ready: $READY"
        echo ""

        # Check DNS for each pod
        for i in $(seq 0 $(($EXPECTED - 1))); do
            pod_name="${STATEFULSET}-${i}"
            fqdn="${pod_name}.${SERVICE}.${NAMESPACE}.svc.cluster.local"

            if nslookup $fqdn >/dev/null 2>&1; then
                echo "  $pod_name: DNS OK"
            else
                echo "  $pod_name: DNS FAILED"
            fi
        done

        echo ""
        sleep 60
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: statefulset-monitor
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
          name: statefulset-monitor
```

## Best Practices

Follow these guidelines for StatefulSet DNS:

1. Always use headless services with StatefulSets
2. Match serviceName in StatefulSet spec to service name
3. Use stable pod names in application configuration
4. Implement health checks before peer communication
5. Handle pod restarts gracefully in application logic
6. Monitor DNS resolution for all StatefulSet pods
7. Document peer discovery mechanisms
8. Test scaling operations thoroughly
9. Use volumeClaimTemplates for persistent storage
10. Consider using init containers for peer validation

DNS-based service discovery for StatefulSets provides the foundation for reliable stateful applications in Kubernetes. By leveraging stable network identities and predictable DNS names, you enable sophisticated peer discovery patterns for databases, distributed systems, and clustered applications. Proper configuration and monitoring ensure your stateful workloads maintain reliable communication.

For more StatefulSet patterns, explore our guides on [headless services](https://oneuptime.com/blog/post/2026-02-09-headless-services-pod-ip-discovery/view) and [CoreDNS kubernetes plugin](https://oneuptime.com/blog/post/2026-02-09-coredns-kubernetes-plugin-discovery/view).
