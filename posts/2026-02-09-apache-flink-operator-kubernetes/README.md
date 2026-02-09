# How to Run Apache Flink on Kubernetes Using the Flink Operator for Stream Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Apache Flink, Stream Processing

Description: Deploy and manage Apache Flink stream processing jobs on Kubernetes using the Flink Kubernetes Operator for scalable real-time data processing workloads.

---

Apache Flink provides stateful computations over data streams for real-time analytics, ETL pipelines, and event-driven applications. Running Flink on Kubernetes brings container orchestration benefits to stream processing. The Flink Kubernetes Operator simplifies deploying and managing Flink clusters and jobs. This guide walks you through setting up Flink for production stream processing workloads.

## Understanding Flink Architecture

Flink applications consist of a JobManager that coordinates distributed execution and TaskManagers that execute the actual computations. The JobManager handles scheduling, checkpointing, and recovery coordination. TaskManagers run in slots that execute parallel instances of your operators.

For stateful applications, Flink uses checkpoints to maintain consistency. State data is stored in backends like RocksDB or memory, with periodic snapshots to persistent storage. This architecture enables exactly-once processing semantics even when failures occur.

## Installing the Flink Kubernetes Operator

Deploy the operator and custom resource definitions:

```bash
# Add Flink operator Helm repository
helm repo add flink-operator-repo https://downloads.apache.org/flink/flink-kubernetes-operator-1.7.0/
helm repo update

# Install the operator
kubectl create namespace flink-system
helm install flink-kubernetes-operator flink-operator-repo/flink-kubernetes-operator \
  --namespace flink-system

# Verify installation
kubectl get pods -n flink-system
```

The operator watches for FlinkDeployment and FlinkSessionJob resources and manages the underlying Flink clusters.

## Deploying a Flink Application Cluster

Create a FlinkDeployment for running a single job:

```yaml
# flink-application.yaml
apiVersion: flink.apache.org/v1beta1
kind: FlinkDeployment
metadata:
  name: word-count-app
  namespace: flink
spec:
  image: flink:1.18.0
  flinkVersion: v1_18
  flinkConfiguration:
    taskmanager.numberOfTaskSlots: "2"
    state.backend: rocksdb
    state.checkpoints.dir: file:///flink-data/checkpoints
    state.savepoints.dir: file:///flink-data/savepoints
    execution.checkpointing.interval: 60s
    execution.checkpointing.mode: EXACTLY_ONCE

  serviceAccount: flink

  jobManager:
    resource:
      memory: "2048m"
      cpu: 1
    replicas: 1

  taskManager:
    resource:
      memory: "2048m"
      cpu: 1
    replicas: 2

  podTemplate:
    spec:
      containers:
        - name: flink-main-container
          volumeMounts:
          - name: flink-data
            mountPath: /flink-data
      volumes:
      - name: flink-data
        persistentVolumeClaim:
          claimName: flink-data

  job:
    jarURI: local:///opt/flink/examples/streaming/StateMachineExample.jar
    parallelism: 4
    upgradeMode: savepoint
    state: running
```

Create the namespace and persistent volume:

```yaml
# flink-resources.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: flink
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flink
  namespace: flink
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: flink-role
  namespace: flink
rules:
- apiGroups: [""]
  resources: ["pods", "configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flink-role-binding
  namespace: flink
subjects:
- kind: ServiceAccount
  name: flink
  namespace: flink
roleRef:
  kind: Role
  name: flink-role
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: flink-data
  namespace: flink
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: nfs-storage
```

Deploy the application:

```bash
kubectl apply -f flink-resources.yaml
kubectl apply -f flink-application.yaml

# Watch deployment
kubectl get flinkdeployment -n flink -w

# Check job status
kubectl get flinkdeployment word-count-app -n flink -o jsonpath='{.status.jobStatus.state}'
```

## Creating a Custom Flink Job

Build a simple word count streaming application:

```java
// WordCount.java
package com.example.flink;

import org.apache.flink.api.common.functions.FlatMapFunction;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.apache.flink.util.Collector;

public class WordCount {
    public static void main(String[] args) throws Exception {
        // Set up the streaming execution environment
        final StreamExecutionEnvironment env =
            StreamExecutionEnvironment.getExecutionEnvironment();

        // Enable checkpointing every 10 seconds
        env.enableCheckpointing(10000);

        // Read from Kafka
        DataStream<String> text = env
            .addSource(new FlinkKafkaConsumer<>(
                "input-topic",
                new SimpleStringSchema(),
                properties
            ));

        // Parse and count words
        DataStream<Tuple2<String, Integer>> counts = text
            .flatMap(new Tokenizer())
            .keyBy(value -> value.f0)
            .window(Time.seconds(5))
            .sum(1);

        // Write to Kafka
        counts.addSink(new FlinkKafkaProducer<>(
            "output-topic",
            new KeyedSerializationSchemaWrapper<>(new SimpleStringSchema()),
            properties,
            FlinkKafkaProducer.Semantic.EXACTLY_ONCE
        ));

        // Execute program
        env.execute("Streaming Word Count");
    }

    public static final class Tokenizer
            implements FlatMapFunction<String, Tuple2<String, Integer>> {

        @Override
        public void flatMap(String value, Collector<Tuple2<String, Integer>> out) {
            // Normalize and split the line
            String[] tokens = value.toLowerCase().split("\\W+");

            // Emit the pairs
            for (String token : tokens) {
                if (token.length() > 0) {
                    out.collect(new Tuple2<>(token, 1));
                }
            }
        }
    }
}
```

Build and package:

```xml
<!-- pom.xml -->
<project>
    <properties>
        <flink.version>1.18.0</flink.version>
        <scala.binary.version>2.12</scala.binary.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.apache.flink</groupId>
            <artifactId>flink-streaming-java</artifactId>
            <version>${flink.version}</version>
        </dependency>
        <dependency>
            <groupId>org.apache.flink</groupId>
            <artifactId>flink-connector-kafka</artifactId>
            <version>${flink.version}</version>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-shade-plugin</artifactId>
                <version>3.4.1</version>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals>
                            <goal>shade</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

Build the JAR:

```bash
mvn clean package
```

Create Docker image with the JAR:

```dockerfile
FROM flink:1.18.0

# Copy job JAR
COPY target/word-count-1.0.jar /opt/flink/usrlib/word-count.jar

# Copy dependencies if needed
COPY target/libs/*.jar /opt/flink/lib/
```

Build and push:

```bash
docker build -t your-registry/flink-word-count:1.0 .
docker push your-registry/flink-word-count:1.0
```

## Deploying the Custom Job

Update the FlinkDeployment to use your custom image:

```yaml
apiVersion: flink.apache.org/v1beta1
kind: FlinkDeployment
metadata:
  name: word-count-app
  namespace: flink
spec:
  image: your-registry/flink-word-count:1.0
  flinkVersion: v1_18

  flinkConfiguration:
    taskmanager.numberOfTaskSlots: "4"
    state.backend: rocksdb
    state.backend.incremental: "true"
    state.checkpoints.dir: s3://my-bucket/flink/checkpoints
    state.savepoints.dir: s3://my-bucket/flink/savepoints
    execution.checkpointing.interval: 60s
    execution.checkpointing.mode: EXACTLY_ONCE
    execution.checkpointing.timeout: 10min
    state.backend.rocksdb.localdir: /flink-data/rocksdb

  jobManager:
    resource:
      memory: "2048m"
      cpu: 1

  taskManager:
    resource:
      memory: "4096m"
      cpu: 2
    replicas: 3

  job:
    jarURI: local:///opt/flink/usrlib/word-count.jar
    entryClass: com.example.flink.WordCount
    args: []
    parallelism: 8
    upgradeMode: savepoint
    state: running
```

## Configuring State Backend with S3

For production, use S3 for checkpoints and savepoints:

```yaml
# Create secret for S3 credentials
apiVersion: v1
kind: Secret
metadata:
  name: s3-credentials
  namespace: flink
type: Opaque
stringData:
  access-key: YOUR_ACCESS_KEY
  secret-key: YOUR_SECRET_KEY
---
# Update FlinkDeployment
spec:
  flinkConfiguration:
    s3.endpoint: https://s3.amazonaws.com
    s3.access-key: ${S3_ACCESS_KEY}
    s3.secret-key: ${S3_SECRET_KEY}
    state.checkpoints.dir: s3://my-bucket/flink/checkpoints
    state.savepoints.dir: s3://my-bucket/flink/savepoints

  podTemplate:
    spec:
      containers:
      - name: flink-main-container
        env:
        - name: S3_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: s3-credentials
              key: access-key
        - name: S3_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: s3-credentials
              key: secret-key
```

## Scaling Flink Jobs

Scale TaskManagers for more processing capacity:

```bash
# Scale up TaskManagers
kubectl patch flinkdeployment word-count-app -n flink --type merge \
  -p '{"spec":{"taskManager":{"replicas":5}}}'

# Increase parallelism
kubectl patch flinkdeployment word-count-app -n flink --type merge \
  -p '{"spec":{"job":{"parallelism":16}}}'
```

The operator handles savepointing, stopping the job, updating configuration, and restarting from the savepoint automatically.

## Upgrading Jobs with Savepoints

Update job code while preserving state:

```bash
# Build new version
mvn clean package
docker build -t your-registry/flink-word-count:1.1 .
docker push your-registry/flink-word-count:1.1

# Update deployment with new image
kubectl patch flinkdeployment word-count-app -n flink --type merge \
  -p '{"spec":{"image":"your-registry/flink-word-count:1.1"}}'
```

The operator automatically:
1. Triggers a savepoint
2. Cancels the running job
3. Deploys new version
4. Restarts from the savepoint

Monitor upgrade progress:

```bash
kubectl get flinkdeployment word-count-app -n flink -o yaml | grep -A5 jobStatus
```

## Monitoring Flink Jobs

Access Flink Web UI:

```bash
# Port forward to JobManager
kubectl port-forward svc/word-count-app-rest -n flink 8081:8081
```

Open browser to `http://localhost:8081` to view:
- Job topology and metrics
- Task parallelism and status
- Checkpoint statistics
- Backpressure monitoring

Deploy Prometheus monitoring:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flink-metrics
  namespace: flink
spec:
  selector:
    matchLabels:
      app: flink
  endpoints:
  - port: metrics
    interval: 30s
```

Configure Flink to export metrics:

```yaml
flinkConfiguration:
  metrics.reporter.prom.class: org.apache.flink.metrics.prometheus.PrometheusReporter
  metrics.reporter.prom.port: 9249
```

## Handling Failures and Recovery

Flink automatically recovers from failures using checkpoints:

```bash
# Simulate TaskManager failure
kubectl delete pod word-count-app-taskmanager-1-1 -n flink

# Watch recovery
kubectl get pods -n flink -w
```

The operator recreates failed pods, and Flink restores state from the last checkpoint. Processing continues with exactly-once guarantees.

## Managing Savepoints

Trigger manual savepoints:

```bash
# Create savepoint
kubectl patch flinkdeployment word-count-app -n flink --type merge \
  -p '{"spec":{"job":{"savepointTriggerNonce":1}}}'

# Check savepoint location
kubectl get flinkdeployment word-count-app -n flink \
  -o jsonpath='{.status.jobStatus.savepointInfo.lastSavepoint.location}'
```

Restore from specific savepoint:

```yaml
spec:
  job:
    initialSavepointPath: s3://my-bucket/flink/savepoints/savepoint-abc123
    allowNonRestoredState: false
```

## Best Practices

Follow these guidelines for production:

1. **Use RocksDB for large state** - Memory backend works for small state only
2. **Configure incremental checkpoints** - Reduces checkpoint overhead
3. **Set appropriate parallelism** - Match task slots across TaskManagers
4. **Monitor backpressure** - Indicates bottlenecks in processing
5. **Test savepoint compatibility** - Verify state schema changes work
6. **Size TaskManager memory carefully** - Account for RocksDB and network buffers
7. **Use exactly-once semantics** - Critical for financial and transactional workloads
8. **Retain savepoints for rollback** - Keep several versions for safety

## Conclusion

Apache Flink on Kubernetes with the Flink Operator provides a powerful platform for stream processing. The operator handles the complexity of job lifecycle management, including upgrades with savepoints, automatic recovery from failures, and dynamic scaling. By properly configuring state backends, checkpointing intervals, and resource allocation, you can build robust real-time data processing pipelines that maintain exactly-once semantics even during failures. Monitor job health through metrics and the Flink UI, and test failure scenarios regularly to ensure your recovery procedures work correctly.
