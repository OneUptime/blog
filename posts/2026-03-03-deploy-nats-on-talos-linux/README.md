# How to Deploy NATS on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NATS, Kubernetes, Messaging, Cloud Native, DevOps

Description: Deploy NATS messaging system on Talos Linux with JetStream persistence, clustering, and lightweight high-performance message routing.

---

NATS is a lightweight, high-performance messaging system built for cloud-native applications. Unlike heavier message brokers, NATS focuses on simplicity and speed, handling millions of messages per second with minimal resource consumption. With JetStream, NATS also provides persistent messaging with at-least-once delivery guarantees. Running NATS on Talos Linux is a natural pairing since both prioritize simplicity and minimal overhead.

This guide covers deploying NATS on Talos Linux, from a basic cluster to a full JetStream-enabled deployment with monitoring.

## Why NATS on Talos Linux

NATS and Talos Linux share a similar philosophy: do one thing well with minimal complexity. NATS gives you a messaging backbone that is easy to operate, and Talos Linux gives you an OS that requires zero maintenance. Together, they create a messaging layer that runs reliably without constant attention. NATS is also written in Go and compiles to a single binary, which fits perfectly with the containerized, minimalist approach of Talos Linux.

## Prerequisites

- Talos Linux cluster with at least three worker nodes
- `kubectl` and `helm` installed
- A StorageClass for JetStream persistence (optional for core NATS)

## Step 1: Install NATS Using Helm

The NATS Helm chart is the easiest way to deploy NATS on Kubernetes:

```bash
# Add the NATS Helm repository
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update

# Create namespace
kubectl create namespace nats
```

## Step 2: Configure and Deploy NATS

```yaml
# nats-values.yaml
config:
  cluster:
    enabled: true
    replicas: 3
  jetstream:
    enabled: true
    memStorage:
      enabled: true
      size: "1Gi"
    fileStorage:
      enabled: true
      size: "10Gi"
      storageClassName: "local-path"
  monitor:
    enabled: true
    port: 8222
  merge:
    max_payload: "8MB"
    max_connections: 10000

podTemplate:
  topologySpreadConstraints:
    kubernetes.io/hostname:
      maxSkew: 1
      whenUnsatisfied: DoNotSchedule

container:
  merge:
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
      limits:
        memory: "1Gi"
        cpu: "500m"
```

```bash
# Install NATS with custom values
helm install nats nats/nats \
  --namespace nats \
  --values nats-values.yaml
```

## Step 3: Verify the Deployment

```bash
# Check NATS pods
kubectl get pods -n nats

# Check NATS cluster status
kubectl exec -it nats-0 -n nats -- nats-server --help

# Install nats CLI tool locally
# On macOS
brew install nats-io/nats-tools/nats

# Or use the NATS box utility pod
kubectl run nats-box --rm -it --restart=Never \
  --image=natsio/nats-box -- sh
```

## Step 4: Test Core NATS Messaging

```bash
# Deploy a NATS box for testing
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: nats-box
  namespace: nats
spec:
  containers:
    - name: nats-box
      image: natsio/nats-box:latest
      command: ["sleep", "infinity"]
EOF

# Subscribe to a subject (in one terminal)
kubectl exec -it nats-box -n nats -- \
  nats sub "orders.>" --server nats://nats:4222

# Publish a message (in another terminal)
kubectl exec -it nats-box -n nats -- \
  nats pub orders.created '{"id": "123", "total": 99.99}' \
  --server nats://nats:4222
```

## Step 5: Work with JetStream

JetStream adds persistence, replay, and exactly-once semantics to NATS:

```bash
# Create a stream
kubectl exec -it nats-box -n nats -- \
  nats stream add ORDERS \
  --subjects "orders.>" \
  --retention limits \
  --max-msgs -1 \
  --max-bytes -1 \
  --max-age 72h \
  --storage file \
  --replicas 3 \
  --discard old \
  --server nats://nats:4222

# Create a consumer
kubectl exec -it nats-box -n nats -- \
  nats consumer add ORDERS order-processor \
  --filter "orders.created" \
  --ack explicit \
  --deliver all \
  --replay instant \
  --max-deliver 5 \
  --server nats://nats:4222

# Publish messages to the stream
kubectl exec -it nats-box -n nats -- \
  nats pub orders.created '{"id": "456", "item": "widget"}' \
  --server nats://nats:4222

# Check stream info
kubectl exec -it nats-box -n nats -- \
  nats stream info ORDERS --server nats://nats:4222
```

## Step 6: Manual Deployment with StatefulSet

If you prefer not to use Helm, here is a manual deployment:

```yaml
# nats-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats
  namespace: nats
spec:
  serviceName: nats-headless
  replicas: 3
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
        - name: nats
          image: nats:2.10-alpine
          ports:
            - containerPort: 4222
              name: client
            - containerPort: 6222
              name: cluster
            - containerPort: 8222
              name: monitor
          args:
            - "-c"
            - "/etc/nats/nats.conf"
          volumeMounts:
            - name: nats-config
              mountPath: /etc/nats
            - name: nats-data
              mountPath: /data/jetstream
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          # Health check using NATS monitoring endpoint
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8222
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /healthz?js-enabled-only=true
              port: 8222
            initialDelaySeconds: 10
            periodSeconds: 5
      volumes:
        - name: nats-config
          configMap:
            name: nats-config
  volumeClaimTemplates:
    - metadata:
        name: nats-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 10Gi
```

```yaml
# nats-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nats-config
  namespace: nats
data:
  nats.conf: |
    # Server settings
    port: 4222
    http_port: 8222
    max_payload: 8MB
    max_connections: 10000

    # Cluster configuration
    cluster {
      port: 6222
      name: talos-nats-cluster
      routes [
        nats-route://nats-0.nats-headless.nats.svc.cluster.local:6222
        nats-route://nats-1.nats-headless.nats.svc.cluster.local:6222
        nats-route://nats-2.nats-headless.nats.svc.cluster.local:6222
      ]
    }

    # JetStream configuration
    jetstream {
      store_dir: /data/jetstream
      max_mem: 1G
      max_file: 10G
    }
```

## Request-Reply Pattern

NATS excels at the request-reply pattern for synchronous communication:

```bash
# Start a service that replies to requests
kubectl exec -it nats-box -n nats -- \
  nats reply "service.time" --server nats://nats:4222 \
  "The current time is: {{Time}}"

# Send a request
kubectl exec -it nats-box -n nats -- \
  nats request "service.time" "" --server nats://nats:4222
```

## Monitoring NATS

NATS exposes monitoring endpoints on port 8222:

```bash
# View server info
kubectl exec -it nats-box -n nats -- \
  curl http://nats:8222/varz

# View connection info
kubectl exec -it nats-box -n nats -- \
  curl http://nats:8222/connz

# View JetStream info
kubectl exec -it nats-box -n nats -- \
  curl http://nats:8222/jsz

# View route info (cluster)
kubectl exec -it nats-box -n nats -- \
  curl http://nats:8222/routez
```

For Prometheus integration, use the NATS Prometheus exporter:

```yaml
# nats-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats-exporter
  namespace: nats
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nats-exporter
  template:
    metadata:
      labels:
        app: nats-exporter
    spec:
      containers:
        - name: exporter
          image: natsio/prometheus-nats-exporter:latest
          args:
            - -varz
            - -jsz=all
            - -connz
            - http://nats:8222
          ports:
            - containerPort: 7777
```

## Conclusion

NATS on Talos Linux delivers a messaging system that is fast, simple, and reliable. The lightweight nature of both NATS and Talos Linux means you get excellent performance without wasting resources. JetStream adds the persistence layer when you need durable messaging, and the built-in clustering keeps your messaging available through node failures. Whether you use the Helm chart or deploy manually, NATS is straightforward to operate on Talos Linux, making it a strong choice for microservice communication, event-driven architectures, and IoT messaging workloads.
