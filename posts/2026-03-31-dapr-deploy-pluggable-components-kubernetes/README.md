# How to Deploy Pluggable Components on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pluggable Component, Kubernetes, Deployment, Container

Description: Deploy Dapr pluggable components as sidecar containers on Kubernetes, configuring Unix socket sharing between the component and Dapr sidecar.

---

## Kubernetes Deployment Model for Pluggable Components

On Kubernetes, pluggable components run as additional sidecar containers within the same pod as your application and Dapr sidecar. All three containers share the pod's network namespace and can share volumes - allowing the Unix domain socket to be passed between containers via an emptyDir volume.

## Pod Structure

```yaml
Pod:
  - Container: app           (your application)
  - Container: daprd         (Dapr sidecar, injected automatically)
  - Container: my-component  (your pluggable component)
  - Volume: dapr-components-unix-domain-socket (emptyDir, shared by daprd and my-component)
```

## Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
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
        dapr.io/pluggable-components-sockets-folder: "/tmp/dapr-components-sockets"
    spec:
      volumes:
        - name: dapr-components-unix-domain-socket
          emptyDir: {}

      containers:
        - name: order-service
          image: myorg/order-service:1.0.0
          ports:
            - containerPort: 8080

        - name: custom-statestore
          image: myorg/dapr-custom-statestore:1.0.0
          env:
            - name: DAPR_COMPONENT_SOCKETS_FOLDER
              value: /tmp/dapr-components-sockets
          volumeMounts:
            - name: dapr-components-unix-domain-socket
              mountPath: /tmp/dapr-components-sockets
```

## Component Manifest

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: custom-statestore
  namespace: default
spec:
  type: state.custom-statestore
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: custom-db-secret
        key: connectionString
```

## RBAC for the Component Container

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pluggable-component-sa
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pluggable-component-role
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pluggable-component-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: pluggable-component-role
subjects:
  - kind: ServiceAccount
    name: pluggable-component-sa
```

## Health Checks for the Component Container

```yaml
containers:
  - name: custom-statestore
    image: myorg/dapr-custom-statestore:1.0.0
    livenessProbe:
      exec:
        command:
          - sh
          - -c
          - test -S /tmp/dapr-components-sockets/custom-statestore.sock
      initialDelaySeconds: 5
      periodSeconds: 10
    readinessProbe:
      exec:
        command:
          - sh
          - -c
          - test -S /tmp/dapr-components-sockets/custom-statestore.sock
      initialDelaySeconds: 3
      periodSeconds: 5
```

## Verifying the Deployment

```bash
# Check all containers are running
kubectl get pods -l app=order-service

# Verify socket is shared
kubectl exec order-service-POD -c daprd -- ls /tmp/dapr-components-sockets/

# Test state store via app pod
kubectl exec order-service-POD -c order-service -- \
  curl -X POST http://localhost:3500/v1.0/state/custom-statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "k1", "value": "test"}]'
```

## Summary

Deploying Dapr pluggable components on Kubernetes requires an emptyDir volume for Unix socket sharing and Dapr's pluggable-components-sockets-folder annotation. Once in place, the pluggable component integrates transparently into the Dapr building block API, with no changes needed in application code.
