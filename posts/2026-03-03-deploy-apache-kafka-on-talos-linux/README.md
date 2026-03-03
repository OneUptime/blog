# How to Deploy Apache Kafka on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Apache Kafka, Kubernetes, Event Streaming, Messaging, DevOps

Description: Deploy Apache Kafka on Talos Linux for event streaming with KRaft mode, persistent storage, and production-grade cluster configuration.

---

Apache Kafka is the industry standard for event streaming and distributed messaging. It handles millions of events per second and provides durable, ordered message delivery. Deploying Kafka on Talos Linux combines a battle-tested streaming platform with a secure, immutable Kubernetes OS that eliminates configuration drift across your broker nodes.

This guide covers deploying Kafka on Talos Linux, including the newer KRaft mode that removes the ZooKeeper dependency, broker configuration, and production best practices.

## Kafka Architecture on Kubernetes

A Kafka deployment consists of brokers that store and serve messages, topics that organize messages into categories, partitions that distribute data across brokers, and consumer groups that coordinate message consumption. In KRaft mode (Kafka Raft), Kafka manages its own metadata without needing ZooKeeper, simplifying the deployment significantly.

## Prerequisites

- Talos Linux cluster with at least three worker nodes
- Each node needs 4GB+ RAM and SSD storage
- `kubectl` and `talosctl` configured
- A StorageClass with good I/O performance

## Step 1: Configure Talos Linux for Kafka

Kafka benefits from specific network and file system tuning:

```yaml
# talos-kafka-patch.yaml
machine:
  sysctls:
    # Kafka needs higher network buffer sizes
    net.core.wmem_max: "2097152"
    net.core.rmem_max: "2097152"
    net.ipv4.tcp_wmem: "4096 65536 2048000"
    net.ipv4.tcp_rmem: "4096 65536 2048000"
    vm.swappiness: "1"
    vm.dirty_ratio: "80"
    vm.dirty_background_ratio: "5"
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/lib/kafka-data
```

```bash
talosctl apply-config --nodes 10.0.0.2,10.0.0.3,10.0.0.4 \
  --file talos-kafka-patch.yaml
```

## Step 2: Create Namespace and Configuration

```yaml
# kafka-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kafka
---
# kafka-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-config
  namespace: kafka
data:
  server.properties: |
    # KRaft mode settings
    process.roles=broker,controller
    node.id=${NODE_ID}
    controller.quorum.voters=0@kafka-0.kafka-headless.kafka.svc.cluster.local:9093,1@kafka-1.kafka-headless.kafka.svc.cluster.local:9093,2@kafka-2.kafka-headless.kafka.svc.cluster.local:9093
    controller.listener.names=CONTROLLER

    # Listener configuration
    listeners=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
    advertised.listeners=PLAINTEXT://${POD_NAME}.kafka-headless.kafka.svc.cluster.local:9092
    listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
    inter.broker.listener.name=PLAINTEXT

    # Log settings
    log.dirs=/var/lib/kafka/data
    num.partitions=3
    default.replication.factor=3
    min.insync.replicas=2
    log.retention.hours=168
    log.segment.bytes=1073741824
    log.retention.check.interval.ms=300000

    # Performance tuning
    num.network.threads=8
    num.io.threads=16
    socket.send.buffer.bytes=102400
    socket.receive.buffer.bytes=102400
    socket.request.max.bytes=104857600
```

```bash
kubectl apply -f kafka-namespace.yaml
kubectl apply -f kafka-config.yaml
```

## Step 3: Deploy Kafka with KRaft Mode

```yaml
# kafka-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: kafka
spec:
  serviceName: kafka-headless
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
          image: apache/kafka:3.7.0
          ports:
            - containerPort: 9092
              name: plaintext
            - containerPort: 9093
              name: controller
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: KAFKA_HEAP_OPTS
              value: "-Xmx2g -Xms2g"
          command:
            - /bin/bash
            - -c
            - |
              # Extract the node ID from the pod name
              export NODE_ID=${POD_NAME##*-}

              # Copy and substitute config
              cp /etc/kafka-config/server.properties /tmp/server.properties
              sed -i "s/\${NODE_ID}/${NODE_ID}/g" /tmp/server.properties
              sed -i "s/\${POD_NAME}/${POD_NAME}/g" /tmp/server.properties

              # Format storage if not already done
              CLUSTER_ID="MkU3OEVBNTcwNTJENDM2Qg"
              if [ ! -f /var/lib/kafka/data/meta.properties ]; then
                /opt/kafka/bin/kafka-storage.sh format \
                  --config /tmp/server.properties \
                  --cluster-id $CLUSTER_ID \
                  --ignore-formatted
              fi

              # Start Kafka
              exec /opt/kafka/bin/kafka-server-start.sh /tmp/server.properties
          volumeMounts:
            - name: kafka-data
              mountPath: /var/lib/kafka
            - name: kafka-config
              mountPath: /etc/kafka-config
          resources:
            requests:
              memory: "3Gi"
              cpu: "1000m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
          readinessProbe:
            tcpSocket:
              port: 9092
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            tcpSocket:
              port: 9092
            initialDelaySeconds: 60
            periodSeconds: 20
      volumes:
        - name: kafka-config
          configMap:
            name: kafka-config
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - kafka
              topologyKey: kubernetes.io/hostname
  volumeClaimTemplates:
    - metadata:
        name: kafka-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 100Gi
```

## Step 4: Create Services

```yaml
# kafka-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka-headless
  namespace: kafka
spec:
  selector:
    app: kafka
  ports:
    - port: 9092
      name: plaintext
    - port: 9093
      name: controller
  clusterIP: None
---
apiVersion: v1
kind: Service
metadata:
  name: kafka-bootstrap
  namespace: kafka
spec:
  selector:
    app: kafka
  ports:
    - port: 9092
      targetPort: 9092
  type: ClusterIP
```

```bash
kubectl apply -f kafka-statefulset.yaml
kubectl apply -f kafka-services.yaml
```

## Step 5: Verify and Test

```bash
# Check broker status
kubectl get pods -n kafka -w

# Create a test topic
kubectl exec -it kafka-0 -n kafka -- /opt/kafka/bin/kafka-topics.sh \
  --create --topic test-topic \
  --partitions 3 --replication-factor 3 \
  --bootstrap-server kafka-0.kafka-headless.kafka.svc.cluster.local:9092

# List topics
kubectl exec -it kafka-0 -n kafka -- /opt/kafka/bin/kafka-topics.sh \
  --list \
  --bootstrap-server kafka-0.kafka-headless.kafka.svc.cluster.local:9092

# Produce messages
kubectl exec -it kafka-0 -n kafka -- /opt/kafka/bin/kafka-console-producer.sh \
  --topic test-topic \
  --bootstrap-server kafka-0.kafka-headless.kafka.svc.cluster.local:9092

# Consume messages (in another terminal)
kubectl exec -it kafka-0 -n kafka -- /opt/kafka/bin/kafka-console-consumer.sh \
  --topic test-topic --from-beginning \
  --bootstrap-server kafka-0.kafka-headless.kafka.svc.cluster.local:9092
```

## Step 6: Describe Topic Details

```bash
# Check topic partition distribution
kubectl exec -it kafka-0 -n kafka -- /opt/kafka/bin/kafka-topics.sh \
  --describe --topic test-topic \
  --bootstrap-server kafka-0.kafka-headless.kafka.svc.cluster.local:9092
```

## Monitoring Kafka

Deploy the Kafka Exporter for Prometheus metrics:

```yaml
# kafka-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-exporter
  namespace: kafka
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kafka-exporter
  template:
    metadata:
      labels:
        app: kafka-exporter
    spec:
      containers:
        - name: kafka-exporter
          image: danielqsj/kafka-exporter:latest
          args:
            - --kafka.server=kafka-0.kafka-headless.kafka.svc.cluster.local:9092
            - --kafka.server=kafka-1.kafka-headless.kafka.svc.cluster.local:9092
            - --kafka.server=kafka-2.kafka-headless.kafka.svc.cluster.local:9092
          ports:
            - containerPort: 9308
```

## Key Metrics to Monitor

Keep an eye on these Kafka metrics:
- Under-replicated partitions (should be 0)
- Consumer group lag (measures how far behind consumers are)
- Request latency (produce and fetch)
- Log segment size and disk utilization
- Network I/O per broker

## Production Recommendations

For production Kafka on Talos Linux:

- Always use three or more brokers with a replication factor of 3
- Set `min.insync.replicas` to 2 for durability
- Use dedicated SSD storage for Kafka log directories
- Monitor consumer group lag to catch processing bottlenecks
- Configure log retention based on your storage capacity and requirements
- Use KRaft mode to avoid the operational overhead of ZooKeeper

## Conclusion

Apache Kafka on Talos Linux is a solid foundation for event-driven architectures. KRaft mode simplifies the deployment by removing the ZooKeeper dependency, and the immutable nature of Talos Linux ensures your broker nodes remain consistent and secure. With proper storage allocation, network tuning, and monitoring in place, Kafka on Talos Linux can handle demanding streaming workloads while keeping operational complexity manageable.
