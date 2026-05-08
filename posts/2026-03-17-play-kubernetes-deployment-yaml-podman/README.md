# How to Play a Kubernetes Deployment YAML with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, YAML, Deployment

Description: Learn how to use podman play kube to run Kubernetes Deployment manifests locally.

---

> Podman can play Kubernetes Deployment YAML files, creating a pod from the Deployment's pod template.

Kubernetes Deployments are the standard way to manage stateless applications. Podman can interpret Deployment YAML and create a local pod based on the pod template specification. While Podman does not replicate the full Deployment controller behavior (rolling updates, replica management), it does create the pod and containers defined in the template.

---

## Playing a Basic Deployment

```bash
# Create a Kubernetes Deployment manifest

cat > /tmp/web-deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: nginx
          image: docker.io/library/nginx:alpine
          ports:
            - containerPort: 80
              hostPort: 8080
EOF

# Play the Deployment YAML
podman play kube /tmp/web-deployment.yaml

# Podman creates a pod from the template
podman pod ls
podman ps
```

## Playing a Multi-Container Deployment

```bash
cat > /tmp/app-deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: api
          image: docker.io/library/node:20-alpine
          command: ["sleep", "3600"]
          env:
            - name: PORT
              value: "3000"
            - name: DB_HOST
              value: "localhost"
          ports:
            - containerPort: 3000
        - name: db
          image: docker.io/library/postgres:16-alpine
          env:
            - name: POSTGRES_PASSWORD
              value: "secret"
          ports:
            - containerPort: 5432
EOF

podman play kube /tmp/app-deployment.yaml

# Both containers run in the same pod
podman ps --filter pod=app-deployment-pod
```

## Playing a Deployment with Volumes

```bash
cat > /tmp/stateful-deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: data
  template:
    metadata:
      labels:
        app: data
    spec:
      containers:
        - name: app
          image: docker.io/library/alpine
          command: ["sh", "-c", "echo data > /storage/test.txt && sleep 3600"]
          volumeMounts:
            - name: storage
              mountPath: /storage
      volumes:
        - name: storage
          persistentVolumeClaim:
            claimName: data-pvc
EOF

podman play kube /tmp/stateful-deployment.yaml

# Podman creates a named volume for the PVC
podman volume ls
```

## Replacing an Existing Deployment

```bash
# Update the image version in the YAML and replay
podman play kube --replace /tmp/web-deployment.yaml

# The old pod is removed and a new one is created
```

## Tearing Down a Deployment

```bash
# Remove all resources created by the Deployment
podman play kube --down /tmp/web-deployment.yaml

# Verify cleanup
podman pod ls
podman ps -a
```

## Limitations

Podman's `play kube` for Deployments does not provide:
- Replica management (only one pod is created regardless of replicas field)
- Rolling updates
- Full Deployment controller reconciliation, such as creating replacement pods when pods are deleted or rescheduling them to another node

These features require a full Kubernetes cluster.

## Summary

Use `podman play kube` to run Kubernetes Deployment YAML files locally. Podman creates a pod from the Deployment's pod template with all containers, environment variables, and volume mounts. While replica management and rolling updates are not supported locally, this is an effective way to test Deployment manifests before applying them to a cluster.
