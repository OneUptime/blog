# How to Use Dapr with Kubernetes StatefulSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, StatefulSet, Actor, Persistent Storage

Description: Deploy Dapr-enabled StatefulSets for stateful workloads like actors and ordered processing, leveraging stable pod identities and persistent volume claims.

---

## Overview

Kubernetes StatefulSets provide stable network identities and persistent storage for pods, making them a natural fit for Dapr actor workloads and stateful microservices that need predictable pod names and storage.

## Basic Dapr StatefulSet

Deploy a Dapr-enabled StatefulSet with persistent storage:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: actor-service
  namespace: default
spec:
  serviceName: actor-service
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
    spec:
      containers:
      - name: actor-service
        image: myregistry/actor-service:latest
        ports:
        - containerPort: 3000
        volumeMounts:
        - name: data
          mountPath: /app/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

## Headless Service for StatefulSet

Create a headless service to enable stable DNS names for each pod:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: actor-service
  namespace: default
spec:
  clusterIP: None
  selector:
    app: actor-service
  ports:
  - port: 3000
    name: app
  - port: 50002
    name: dapr-internal
```

Each pod gets a DNS entry: `actor-service-0.actor-service.default.svc.cluster.local`

## Using Pod Identity in Dapr Actors

Leverage the stable pod identity for partitioned actor processing:

```javascript
const hostname = process.env.HOSTNAME; // e.g., "actor-service-0"
const podIndex = parseInt(hostname.split('-').pop());
const totalPods = 3;

class PartitionedActor {
  async process(actorId) {
    const partition = parseInt(actorId) % totalPods;
    if (partition !== podIndex) {
      throw new Error(`Actor ${actorId} belongs to pod ${partition}`);
    }
    // Process actor logic
  }
}
```

## Ordered Rolling Updates

StatefulSets update pods in reverse ordinal order by default. For Dapr actor workloads, ensure actors drain before shutdown:

```yaml
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: actor-service
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
```

## Scaling StatefulSets

Scale the StatefulSet and verify Dapr actor redistribution:

```bash
kubectl scale statefulset actor-service --replicas=5

# Monitor actor placement redistribution
kubectl logs -n dapr-system dapr-placement-server-0 | grep "actor"

# Verify new pods are Dapr-enabled
kubectl get pods -l app=actor-service -o yaml | grep dapr.io/app-id
```

## Summary

StatefulSets are ideal for Dapr actor services because stable pod identities align well with actor placement requirements. By combining headless services with Dapr annotations, each pod gets both a stable DNS name and a Dapr sidecar. Use `terminationGracePeriodSeconds` to allow actors to finish processing before pods are replaced during rolling updates.
