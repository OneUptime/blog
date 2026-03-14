# How to Deploy NATS Cluster with JetStream via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, NATS, JetStream, Message Queue, Streaming

Description: Deploy NATS messaging with JetStream persistence on Kubernetes using Flux CD HelmRelease for GitOps-managed cloud-native messaging.

---

## Introduction

NATS is a lightweight, high-performance cloud-native messaging system designed for modern distributed systems. Its core message size is tiny (just a few bytes for the header), latency is measured in microseconds, and it can handle millions of messages per second on modest hardware. JetStream is NATS's built-in persistence layer that adds durable consumers, replay, and at-least-once and exactly-once delivery semantics.

Deploying NATS with JetStream through Flux CD provides a GitOps-managed messaging backbone that is dramatically simpler to operate than Kafka while still supporting persistent, ordered message streams. The official NATS Helm chart exposes all JetStream settings through `values.yaml`.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs (for JetStream)
- `kubectl` and `flux` CLIs installed

## Step 1: Add the NATS HelmRepository

```yaml
# infrastructure/sources/nats-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: nats
  namespace: flux-system
spec:
  interval: 12h
  url: https://nats-io.github.io/k8s/helm/charts
```

## Step 2: Create the Namespace

```yaml
# infrastructure/messaging/nats/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nats
```

## Step 3: Deploy NATS with JetStream

```yaml
# infrastructure/messaging/nats/nats-cluster.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nats
  namespace: nats
spec:
  interval: 30m
  chart:
    spec:
      chart: nats
      version: "1.2.4"
      sourceRef:
        kind: HelmRepository
        name: nats
        namespace: flux-system
  values:
    config:
      cluster:
        enabled: true
        # 3-node NATS cluster for HA
        replicas: 3
        name: production-nats

      jetstream:
        enabled: true
        fileStore:
          # JetStream storage
          enabled: true
          dir: /data
          pvc:
            enabled: true
            size: 10Gi
            storageClassName: premium-ssd
        memoryStore:
          enabled: true
          maxSize: 512Mi

      # Authentication using NATS credentials
      resolver:
        enabled: false   # use static accounts for simplicity

      # TLS configuration
      tls:
        enabled: true
        secret:
          name: nats-tls
        ca: ca.crt
        cert: tls.crt
        key: tls.key

      # NATS server configuration inline
      merge:
        # Maximum message payload (1 MiB default)
        max_payload: 1MB
        # Maximum number of connections
        max_connections: 64K
        # Ping interval
        ping_interval: 2m
        ping_max: 2

    container:
      resources:
        requests:
          cpu: "200m"
          memory: "512Mi"
        limits:
          cpu: "1"
          memory: "1Gi"

    reloader:
      enabled: true
      resources:
        requests:
          cpu: "50m"
          memory: "64Mi"

    # Prometheus metrics via NATS Surveyor
    natsbox:
      enabled: true   # debug box for testing

    # Anti-affinity for cluster HA
    podAntiAffinity: true

    # Prometheus monitoring
    prometheus:
      enabled: true
      port: 7777
```

## Step 4: Configure TLS Certificates with cert-manager

```yaml
# infrastructure/messaging/nats/nats-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: nats-tls
  namespace: nats
spec:
  secretName: nats-tls
  duration: 8760h
  renewBefore: 720h
  subject:
    organizations:
      - myorg
  isCA: false
  privateKey:
    algorithm: RSA
    size: 2048
  dnsNames:
    - "*.nats.svc.cluster.local"
    - "nats.nats.svc.cluster.local"
    - "nats"
  issuerRef:
    name: cluster-issuer
    kind: ClusterIssuer
```

## Step 5: Create JetStream Streams and Consumers via Job

After NATS is running, create streams and consumers using a configuration Job:

```yaml
# infrastructure/messaging/nats/jetstream-setup-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: jetstream-setup
  namespace: nats
spec:
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: nats-cli
          image: natsio/nats-box:0.14.5
          command:
            - /bin/sh
            - -c
            - |
              until nats --server nats://nats.nats.svc.cluster.local:4222 \
                account info 2>/dev/null; do
                echo "Waiting for NATS..."; sleep 5
              done

              # Create orders stream
              nats --server nats://nats.nats.svc.cluster.local:4222 \
                stream add orders \
                --subjects "orders.>" \
                --retention limits \
                --storage file \
                --max-age 7d \
                --max-bytes -1 \
                --max-msgs -1 \
                --replicas 3 \
                --dupe-window 2m \
                --no-prompt

              # Create a pull consumer for order processing
              nats --server nats://nats.nats.svc.cluster.local:4222 \
                consumer add orders order-processor \
                --filter "orders.created" \
                --pull \
                --ack explicit \
                --replay original \
                --deliver all \
                --max-deliver 5 \
                --no-prompt

              echo "JetStream setup complete"
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/nats-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: nats-cluster
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/messaging/nats
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: nats
      namespace: nats
```

## Step 7: Verify the Cluster

```bash
# Check NATS pods
kubectl get pods -n nats

# Connect with nats-box
kubectl exec -n nats deploy/nats-box -- \
  nats --server nats://nats.nats.svc.cluster.local:4222 server info

# Check JetStream status
kubectl exec -n nats deploy/nats-box -- \
  nats --server nats://nats.nats.svc.cluster.local:4222 account info

# List streams
kubectl exec -n nats deploy/nats-box -- \
  nats --server nats://nats.nats.svc.cluster.local:4222 stream ls

# Publish a test message
kubectl exec -n nats deploy/nats-box -- \
  nats --server nats://nats.nats.svc.cluster.local:4222 \
  pub orders.created '{"order_id":"123","status":"created"}'
```

## Best Practices

- Run 3 NATS cluster nodes with `replicas: 3` for Raft quorum in JetStream.
- Set `--dupe-window 2m` on streams to prevent duplicate message delivery when producers retry.
- Use `--ack explicit` on consumers to ensure messages are only acknowledged after successful processing.
- Enable TLS for all production NATS deployments — the nats-server supports mTLS for server and client authentication.
- Monitor JetStream stream storage usage and consumer lag with the Prometheus metrics endpoint.

## Conclusion

NATS with JetStream deployed via Flux CD provides a lightweight, high-performance messaging system with durable streams and at-least-once delivery. Its tiny operational footprint compared to Kafka makes it attractive for microservices that need persistent messaging without the JVM overhead. With Flux managing the NATS cluster configuration, your messaging infrastructure is version-controlled and automatically reconciled, ready to handle production workloads with consistent reliability.
