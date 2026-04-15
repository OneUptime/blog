# How to Deploy Dapr Applications on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Deployment, Sidecar, Microservice

Description: Learn how to deploy Dapr-enabled applications on Kubernetes by adding sidecar annotations, defining components, and verifying sidecar injection.

---

## How Dapr Works on Kubernetes

Dapr runs as a sidecar container alongside your application pod. You enable the sidecar by adding annotations to your Kubernetes Deployment spec. The Dapr sidecar injector webhook automatically injects the `daprd` container when these annotations are present.

## Annotating Your Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
        dapr.io/log-level: "info"
    spec:
      containers:
      - name: order-service
        image: myregistry/order-service:v1.2.0
        ports:
        - containerPort: 8080
        env:
        - name: DAPR_HTTP_PORT
          value: "3500"
        - name: DAPR_GRPC_PORT
          value: "50001"
```

## Deploying a State Store Component

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
    value: redis-master:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: redis-password
```

```bash
kubectl apply -f statestore-component.yaml
kubectl apply -f order-service.yaml

# Verify the sidecar was injected
kubectl get pods -l app=order-service
kubectl describe pod order-service-xxxxxxxxx | grep -A5 "daprd"
```

## Verifying Sidecar Injection

```bash
# Pod should show 2/2 READY (app container + daprd sidecar)
kubectl get pods -l app=order-service
# NAME                             READY   STATUS    RESTARTS   AGE
# order-service-5f9d4c76d-8xp2k   2/2     Running   0          45s

# Check dapr annotations were picked up
kubectl get pod order-service-5f9d4c76d-8xp2k -o jsonpath='{.metadata.annotations}'
```

## Testing the Deployment

Port-forward directly to the Dapr HTTP port for local testing:

```bash
kubectl port-forward deploy/order-service 3500:3500 &

# Invoke via Dapr sidecar
curl http://localhost:3500/v1.0/invoke/order-service/method/orders
```

## Viewing Application Logs

```bash
# App container logs
kubectl logs -l app=order-service -c order-service

# Dapr sidecar logs
kubectl logs -l app=order-service -c daprd
```

## Summary

Deploying Dapr applications on Kubernetes requires only a few annotations on your Deployment spec. The sidecar injector webhook handles all the injection automatically, and Dapr components are registered by applying CRD manifests. Verify your deployment by checking that pods show 2/2 READY containers.
