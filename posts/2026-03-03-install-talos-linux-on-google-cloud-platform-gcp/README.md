# How to Install Talos Linux on Google Cloud Platform (GCP)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GCP, Google Cloud, Kubernetes, Cloud

Description: Step-by-step instructions for deploying Talos Linux on Google Cloud Platform and setting up a production Kubernetes cluster.

---

Google Cloud Platform offers excellent infrastructure for running Talos Linux. With GCP's fast networking, flexible instance types, and solid load balancing options, you can build a high-performance Talos Kubernetes cluster. This guide walks through the complete deployment process, from uploading the Talos image to bootstrapping a fully functional cluster.

## Prerequisites

Set up the required tools:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install and configure the Google Cloud SDK
curl https://sdk.cloud.google.com | bash
gcloud init

# Set your project
gcloud config set project your-project-id

# Set the default region and zone
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a

# Install kubectl
gcloud components install kubectl
```

## Uploading the Talos Image

GCP requires you to upload the Talos image to a Cloud Storage bucket and then create a compute image from it:

```bash
# Create a Cloud Storage bucket for the Talos image
BUCKET_NAME="talos-images-$(gcloud config get-value project)"
gsutil mb gs://${BUCKET_NAME}

# Download the Talos GCP image
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/gcp-amd64.raw.tar.gz

# Upload to Cloud Storage
gsutil cp gcp-amd64.raw.tar.gz gs://${BUCKET_NAME}/

# Create a GCP compute image from the uploaded file
gcloud compute images create talos-v1-7-0 \
  --source-uri gs://${BUCKET_NAME}/gcp-amd64.raw.tar.gz \
  --guest-os-features VIRTIO_SCSI_MULTIQUEUE

echo "Talos image created: talos-v1-7-0"
```

## Creating the Network Infrastructure

Set up a VPC network with firewall rules:

```bash
# Create a custom VPC network
gcloud compute networks create talos-network \
  --subnet-mode custom

# Create a subnet for the cluster
gcloud compute networks subnets create talos-subnet \
  --network talos-network \
  --range 10.0.0.0/24 \
  --region us-central1

# Create firewall rules for the Talos cluster

# Allow internal communication between all cluster nodes
gcloud compute firewall-rules create talos-internal \
  --network talos-network \
  --allow tcp,udp,icmp \
  --source-ranges 10.0.0.0/24

# Allow Kubernetes API from external sources
gcloud compute firewall-rules create talos-k8s-api \
  --network talos-network \
  --allow tcp:6443 \
  --source-ranges 0.0.0.0/0 \
  --target-tags talos-controlplane

# Allow Talos API from your management network
gcloud compute firewall-rules create talos-api \
  --network talos-network \
  --allow tcp:50000 \
  --source-ranges 0.0.0.0/0 \
  --target-tags talos-controlplane

# Allow health checks from GCP load balancer
gcloud compute firewall-rules create talos-health-check \
  --network talos-network \
  --allow tcp:6443 \
  --source-ranges 130.211.0.0/22,35.191.0.0/16 \
  --target-tags talos-controlplane
```

## Creating the Load Balancer

Set up a TCP load balancer for the Kubernetes API:

```bash
# Create a health check
gcloud compute health-checks create tcp talos-k8s-health \
  --port 6443

# Create a backend service
gcloud compute backend-services create talos-k8s-api \
  --protocol TCP \
  --health-checks talos-k8s-health \
  --global

# Reserve a static external IP
gcloud compute addresses create talos-k8s-api-ip \
  --global

# Get the IP address
LB_IP=$(gcloud compute addresses describe talos-k8s-api-ip \
  --global --format='get(address)')
echo "Load Balancer IP: ${LB_IP}"

# Create a TCP proxy
gcloud compute target-tcp-proxies create talos-k8s-proxy \
  --backend-service talos-k8s-api

# Create a forwarding rule
gcloud compute forwarding-rules create talos-k8s-forwarding \
  --global \
  --target-tcp-proxy talos-k8s-proxy \
  --address talos-k8s-api-ip \
  --ports 6443
```

## Generating Talos Configuration

Generate the machine configuration:

```bash
# Generate Talos configuration with the load balancer IP
talosctl gen config talos-gcp-cluster "https://${LB_IP}:6443" \
  --output-dir _out

# Patch the configuration for GCP-specific settings
cat > gcp-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.7.0
EOF

# Apply the patch to both control plane and worker configs
talosctl machineconfig patch _out/controlplane.yaml \
  --patch @gcp-patch.yaml \
  --output _out/controlplane-patched.yaml

talosctl machineconfig patch _out/worker.yaml \
  --patch @gcp-patch.yaml \
  --output _out/worker-patched.yaml
```

## Launching Control Plane Nodes

Create the control plane instances:

```bash
# Create an instance group for control plane nodes
gcloud compute instance-groups unmanaged create talos-cp-group \
  --zone us-central1-a

# Launch control plane instances
for i in 1 2 3; do
  gcloud compute instances create talos-cp-${i} \
    --image talos-v1-7-0 \
    --machine-type e2-standard-4 \
    --subnet talos-subnet \
    --tags talos-controlplane \
    --boot-disk-size 50GB \
    --metadata-from-file=user-data=_out/controlplane-patched.yaml \
    --zone us-central1-a

  # Add to instance group
  gcloud compute instance-groups unmanaged add-instances talos-cp-group \
    --instances talos-cp-${i} \
    --zone us-central1-a
done

# Add the instance group to the backend service
gcloud compute backend-services add-backend talos-k8s-api \
  --instance-group talos-cp-group \
  --instance-group-zone us-central1-a \
  --global
```

## Launching Worker Nodes

Create the worker instances:

```bash
# Launch worker instances
for i in 1 2 3; do
  gcloud compute instances create talos-worker-${i} \
    --image talos-v1-7-0 \
    --machine-type e2-standard-4 \
    --subnet talos-subnet \
    --tags talos-worker \
    --boot-disk-size 100GB \
    --metadata-from-file=user-data=_out/worker-patched.yaml \
    --zone us-central1-a
done
```

## Bootstrapping the Cluster

Bootstrap and verify the cluster:

```bash
# Get the IP of the first control plane node
CP1_IP=$(gcloud compute instances describe talos-cp-1 \
  --zone us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

# Configure talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint ${CP1_IP}
talosctl config node ${CP1_IP}

# Bootstrap the cluster (only run once)
talosctl bootstrap --nodes ${CP1_IP}

# Wait for the cluster to be ready
talosctl health --wait-timeout 10m

# Get the kubeconfig
talosctl kubeconfig

# Verify the cluster
kubectl get nodes -o wide
kubectl get pods -A
```

## Installing the GCP Cloud Controller Manager

For native GCP integration (load balancer provisioning, persistent disk support), install the cloud controller manager:

```yaml
# gcp-cloud-config.yaml
# Cloud controller manager configuration for GCP
apiVersion: v1
kind: Secret
metadata:
  name: gcp-cloud-config
  namespace: kube-system
type: Opaque
stringData:
  cloud-config: |
    [global]
    project-id = your-project-id
    network-name = talos-network
    subnetwork-name = talos-subnet
    node-tags = talos-worker
```

```bash
# Apply the cloud config
kubectl apply -f gcp-cloud-config.yaml

# Install the GCP Persistent Disk CSI driver
kubectl apply -k "github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver/deploy/kubernetes/overlays/stable/?ref=master"
```

## Creating a GCP Storage Class

Set up a storage class for GCP persistent disks:

```yaml
# gcp-storageclass.yaml
# Storage class for GCP persistent disks
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard-rwo
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-standard
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: premium-rwo
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

```bash
kubectl apply -f gcp-storageclass.yaml
```

## Cleaning Up

To remove all resources:

```bash
# Delete instances
for i in 1 2 3; do
  gcloud compute instances delete talos-cp-${i} talos-worker-${i} \
    --zone us-central1-a --quiet
done

# Delete networking resources
gcloud compute forwarding-rules delete talos-k8s-forwarding --global --quiet
gcloud compute target-tcp-proxies delete talos-k8s-proxy --quiet
gcloud compute backend-services delete talos-k8s-api --global --quiet
gcloud compute health-checks delete talos-k8s-health --quiet
gcloud compute addresses delete talos-k8s-api-ip --global --quiet
gcloud compute firewall-rules delete talos-internal talos-k8s-api talos-api talos-health-check --quiet
gcloud compute networks subnets delete talos-subnet --region us-central1 --quiet
gcloud compute networks delete talos-network --quiet

# Delete the image and storage
gsutil rm -r gs://${BUCKET_NAME}
gcloud compute images delete talos-v1-7-0 --quiet
```

## Conclusion

Deploying Talos Linux on GCP follows a clear workflow: upload the image, set up networking and load balancing, launch instances with the Talos configuration, and bootstrap the cluster. GCP's infrastructure integrates well with Talos, especially when you add the persistent disk CSI driver and cloud controller manager. For production deployments, consider using Terraform to manage the infrastructure and spreading your nodes across multiple zones for high availability.
