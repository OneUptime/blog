# How to Use Dapr with Kratix Promise-Based Platform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kratix, Platform Engineering, Promise, Kubernetes

Description: Learn how to integrate Dapr with Kratix to deliver Dapr-enabled services as self-service platform promises for your engineering teams.

---

Kratix is a framework for building internal developer platforms (IDPs) on Kubernetes using a promise-based model. When combined with Dapr, platform teams can define promises that automatically provision Dapr-enabled microservices, letting application teams consume distributed capabilities - state management, pub/sub, service invocation - without deep infrastructure knowledge.

## Understanding Kratix Promises

A Kratix Promise is a custom Kubernetes resource that describes what a platform team offers. It contains a CRD (the request API), a pipeline to fulfill requests, and worker cluster resources to install. For Dapr, you write a promise that provisions a namespace, installs the Dapr sidecar annotation, and wires up required components.

```yaml
apiVersion: platform.kratix.io/v1alpha1
kind: Promise
metadata:
  name: dapr-microservice
spec:
  api:
    apiVersion: apiextensions.k8s.io/v1
    kind: CustomResourceDefinition
    metadata:
      name: dapr-microservices.workshop.kratix.io
    spec:
      group: workshop.kratix.io
      names:
        kind: DaprMicroservice
        plural: dapr-microservices
      scope: Namespaced
      versions:
        - name: v1alpha1
          schema:
            openAPIV3Schema:
              properties:
                spec:
                  properties:
                    appName:
                      type: string
                    stateStore:
                      type: string
                      default: redis
                  type: object
              type: object
          served: true
          storage: true
```

## Writing the Promise Pipeline

The pipeline runs when a developer requests a DaprMicroservice. It generates the Kubernetes manifests that Kratix writes to the worker cluster.

```bash
#!/bin/sh
# pipeline/scripts/generate-resources.sh

APP_NAME=$(yq '.spec.appName' /kratix/input/object.yaml)
STATE_STORE=$(yq '.spec.stateStore' /kratix/input/object.yaml)

mkdir -p /kratix/output

cat > /kratix/output/namespace.yaml <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ${APP_NAME}
  labels:
    dapr-enabled: "true"
EOF

cat > /kratix/output/statestore-component.yaml <<EOF
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: ${APP_NAME}
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master.${STATE_STORE}.svc.cluster.local:6379
  - name: actorStateStore
    value: "true"
EOF
```

## Requesting a Dapr Microservice as a Developer

Once the promise is installed on the platform cluster, developers submit a simple resource request:

```yaml
apiVersion: workshop.kratix.io/v1alpha1
kind: DaprMicroservice
metadata:
  name: order-service
  namespace: default
spec:
  appName: order-service
  stateStore: redis
```

```bash
kubectl apply -f dapr-microservice-request.yaml
kubectl get dapr-microservices -w
```

Kratix runs the pipeline, writes the output manifests to a GitOps repository, and a flux or ArgoCD agent on the worker cluster applies them automatically.

## Installing Worker Cluster Dependencies

Use the `dependencies` section of the promise to pre-install the Dapr operator on every registered worker cluster:

```yaml
  dependencies:
    - apiVersion: helm.crossplane.io/v1beta1
      kind: Release
      metadata:
        name: dapr
      spec:
        forProvider:
          chart:
            name: dapr
            repository: https://dapr.github.io/helm-charts/
            version: "1.17.4"
          namespace: dapr-system
          skipCreateNamespace: false
```

## Testing the Promise End-to-End

```bash
# Register a worker cluster
kubectl apply -f worker-cluster-registration.yaml

# Apply the Dapr promise
kubectl apply -f dapr-microservice-promise.yaml

# Check promise status
kubectl get promises

# Request a service
kubectl apply -f order-service-request.yaml

# Verify on the worker cluster
kubectl get pods -n order-service
kubectl get components -n order-service
```

## Summary

Kratix promises allow platform teams to codify Dapr-enabled microservice blueprints that developers self-service on demand. The pipeline model separates infrastructure concerns from application concerns, and worker cluster resources ensure Dapr is available wherever services are deployed.
