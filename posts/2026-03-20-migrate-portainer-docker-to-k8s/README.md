# How to Migrate Portainer from Docker to Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Kubernetes, Migration, Helm

Description: Migrate your Portainer installation from a standalone Docker deployment to a Kubernetes cluster for improved high availability and scalability.

## Introduction

As organizations grow, running Portainer on a single Docker host becomes a single point of failure. Migrating to Kubernetes provides high availability, automatic restarts, and resource management for the Portainer server itself. This guide covers migrating Portainer from Docker standalone to Kubernetes.

## Prerequisites

- Existing Portainer on Docker
- A running Kubernetes cluster
- Helm 3 installed
- `kubectl` configured for the target cluster
- Persistent storage available in the cluster

## Step 1: Export Portainer Data

```bash
# On the Docker host: Stop and backup Portainer

docker stop portainer

docker run --rm \
  -v portainer_data:/data \
  -v /tmp/portainer-backup:/backup \
  alpine tar czf /backup/portainer-k8s-migration.tar.gz -C /data .

echo "Backup created: $(ls -lh /tmp/portainer-backup/)"
```

## Step 2: Create a PVC for the Backup

```bash
# Transfer the backup to the Kubernetes cluster node
# or to a node that has kubectl access

# Create a PVC for Portainer in Kubernetes
kubectl create namespace portainer

cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: portainer-data
  namespace: portainer
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard  # Adjust for your cluster
EOF
```

## Step 3: Restore Data to Kubernetes PVC

```bash
# Create a restore pod to load data into the PVC
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: portainer-restore
  namespace: portainer
spec:
  containers:
  - name: restore
    image: alpine
    command: ["sleep", "infinity"]
    volumeMounts:
    - name: portainer-data
      mountPath: /data
  volumes:
  - name: portainer-data
    persistentVolumeClaim:
      claimName: portainer-data
  restartPolicy: Never
EOF

# Wait for pod to be ready
kubectl -n portainer wait --for=condition=Ready pod/portainer-restore --timeout=60s

# Copy backup into the pod
kubectl -n portainer cp /tmp/portainer-backup/portainer-k8s-migration.tar.gz \
  portainer-restore:/tmp/portainer-backup.tar.gz

# Restore the data
kubectl -n portainer exec portainer-restore -- \
  tar xzf /tmp/portainer-backup.tar.gz -C /data

# Verify
kubectl -n portainer exec portainer-restore -- ls -la /data

# Clean up restore pod
kubectl -n portainer delete pod portainer-restore
```

## Step 4: Install Portainer via Helm

```bash
# Add Portainer Helm repo
helm repo add portainer https://portainer.github.io/k8s/
helm repo update

# Install Portainer using the existing PVC
helm install portainer portainer/portainer \
  --namespace portainer \
  --set service.type=LoadBalancer \
  --set persistence.existingClaim=portainer-data \
  --set tls.force=true

# Watch deployment
kubectl -n portainer get pods -w
```

## Step 5: Configure High Availability (Optional)

For production HA, use an external database:

```yaml
# portainer-values.yaml
replicaCount: 1  # Portainer CE is single-instance
                  # Portainer BE supports HA

persistence:
  existingClaim: portainer-data

service:
  type: LoadBalancer

ingress:
  enabled: true
  ingressClassName: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: portainer.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: portainer-tls
      hosts:
        - portainer.example.com
```

```bash
helm upgrade portainer portainer/portainer \
  --namespace portainer \
  -f portainer-values.yaml
```

## Step 6: Verify Migration

```bash
# Check pod status
kubectl -n portainer get pods
kubectl -n portainer describe deployment portainer

# Check logs
kubectl -n portainer logs deployment/portainer

# Get external access URL
kubectl -n portainer get svc portainer
```

## Step 7: Update DNS and Remove Docker Instance

```bash
# Update DNS to point to the Kubernetes service LB IP
# or configure an Ingress

# After verification, remove Docker Portainer
docker stop portainer
docker rm portainer
docker volume rm portainer_data
```

Resource Requirements

```yaml
# Recommended resources for Portainer in Kubernetes
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "1Gi"
    cpu: "500m"
```

## Conclusion

Migrating Portainer from Docker to Kubernetes improves reliability and integrates Portainer itself into the infrastructure it manages. The data migration process preserves all users, environments, stacks, and configurations. Once on Kubernetes, Portainer benefits from automatic restarts, resource management, and can be managed with the same GitOps practices you apply to other workloads.
