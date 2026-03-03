# How to Set Up GKE-Compatible Clusters with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GKE, Google Cloud, Kubernetes, GCP

Description: Learn how to build self-managed Kubernetes clusters on GCP with Talos Linux that mirror GKE features and networking behavior.

---

Google Kubernetes Engine is the managed Kubernetes offering on GCP, but there are legitimate reasons to run your own clusters: cost control, specific kernel requirements, regulatory constraints, or simply wanting more control over the Kubernetes version and configuration. Talos Linux lets you build self-managed clusters on GCP that closely replicate the GKE experience, including VPC-native networking, Cloud Load Balancing, and Persistent Disk integration. This guide shows you how.

## What Makes a Cluster GKE-Compatible

When we say GKE-compatible, we mean a cluster that behaves like a GKE cluster from the perspective of other GCP services. Specifically:

- Pods get IP addresses from the VPC (VPC-native networking)
- Services of type LoadBalancer create Google Cloud Load Balancers
- Persistent volumes use GCP Persistent Disks
- Nodes have proper GCP metadata labels
- Workload Identity works for GCP service account integration

This is not about running GKE. It is about running a self-managed cluster that integrates with GCP as smoothly as GKE does.

## VPC and Subnet Setup

GKE uses alias IP ranges for pod and service networking. To replicate this, configure your VPC with secondary ranges:

```bash
# Create a VPC network
gcloud compute networks create talos-vpc \
  --subnet-mode=custom

# Create a subnet with secondary ranges for pods and services
gcloud compute networks subnets create talos-subnet \
  --network=talos-vpc \
  --region=us-central1 \
  --range=10.0.0.0/24 \
  --secondary-range pods=10.1.0.0/16,services=10.2.0.0/20
```

The secondary ranges (`pods` and `services`) are used by the VPC-native CNI to allocate IP addresses. The pod range needs to be large enough for all your pods, and the service range for all your Kubernetes services.

## Firewall Rules

Create firewall rules that match what GKE would set up:

```bash
# Internal communication between all nodes
gcloud compute firewall-rules create talos-internal \
  --network=talos-vpc \
  --allow=tcp,udp,icmp \
  --source-ranges=10.0.0.0/24,10.1.0.0/16,10.2.0.0/20

# Kubernetes API access
gcloud compute firewall-rules create talos-api \
  --network=talos-vpc \
  --allow=tcp:6443 \
  --source-ranges=0.0.0.0/0

# Talos API access (restrict this in production)
gcloud compute firewall-rules create talos-mgmt \
  --network=talos-vpc \
  --allow=tcp:50000 \
  --source-ranges=0.0.0.0/0

# Health check ranges (Google LB health checks)
gcloud compute firewall-rules create talos-health-checks \
  --network=talos-vpc \
  --allow=tcp \
  --source-ranges=130.211.0.0/22,35.191.0.0/16
```

The health check ranges (130.211.0.0/22 and 35.191.0.0/16) are Google's health check source IPs. Without these rules, load balancer health checks will fail.

## Generating Talos Configuration

Configure Talos with the external cloud provider and without the default CNI:

```bash
# Generate config with GCP cloud provider and no default CNI
talosctl gen config gke-compat-cluster https://<lb-ip>:6443 \
  --config-patch='[
    {"op": "add", "path": "/cluster/externalCloudProvider", "value": {"enabled": true}},
    {"op": "add", "path": "/cluster/network/cni", "value": {"name": "none"}},
    {"op": "add", "path": "/cluster/network/podSubnets", "value": ["10.1.0.0/16"]},
    {"op": "add", "path": "/cluster/network/serviceSubnets", "value": ["10.2.0.0/20"]}
  ]'
```

Setting the CNI to `none` means you will install the VPC-native CNI separately. The pod and service subnet values should match the secondary ranges you created.

## Launching Instances

Create instances with the proper service account and metadata:

```bash
# Create the service account
gcloud iam service-accounts create talos-nodes \
  --display-name="Talos Cluster Nodes"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:talos-nodes@my-project.iam.gserviceaccount.com" \
  --role="roles/compute.admin"

# Launch control plane nodes across zones
for zone in us-central1-a us-central1-b us-central1-c; do
  gcloud compute instances create talos-cp-${zone##*-} \
    --zone=$zone \
    --machine-type=e2-standard-4 \
    --image=talos-v1-7-0 \
    --image-project=my-project \
    --subnet=talos-subnet \
    --service-account=talos-nodes@my-project.iam.gserviceaccount.com \
    --scopes=cloud-platform \
    --metadata-from-file=user-data=controlplane.yaml \
    --can-ip-forward \
    --tags=talos-cp
done
```

The `--can-ip-forward` flag is required for nodes to route pod traffic. Without it, GCP will drop packets with source addresses outside the node's primary IP range.

## Installing VPC-Native CNI

For GKE compatibility, use the GCP VPC CNI or configure Calico with IP-in-IP disabled to use native GCP routing:

```bash
# Option 1: Install Calico with native routing for GCP
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/master/manifests/calico.yaml

# Then patch Calico to use native routing
kubectl patch installation default --type=merge -p '{"spec":{"calicoNetwork":{"ipPools":[{"cidr":"10.1.0.0/16","encapsulation":"None","natOutgoing":true}]}}}'
```

With `encapsulation: None`, Calico uses direct routing. Combined with the `--can-ip-forward` flag and GCP routes, pods get VPC-routable IP addresses.

## Cloud Controller Manager

Deploy the GCP cloud controller manager:

```bash
# Create the credentials secret
kubectl create secret generic gcp-creds \
  --namespace kube-system \
  --from-file=key.json=gcp-service-account-key.json

# Deploy the CCM (see the GCP cloud provider repository for manifests)
kubectl apply -f gcp-cloud-controller-manager.yaml
```

Once running, the CCM handles node initialization, load balancer provisioning, and route management.

## Persistent Disk CSI Driver

Install the GCP PD CSI driver for storage:

```bash
# Deploy the GCP PD CSI driver
kubectl apply -k "github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver/deploy/kubernetes/overlays/stable/?ref=master"

# Create a storage class
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-balanced
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
EOF
```

## Workload Identity

To replicate GKE Workload Identity, set up an OIDC provider for your cluster and configure GCP IAM to trust it. This lets pods assume GCP service accounts without key files:

```bash
# Extract the OIDC issuer from the cluster
kubectl get --raw /.well-known/openid-configuration | jq -r .issuer

# Create a Workload Identity Pool
gcloud iam workload-identity-pools create talos-pool \
  --location="global" \
  --display-name="Talos Cluster Pool"

# Add the OIDC provider
gcloud iam workload-identity-pools providers create-oidc talos-provider \
  --workload-identity-pool=talos-pool \
  --location="global" \
  --issuer-uri="https://<your-oidc-issuer>" \
  --attribute-mapping="google.subject=assertion.sub"
```

## Testing the Setup

Verify your cluster behaves like GKE:

```bash
# Test load balancer provisioning
kubectl create deployment nginx --image=nginx:latest --replicas=3
kubectl expose deployment nginx --type=LoadBalancer --port=80

# Wait for external IP
kubectl get svc nginx --watch

# Test persistent storage
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 10Gi
EOF

# Verify volume is provisioned
kubectl get pvc test-pvc
```

## Differences from Actual GKE

Your self-managed cluster will differ from GKE in some areas. GKE manages the control plane for you and provides automatic upgrades, built-in monitoring integration, and the GKE-specific features like Config Connector. With Talos, you manage the control plane yourself, handle upgrades through `talosctl upgrade`, and install monitoring separately. The networking and storage behavior, however, will be very similar.

## Conclusion

Building a GKE-compatible cluster with Talos Linux on GCP gives you the integration benefits of GKE with full control over your infrastructure. VPC-native networking, Cloud Load Balancing, and Persistent Disk storage all work through their respective cloud-native drivers. The main investment is in the initial setup of the cloud provider, CNI, and CSI components. Once those are in place, your cluster interacts with GCP services the same way a GKE cluster would.
