# How to Deploy Containerized Workloads at the Edge Using MicroShift on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MicroShift, Edge Computing, Containers, Kubernetes, Linux

Description: Deploy and manage containerized workloads on edge devices running MicroShift on RHEL, including persistent storage and offline operation.

---

MicroShift on RHEL provides a Kubernetes-compatible platform for running containers at the edge. This guide covers deploying real workloads with persistent storage, networking, and considerations for edge environments.

## Deploying a Web Application

Create a deployment manifest for an edge web application:

```yaml
# edge-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-web
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: edge-web
  template:
    metadata:
      labels:
        app: edge-web
    spec:
      containers:
        - name: web
          image: registry.access.redhat.com/ubi9/httpd-24:latest
          ports:
            - containerPort: 8080
          resources:
            # Set resource limits for edge devices
            limits:
              memory: "256Mi"
              cpu: "500m"
            requests:
              memory: "128Mi"
              cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: edge-web
  namespace: default
spec:
  type: NodePort
  selector:
    app: edge-web
  ports:
    - port: 8080
      targetPort: 8080
      nodePort: 30080
```

Apply the deployment:

```bash
kubectl apply -f edge-app.yaml
kubectl get pods -w
```

## Using Persistent Storage

MicroShift includes a built-in LVMS (Logical Volume Manager Storage) CSI driver:

```yaml
# pvc-edge.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: edge-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: topolvm-provisioner
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-db
spec:
  replicas: 1
  selector:
    matchLabels:
      app: edge-db
  template:
    metadata:
      labels:
        app: edge-db
    spec:
      containers:
        - name: db
          image: registry.redhat.io/rhel9/postgresql-15:latest
          env:
            - name: POSTGRESQL_USER
              value: "edgeuser"
            - name: POSTGRESQL_PASSWORD
              value: "edgepass"
            - name: POSTGRESQL_DATABASE
              value: "edgedb"
          volumeMounts:
            - name: db-storage
              mountPath: /var/lib/pgsql/data
          resources:
            limits:
              memory: "512Mi"
              cpu: "500m"
      volumes:
        - name: db-storage
          persistentVolumeClaim:
            claimName: edge-data
```

```bash
kubectl apply -f pvc-edge.yaml
kubectl get pvc
```

## Pre-Pulling Images for Offline Operation

Edge devices may have intermittent connectivity. Pre-pull images:

```bash
# Pull images to the local CRI-O cache
sudo crictl pull registry.access.redhat.com/ubi9/httpd-24:latest
sudo crictl pull registry.redhat.io/rhel9/postgresql-15:latest

# List cached images
sudo crictl images
```

## Monitoring Edge Workloads

```bash
# Check resource usage on the edge node
kubectl top nodes
kubectl top pods

# View logs from edge applications
kubectl logs deployment/edge-web -f

# Check events for troubleshooting
kubectl get events --sort-by='.lastTimestamp'
```

Set resource limits on all edge workloads to prevent a single application from consuming all resources on the constrained edge device.
