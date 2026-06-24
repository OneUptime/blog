# How to Configure Google Cloud Provider in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, GCP, Google Cloud, Cloud Provider

Description: Configure the Google Cloud cloud provider in Rancher-managed clusters to enable GCP Load Balancers, Persistent Disks, and Filestore integration.

## Introduction

Integrating the Google Cloud external cloud provider with Rancher-managed clusters unlocks GCP-native features: automatic Google Cloud Load Balancer provisioning, dynamic Persistent Disk volumes, and Filestore-backed PersistentVolumes. This guide covers the full setup for RKE2 clusters running on GCE instances.

## Prerequisites

- RKE2 cluster running on Google Compute Engine (GCE) VMs, managed by Rancher
- A GCP Service Account with required IAM roles
- `gcloud`, `kubectl`, and `git` CLI configured locally

## Step 1: Create a GCP Service Account

```bash
PROJECT_ID="my-gcp-project"
SA_NAME="rancher-cloud-provider"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Enable the required APIs
gcloud services enable compute.googleapis.com file.googleapis.com \
  --project="${PROJECT_ID}"

# Create the service account
gcloud iam service-accounts create "${SA_NAME}" \
  --display-name="Rancher Kubernetes Cloud Provider" \
  --project="${PROJECT_ID}"

# Assign required roles
for role in \
  roles/compute.admin \
  roles/file.editor \
  roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${role}"
done

# Download the key file
gcloud iam service-accounts keys create \
  /tmp/gcp-cloud-provider-key.json \
  --iam-account="${SA_EMAIL}" \
  --project="${PROJECT_ID}"
```

## Step 2: Create the Cloud Provider Secrets

```bash
# Secret for the GCP cloud controller manager
kubectl create secret generic gcp-cloud-provider \
  --from-file=cloud-sa.json=/tmp/gcp-cloud-provider-key.json \
  -n kube-system

# Secret for the GCE Persistent Disk CSI driver
kubectl create namespace gce-pd-csi-driver
kubectl create secret generic cloud-sa \
  --from-file=cloud-sa.json=/tmp/gcp-cloud-provider-key.json \
  -n gce-pd-csi-driver

# Secret for the GCP Filestore CSI driver
kubectl create namespace gcp-filestore-csi-driver
kubectl create secret generic gcp-filestore-csi-driver-sa \
  --from-file=gcp_filestore_csi_driver_sa.json=/tmp/gcp-cloud-provider-key.json \
  -n gcp-filestore-csi-driver
```

## Step 3: Configure RKE2 with GCP Cloud Provider

```yaml
# /etc/rancher/rke2/config.yaml (server nodes)
disable-cloud-controller: true
cloud-provider-name: external
```

```yaml
# /etc/rancher/rke2/config.yaml (agent nodes)
cloud-provider-name: external
```

Create a cloud config file on each control-plane node. The GCP CCM can still discover unset values from GCE metadata, but this file is the supported place to provide explicit network and project settings:

```ini
# /etc/kubernetes/cloud.config
[global]
token-url = nil
project-id = my-gcp-project
network-project-id = my-gcp-project
network-name = my-vpc
subnetwork-name = my-subnet
node-tags = rancher-cluster-node
node-instance-prefix = cluster-node-
```

```bash
# On server nodes
sudo systemctl restart rke2-server

# On agent nodes
sudo systemctl restart rke2-agent
```

## Step 4: Install the GCP Cloud Controller Manager

```bash
# Deploy the upstream RBAC and DaemonSet template.
# Use the cloud-provider-gcp release that matches your Kubernetes minor version.
kubectl apply -k "github.com/kubernetes/cloud-provider-gcp/deploy/packages/default?ref=v35.0.8"

# Pin the controller image and configure it for GCE
kubectl -n kube-system patch daemonset cloud-controller-manager --type='strategic' -p '
spec:
  template:
    spec:
      containers:
      - name: cloud-controller-manager
        image: registry.k8s.io/cloud-provider-gcp/cloud-controller-manager:v35.0.8
        args:
        - --cloud-provider=gce
        - --use-service-account-credentials
        - --secure-port=10258
        - --cloud-config=/etc/kubernetes/cloud.config
        env:
        - name: GOOGLE_APPLICATION_CREDENTIALS
          value: /etc/gcp/cloud-sa.json
        volumeMounts:
        - name: gcp-cloud-sa
          mountPath: /etc/gcp
          readOnly: true
      volumes:
      - name: gcp-cloud-sa
        secret:
          secretName: gcp-cloud-provider
'
```

## Step 5: Install the GCE Persistent Disk CSI Driver

```bash
# The upstream project publishes versioned overlays; stable-master tracks the
# latest supported Kubernetes releases for manual deployments.
kubectl apply -k "github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver/deploy/kubernetes/overlays/stable-master?ref=master"
```

## Step 6: Create GCP StorageClasses

```yaml
# gcp-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd          # pd-standard or pd-ssd or pd-balanced
  replication-type: none
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-standard
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-standard
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

```bash
kubectl apply -f gcp-storageclass.yaml
kubectl get storageclass
```

## Step 7: Configure GCP Filestore (NFS) CSI (Optional)

```bash
# Install the GCP Filestore CSI driver
kubectl apply -k "github.com/kubernetes-sigs/gcp-filestore-csi-driver/deploy/kubernetes/overlays/stable-master?ref=master"
```

## Step 8: Verify the Integration

```bash
# Test Google Cloud Load Balancer provisioning
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx \
  --type=LoadBalancer \
  --port=80 \
  --name=gcp-lb-test

kubectl get service gcp-lb-test -w
# EXTERNAL-IP should show a GCP external IP

# Test PVC provisioning
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: gcp-pd-test
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: gcp-ssd
  resources:
    requests:
      storage: 20Gi
EOF

kubectl get pvc gcp-pd-test -w
```

## Common Issues

| Issue | Cause | Resolution |
|---|---|---|
| `LB IP pending` | GCP CCM is not running or lacks Compute Engine permissions | Check `kubectl get pods -n kube-system -l component=cloud-controller-manager` and review the CCM logs |
| `PVC fails to bind` | PD CSI driver pod not running or `cloud-sa` secret missing | Check `kubectl get pods -n gce-pd-csi-driver` and verify the `cloud-sa` secret exists |
| `cannot get instance metadata` | GCP CCM is not running on GCE or the cloud config/credentials are wrong | Verify GCE metadata access, `/etc/kubernetes/cloud.config`, and the `gcp-cloud-provider` secret |

## Conclusion

The Google Cloud external cloud provider integration in Rancher gives you full GCP infrastructure automation from within Kubernetes. With the GCP CCM, PD CSI Driver, and appropriate IAM permissions, your cluster can dynamically provision Google Cloud Load Balancers and Persistent Disks on demand. Use instance service accounts or another Application Default Credentials-compatible flow in production to avoid managing long-lived service account key files.
