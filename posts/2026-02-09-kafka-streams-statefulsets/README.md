# How to Implement Kafka Streams Applications on Kubernetes with StatefulSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, Kubernetes, Stream-Processing

Description: Learn how to deploy stateful Kafka Streams applications on Kubernetes using StatefulSets with persistent volumes, state store management, and rebalancing strategies.

---

Kafka Streams is a powerful library for building stream processing applications that consume, transform, and produce data in Kafka. Running Kafka Streams applications on Kubernetes presents unique challenges because these applications maintain local state stores that need to survive pod restarts and rebalancing events. StatefulSets provide the foundation for deploying stateful Kafka Streams applications with stable network identities and persistent storage.

This guide covers deploying production-ready Kafka Streams applications on Kubernetes with proper state management.

## Understanding Kafka Streams State Management

Kafka Streams applications use state stores to maintain intermediate processing results, aggregations, and join tables. These state stores can be:

- In-memory stores (lost on restart)
- Persistent RocksDB stores (written to local disk)
- Changelog-backed stores (replicated to Kafka topics)

For Kubernetes deployments, persistent RocksDB stores backed by changelog topics provide the best balance of performance and reliability. When a pod restarts, it can restore state from the changelog topic rather than reprocessing all data from the beginning.

## Architecture Considerations

StatefulSets are ideal for Kafka Streams applications because they provide:

- Stable pod identities (app-0, app-1, app-2)
- Ordered deployment and scaling
- Persistent volume claims bound to specific pods
- Predictable DNS names for inter-pod communication

Each Kafka Streams instance gets its own persistent volume for state stores, and the stable identity ensures that after a restart, the same pod gets the same data and storage.

## Creating the Kafka Streams Application

Start with a basic Kafka Streams application that uses stateful operations:

```java
// StreamProcessor.java
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.kstream.*;
import org.apache.kafka.common.serialization.Serdes;
import java.util.Properties;
import java.time.Duration;

public class StreamProcessor {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "stateful-processor");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG,
                  System.getenv("KAFKA_BOOTSTRAP_SERVERS"));

        // State directory for local state stores
        props.put(StreamsConfig.STATE_DIR_CONFIG, "/var/lib/kafka-streams");

        // Replication factor for changelog topics
        props.put(StreamsConfig.REPLICATION_FACTOR_CONFIG, 3);

        // Processing guarantees
        props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG,
                  StreamsConfig.EXACTLY_ONCE_V2);

        // Number of standby replicas for state stores
        props.put(StreamsConfig.NUM_STANDBY_REPLICAS_CONFIG, 1);

        // Default serdes
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG,
                  Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG,
                  Serdes.String().getClass());

        StreamsBuilder builder = new StreamsBuilder();

        // Stateful aggregation example
        KStream<String, String> events = builder.stream("input-events");

        KTable<Windowed<String>, Long> windowedCounts = events
            .groupByKey()
            .windowedBy(TimeWindows.of(Duration.ofMinutes(5)))
            .count(Materialized.as("windowed-counts-store"));

        windowedCounts
            .toStream()
            .map((key, value) ->
                KeyValue.pair(key.key(), key.window().start() + ":" + value))
            .to("output-counts");

        // Build and start the streams application
        KafkaStreams streams = new KafkaStreams(builder.build(), props);

        // Add shutdown hook for graceful shutdown
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("Shutting down gracefully...");
            streams.close(Duration.ofSeconds(30));
        }));

        // Add state listener for monitoring
        streams.setStateListener((newState, oldState) -> {
            System.out.println("State changed from " + oldState + " to " + newState);
        });

        streams.start();
    }
}
```

Build the Docker image:

```dockerfile
FROM openjdk:17-slim

# Install required packages
RUN apt-get update && apt-get install -y \
    curl \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Create app directory and state directory
RUN mkdir -p /app /var/lib/kafka-streams
RUN chmod 777 /var/lib/kafka-streams

# Copy application JAR
COPY target/kafka-streams-app.jar /app/app.jar

# Set working directory
WORKDIR /app

# Expose JMX port
EXPOSE 9999

# Run the application
ENTRYPOINT ["java", \
    "-Xmx2g", \
    "-Xms2g", \
    "-XX:+UseG1GC", \
    "-XX:MaxGCPauseMillis=20", \
    "-XX:InitiatingHeapOccupancyPercent=35", \
    "-XX:+ExplicitGCInvokesConcurrent", \
    "-Dcom.sun.management.jmxremote", \
    "-Dcom.sun.management.jmxremote.port=9999", \
    "-Dcom.sun.management.jmxremote.authenticate=false", \
    "-Dcom.sun.management.jmxremote.ssl=false", \
    "-jar", "app.jar"]
```

## Deploying with StatefulSet

Create the StatefulSet configuration:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka-streams
  namespace: streaming
  labels:
    app: kafka-streams
spec:
  ports:
  - port: 9999
    name: jmx
  clusterIP: None
  selector:
    app: kafka-streams
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka-streams
  namespace: streaming
spec:
  serviceName: kafka-streams
  replicas: 3
  podManagementPolicy: Parallel
  selector:
    matchLabels:
      app: kafka-streams
  template:
    metadata:
      labels:
        app: kafka-streams
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9999"
        prometheus.io/path: "/metrics"
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: streams-processor
        image: myregistry.io/kafka-streams-app:v1.0.0
        ports:
        - containerPort: 9999
          name: jmx
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: "kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092"
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        volumeMounts:
        - name: state-store
          mountPath: /var/lib/kafka-streams
        resources:
          requests:
            memory: "3Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pgrep -f kafka-streams-app
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - test -f /var/lib/kafka-streams/.running
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: state-store
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

## Configuring Storage Classes

Create a storage class optimized for Kafka Streams state stores:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
  fsType: ext4
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## Handling Rebalancing Events

Implement graceful shutdown to minimize rebalancing time:

```java
// Add to the main application class
public class StreamProcessor {
    private static volatile boolean running = true;

    public static void main(String[] args) {
        // ... streams setup code ...

        // Signal handler for graceful shutdown
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("Received shutdown signal");
            running = false;

            // Close streams application gracefully
            try {
                streams.close(Duration.ofSeconds(30));
                System.out.println("Streams application closed cleanly");
            } catch (Exception e) {
                System.err.println("Error during shutdown: " + e.getMessage());
            }
        }));

        // Start the application
        streams.start();

        // Keep the application running
        while (running) {
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                break;
            }
        }
    }
}
```

Configure Kubernetes to send proper shutdown signals:

```yaml
lifecycle:
  preStop:
    exec:
      command:
      - /bin/sh
      - -c
      - |
        echo "Initiating graceful shutdown..."
        kill -TERM 1
        sleep 25
```

## Monitoring State Store Health

Create a sidecar container for state store metrics:

```yaml
- name: state-metrics
  image: prom/node-exporter:latest
  args:
  - --path.rootfs=/host
  - --collector.filesystem
  - --collector.diskstats
  volumeMounts:
  - name: state-store
    mountPath: /host/var/lib/kafka-streams
    readOnly: true
  ports:
  - containerPort: 9100
    name: metrics
```

Add JMX metrics for Kafka Streams:

```java
// Add metrics reporter configuration
props.put(StreamsConfig.METRIC_REPORTER_CLASSES_CONFIG,
          "org.apache.kafka.common.metrics.JmxReporter");

// Add custom tags for better filtering
props.put(StreamsConfig.APPLICATION_ID_CONFIG, "stateful-processor");
props.put(StreamsConfig.CLIENT_ID_CONFIG,
          System.getenv("POD_NAME") + "-streams-client");
```

## Implementing Standby Replicas

Configure standby replicas for faster recovery:

```java
// Enable standby replicas
props.put(StreamsConfig.NUM_STANDBY_REPLICAS_CONFIG, 1);

// Configure acceptable recovery lag
props.put(StreamsConfig.ACCEPTABLE_RECOVERY_LAG_CONFIG, 10000L);

// Set max warmup replicas
props.put(StreamsConfig.MAX_WARMUP_REPLICAS_CONFIG, 2);
```

This configuration creates one standby replica for each active task, enabling faster recovery when pods fail or are rescheduled.

## Scaling the Application

Scale the StatefulSet horizontally:

```bash
# Scale up to 5 replicas
kubectl scale statefulset kafka-streams -n streaming --replicas=5

# Scale down to 2 replicas (be careful with state)
kubectl scale statefulset kafka-streams -n streaming --replicas=2
```

When scaling, Kafka Streams will automatically rebalance tasks across the new number of instances. State stores will be restored from changelog topics as needed.

## State Store Backup and Recovery

Implement periodic state store backups:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-state-stores
  namespace: streaming
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: amazon/aws-cli:latest
            command:
            - /bin/sh
            - -c
            - |
              for pod in kafka-streams-0 kafka-streams-1 kafka-streams-2; do
                kubectl exec -n streaming $pod -- \
                  tar czf - /var/lib/kafka-streams | \
                  aws s3 cp - s3://backups/kafka-streams/$pod-$(date +%Y%m%d).tar.gz
              done
            volumeMounts:
            - name: aws-credentials
              mountPath: /root/.aws
              readOnly: true
          restartPolicy: OnFailure
          volumes:
          - name: aws-credentials
            secret:
              secretName: aws-credentials
```

## Troubleshooting Common Issues

Check state store size:

```bash
# Get state store disk usage
kubectl exec -n streaming kafka-streams-0 -- \
  du -sh /var/lib/kafka-streams

# Check for corruption
kubectl exec -n streaming kafka-streams-0 -- \
  ls -la /var/lib/kafka-streams/stateful-processor/
```

Monitor rebalancing events:

```bash
# Check application logs for rebalancing
kubectl logs -n streaming kafka-streams-0 | grep -i rebalance

# View Kafka consumer group lag
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --group stateful-processor --describe
```

Reset application state if needed:

```bash
# Scale down to zero
kubectl scale statefulset kafka-streams -n streaming --replicas=0

# Delete persistent volume claims
kubectl delete pvc -n streaming -l app=kafka-streams

# Reset consumer group offsets
kafka-streams-application-reset.sh \
  --application-id stateful-processor \
  --bootstrap-servers kafka:9092 \
  --input-topics input-events

# Scale back up
kubectl scale statefulset kafka-streams -n streaming --replicas=3
```

## Performance Tuning

Optimize RocksDB settings for better performance:

```java
// Add RocksDB configuration
props.put(StreamsConfig.ROCKSDB_CONFIG_SETTER_CLASS_CONFIG,
          CustomRocksDBConfig.class);

// Custom RocksDB configuration class
public class CustomRocksDBConfig implements RocksDBConfigSetter {
    @Override
    public void setConfig(String storeName, Options options,
                          Map<String, Object> configs) {
        // Increase block cache size
        BlockBasedTableConfig tableConfig = new BlockBasedTableConfig();
        tableConfig.setBlockCacheSize(256 * 1024 * 1024L); // 256MB
        tableConfig.setBlockSize(16 * 1024L); // 16KB
        tableConfig.setCacheIndexAndFilterBlocks(true);
        options.setTableFormatConfig(tableConfig);

        // Optimize write performance
        options.setMaxWriteBufferNumber(3);
        options.setWriteBufferSize(64 * 1024 * 1024L); // 64MB

        // Compression settings
        options.setCompressionType(CompressionType.SNAPPY_COMPRESSION);
    }
}
```

## Conclusion

Deploying Kafka Streams applications on Kubernetes with StatefulSets provides a robust foundation for stateful stream processing. The combination of persistent volumes, stable pod identities, and changelog-backed state stores ensures that your application can survive pod restarts while maintaining processing state.

Key considerations include properly configuring state directories, implementing graceful shutdown handlers, using standby replicas for faster recovery, monitoring state store health and size, and tuning RocksDB settings for your workload. With these practices in place, you can build reliable, scalable stream processing applications that run seamlessly on Kubernetes.
