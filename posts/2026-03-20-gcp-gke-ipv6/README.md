# How to Configure GKE Clusters with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, GKE, Kubernetes, Dual-Stack, Google Cloud, Container

Description: Create Google Kubernetes Engine clusters with IPv6 support, configure dual-stack pod and service CIDR ranges, and deploy IPv6-aware workloads on GKE.

## Introduction

Google Kubernetes Engine (GKE) supports dual-stack networking, allowing nodes, pods, and services to receive both IPv4 and IPv6 addresses. GKE dual-stack clusters require VPC-native networking (Alias IPs) and GKE Dataplane V2. In current GKE, dual-stack is available for new Standard clusters version 1.24 or later and Autopilot clusters version 1.25 or later. If you use internal IPv6 addresses, the VPC network must be custom mode with ULA internal IPv6 enabled.

## Create a Dual-Stack GKE Cluster

```bash
PROJECT="my-project"
REGION="us-east1"
ZONE="us-east1-b"

# Create a custom-mode VPC with internal IPv6 enabled
gcloud compute networks create vpc-main \
    --subnet-mode=custom \
    --enable-ula-internal-ipv6 \
    --project="$PROJECT"

# Create dual-stack subnet for GKE

gcloud compute networks subnets create subnet-gke \
    --network=vpc-main \
    --region="$REGION" \
    --range=10.0.10.0/24 \
    --stack-type=ipv4-ipv6 \
    --ipv6-access-type=INTERNAL \
    --secondary-range pods=10.100.0.0/16,services=10.200.0.0/20 \
    --project="$PROJECT"

# Create dual-stack GKE cluster
gcloud container clusters create gke-dual-stack \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --network=vpc-main \
    --subnetwork=subnet-gke \
    --cluster-secondary-range-name=pods \
    --services-secondary-range-name=services \
    --stack-type=ipv4-ipv6 \
    --enable-ip-alias \
    --enable-dataplane-v2 \
    --release-channel=regular \
    --machine-type=n2-standard-4 \
    --num-nodes=3

# Get cluster credentials
gcloud container clusters get-credentials gke-dual-stack \
    --project="$PROJECT" \
    --zone="$ZONE"

# Verify dual-stack configuration
gcloud container clusters describe gke-dual-stack \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --format="yaml(ipAllocationPolicy)"
kubectl get nodes -o wide
kubectl describe node | grep -A5 "PodCIDR"
```

## Terraform GKE Dual-Stack Cluster

```hcl
# gke_ipv6.tf

variable "project_id" {}
variable "region" { default = "us-east1" }

resource "google_compute_network" "main" {
  name                     = "vpc-main"
  auto_create_subnetworks  = false
  enable_ula_internal_ipv6 = true
  project                  = var.project_id
}

# Dual-stack subnet for GKE
resource "google_compute_subnetwork" "gke" {
  name          = "subnet-gke"
  ip_cidr_range = "10.0.10.0/24"
  region        = var.region
  network       = google_compute_network.main.id
  project       = var.project_id

  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "INTERNAL"

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.100.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.200.0.0/20"
  }
}

# GKE dual-stack cluster
resource "google_container_cluster" "main" {
  name     = "gke-dual-stack"
  location = "${var.region}-b"
  project  = var.project_id

  network    = google_compute_network.main.id
  subnetwork = google_compute_subnetwork.gke.id

  # Enable VPC-native (required for IPv6)
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Dataplane V2 is required for dual-stack
  datapath_provider = "ADVANCED_DATAPATH"

  # Enable dual-stack
  stack_type = "IPV4_IPV6"

  # Remove default node pool
  remove_default_node_pool = true
  initial_node_count       = 1

  release_channel {
    channel = "REGULAR"
  }
}

# Separate node pool
resource "google_container_node_pool" "main" {
  name     = "main-nodes"
  cluster  = google_container_cluster.main.id
  location = "${var.region}-b"
  project  = var.project_id

  node_count = 3

  node_config {
    machine_type = "n2-standard-4"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}
```

## Deploy IPv6-Aware Workloads

```yaml
# dual-stack-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
    app: web
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx:latest
          ports:
            - containerPort: 80
```

## Verify IPv6 in GKE

```bash
# Check pod IPv6 addresses
kubectl get pods -o wide
kubectl get pod web-xxx -o jsonpath='{.status.podIPs}'
# Output: [{"ip":"10.100.x.x"},{"ip":"fd20::x"}]

# Check service ClusterIPs
kubectl get service web-service -o jsonpath='{.spec.clusterIPs}'

# Test IPv6 connectivity from a pod that has ping installed
kubectl exec -it POD_NAME -- ping -6 fd20::x

# Check node dual-stack CIDRs
kubectl get node gke-node-xxx -o jsonpath='{.spec.podCIDRs}'
```

## Conclusion

For Standard GKE clusters, dual-stack requires a dual-stack subnet, VPC-native networking, and Dataplane V2. Use `ipFamilyPolicy: PreferDualStack` on Services to request both IPv4 and IPv6 ClusterIPs. Pods in dual-stack clusters automatically receive both address families. Verify with `podIPs`, `clusterIPs`, and the cluster `ipAllocationPolicy`. GKE handles the underlying IPv6 routing within the VPC automatically.
