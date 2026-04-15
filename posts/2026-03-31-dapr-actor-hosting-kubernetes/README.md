# How to Use Dapr Actor Hosting in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Kubernetes, Deployment, Hosting

Description: Learn how to deploy and host Dapr virtual actors on Kubernetes, including sidecar injection, placement service configuration, and scaling considerations.

---

## Introduction

Hosting Dapr actors on Kubernetes provides automatic sidecar injection, a distributed Placement Service for actor routing, and native Kubernetes scaling and availability features. The Dapr control plane components manage actor registration and routing, so your application only needs to expose actor method endpoints and advertise its supported actor types.

## Architecture Overview

```mermaid
flowchart TB
    subgraph KubernetesCluster["Kubernetes Cluster"]
        subgraph DaprControlPlane["Dapr Control Plane"]
            PS[Placement Service]
            OP[Operator]
            Sentry[Sentry mTLS]
        end

        subgraph AppPod1["App Pod 1"]
            App1[Actor App Container]
            Sidecar1[Dapr Sidecar]
        end

        subgraph AppPod2["App Pod 2"]
            App2[Actor App Container]
            Sidecar2[Dapr Sidecar]
        end

        StateStore[(Redis State Store)]
    end

    PS --> Sidecar1
    PS --> Sidecar2
    Sidecar1 <--> Sidecar2
    Sidecar1 --> StateStore
    Sidecar2 --> StateStore
```

## Prerequisites

- Kubernetes cluster (1.22+)
- Dapr installed on Kubernetes (`dapr init -k`)
- A state store component with `actorStateStore: "true"`
- Your actor application containerized and pushed to a registry

## Step 1: Install Dapr on Kubernetes

```bash
dapr init -k
```

Verify the installation:

```bash
dapr status -k
```

Expected output:

```text
  NAME                   NAMESPACE    HEALTHY  STATUS   REPLICAS  VERSION
  dapr-operator          dapr-system  True     Running  1         1.x.x
  dapr-placement-server  dapr-system  True     Running  1         1.x.x
  dapr-scheduler-server  dapr-system  True     Running  1         1.x.x
  dapr-sentry            dapr-system  True     Running  1         1.x.x
  dapr-sidecar-injector  dapr-system  True     Running  1         1.x.x
```

## Step 2: Deploy the State Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master.default.svc.cluster.local:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: actorStateStore
    value: "true"
```

```bash
kubectl apply -f statestore.yaml
```

## Step 3: Deploy the Actor Application

Annotate your Kubernetes Deployment to enable Dapr sidecar injection:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: actor-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: actor-service
  template:
    metadata:
      labels:
        app: actor-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "actor-service"
        dapr.io/app-port: "3000"
        dapr.io/log-level: "info"
        dapr.io/config: "actorconfig"
    spec:
      containers:
      - name: actor-service
        image: myregistry/actor-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: APP_PORT
          value: "3000"
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

## Step 4: Configure Actor Settings (Optional)

Actor runtime settings such as reentrancy, idle timeout, and reminder storage partitions are configured in your application code, not in a Kubernetes Configuration resource. Your app exposes these settings to the Dapr sidecar via the `/dapr/config` HTTP endpoint at startup.

For example, in a Node.js app using the Dapr JS SDK:

```javascript
const { DaprServer } = require("@dapr/dapr");

const server = new DaprServer({
  actor: {
    actorIdleTimeout: "1h",
    actorScanInterval: "30s",
    drainOngoingCallTimeout: "60s",
    drainRebalancedActors: true,
    reentrancy: {
      enabled: false,
    },
    remindersStoragePartitions: 0,
  },
});
```

If you referenced a Dapr `Configuration` resource via the `dapr.io/config` annotation (as shown in Step 3), that resource is used for general sidecar settings like tracing, metrics, and mTLS — not for actor-specific configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: actorconfig
  namespace: default
spec:
  tracing:
    samplingRate: "1"
  metrics:
    enabled: true
```

```bash
kubectl apply -f actorconfig.yaml
```

## Step 5: Deploy a Service for Your App

Since actors are invoked through the Dapr sidecar (not directly), you typically do not need a Kubernetes Service for external traffic. For inter-service calls, Dapr uses the app ID for service discovery. If you need external access:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: actor-service
  namespace: default
spec:
  selector:
    app: actor-service
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

## Verifying Actor Registration

Check that the Dapr sidecar is running in your pods:

```bash
kubectl get pods -l app=actor-service
```

Check sidecar logs for actor registration:

```bash
kubectl logs deployment/actor-service -c daprd | grep -i actor
```

You should see log lines like:

```text
time="..." level=info msg="Actor runtime started. Actor idle timeout: 1h0m0s. Actor scan interval: 30s"
time="..." level=info msg="Registered actor types: [CounterActor]"
```

## Placement Service and Actor Distribution

The Placement Service distributes actors evenly across available pods. When a pod is added or removed, the Placement Service rebalances actor assignments.

```mermaid
flowchart LR
    PS[Placement Service] --> |Pod 1: actors A,B,C| Sidecar1
    PS --> |Pod 2: actors D,E,F| Sidecar2
    PS --> |Pod 3: actors G,H,I| Sidecar3
    Sidecar1 --> App1[Actor App Pod 1]
    Sidecar2 --> App2[Actor App Pod 2]
    Sidecar3 --> App3[Actor App Pod 3]
```

## Scaling Considerations

When scaling a Deployment hosting actors, Dapr will redistribute actor ownership across new pods. In-flight actor method calls complete before redistribution. Consider:

- **Graceful termination**: Set a long enough `terminationGracePeriodSeconds` to allow in-flight actor calls to complete
- **Placement partition size**: With many actor types, increase the Placement Service replicas for HA
- **State store capacity**: Ensure your Redis or other state store can handle the actor state load

```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
```

## Summary

Hosting Dapr actors on Kubernetes is straightforward: install the Dapr control plane, annotate your Deployment for sidecar injection, and deploy your actor application. The Placement Service automatically handles actor distribution across pods. Use a Dapr Configuration resource to tune actor settings, and ensure your state store component has `actorStateStore: "true"`. With multiple replicas, Dapr distributes actors automatically, providing scalability and fault tolerance.
