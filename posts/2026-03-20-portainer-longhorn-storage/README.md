# How to Deploy Longhorn Storage and Manage via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Longhorn, Kubernetes, Storage, Persistent Volume

Description: Deploy Longhorn distributed block storage on Kubernetes and manage volumes, backups, and replicas through both Longhorn UI and Portainer.

## Introduction

Longhorn is a cloud-native distributed block storage system for Kubernetes. It provides persistent volumes with automatic replication, snapshots, and backup capabilities. Portainer can manage the Kubernetes workloads that consume Longhorn volumes, while Longhorn's own UI handles volume-specific operations.

## Prerequisites

- Kubernetes v1.25+ cluster managed by Portainer
- Minimum 3 worker nodes if you want a replica count of 3
- `open-iscsi` installed and `iscsid` running on all nodes
- NFSv4 client packages installed on all nodes if you plan to use Longhorn backups
- `kubectl` and Helm 3 access

## Step 1: Install Prerequisites on All Nodes

```bash
# Install host packages on all Kubernetes nodes

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y open-iscsi nfs-common

# RHEL/CentOS-compatible
sudo yum --setopt=tsflags=noscripts install -y iscsi-initiator-utils nfs-utils
echo "InitiatorName=$(/sbin/iscsi-iname)" | sudo tee /etc/iscsi/initiatorname.iscsi

# Enable and start
sudo systemctl enable --now iscsid

# Verify
sudo systemctl status iscsid

# Check Longhorn prerequisites from a machine with kubeconfig access
# For ARM64 workstations, replace longhornctl-linux-amd64 with longhornctl-linux-arm64
curl -sSfL -o longhornctl https://github.com/longhorn/cli/releases/download/v1.11.1/longhornctl-linux-amd64
chmod +x longhornctl
./longhornctl check preflight
```

## Step 2: Install Longhorn via Helm

```bash
# Add Longhorn Helm repository
helm repo add longhorn https://charts.longhorn.io
helm repo update

# Install Longhorn
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --version 1.11.1 \
  --set defaultSettings.defaultReplicaCount=3 \
  --set defaultSettings.defaultDataPath=/var/lib/longhorn/

# Wait for Longhorn to be ready
kubectl -n longhorn-system wait --for=condition=Ready pod --all --timeout=10m
kubectl -n longhorn-system get pods
```

## Step 3: Access Longhorn UI

```bash
# Create basic auth credentials for the Longhorn UI Ingress
USER=admin
PASSWORD='replace-with-a-strong-password'
echo "${USER}:$(openssl passwd -stdin -apr1 <<< "${PASSWORD}")" > auth
kubectl -n longhorn-system create secret generic basic-auth --from-file=auth

# Create an Ingress for Longhorn UI via kubectl
kubectl apply -f - << 'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: longhorn-ingress
  namespace: longhorn-system
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
spec:
  ingressClassName: nginx
  rules:
  - host: longhorn.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: longhorn-frontend
            port:
              number: 80
EOF

# Or use port-forward for quick access
kubectl -n longhorn-system port-forward svc/longhorn-frontend 8080:80
```

## Step 4: Create Storage Classes

```yaml
# Create a Portainer-specific StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-portainer
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "30"
  fromBackup: ""
  fsType: "ext4"
reclaimPolicy: Retain
volumeBindingMode: Immediate
```

## Step 5: Deploy Applications Using Longhorn via Portainer

In Portainer's Kubernetes interface, deploy a stateful application:

```yaml
# stateful-app.yml - deploy via Portainer
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: default
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: default
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          value: "secretpassword"
        volumeMounts:
        - name: pgdata
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: pgdata
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: longhorn-portainer
      resources:
        requests:
          storage: 10Gi
```

## Step 6: Create Snapshots and Backups

```bash
# Create a snapshot via Longhorn's Snapshot CRD
kubectl apply -f - << 'EOF'
apiVersion: longhorn.io/v1beta2
kind: Snapshot
metadata:
  name: before-upgrade
  namespace: longhorn-system
spec:
  volume: pvc-xxx
  createSnapshot: true
EOF

# Create an S3 credential secret
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: longhorn-s3-secret
  namespace: longhorn-system
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: YOUR_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY: YOUR_SECRET_ACCESS_KEY
EOF

# Configure the default backup target (S3)
helm upgrade longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --reuse-values \
  --set defaultBackupStore.backupTarget=s3://my-bucket@us-east-1/longhorn/ \
  --set defaultBackupStore.backupTargetCredentialSecret=longhorn-s3-secret
```

## Volume Management via Portainer

In Portainer's Kubernetes interface:

1. Go to **Volumes**
2. View PVCs, their storage classes, and which applications use them
3. Expand volumes: open the PVC and click **Increase size**
4. Monitor volume details and events from the volume details page

```bash
# Expand a Longhorn volume
kubectl patch pvc pgdata-postgres-0 -n default \
  -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

## Conclusion

Longhorn provides enterprise-grade persistent storage for Kubernetes workloads managed by Portainer. Its built-in replication, snapshots, and backup capabilities make it ideal for production stateful workloads. Portainer handles the application lifecycle while Longhorn handles the storage lifecycle, a clean separation of concerns that simplifies operations.
