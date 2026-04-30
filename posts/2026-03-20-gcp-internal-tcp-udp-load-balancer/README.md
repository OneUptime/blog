# How to Configure GCP Internal TCP/UDP Load Balancer for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Internal Load Balancer, TCP, UDP, IPv4, VPC, Cloud Networking

Description: Set up a GCP Internal TCP/UDP Load Balancer to distribute IPv4 traffic across backend VMs within a VPC using a private forwarding rule and health checks.

## Introduction

GCP's Internal TCP/UDP Load Balancer (now called Internal passthrough Network Load Balancer) distributes layer-4 traffic to backends within the same VPC using an internal IPv4 address. Traffic stays within Google's private network - ideal for internal services like databases, message queues, or microservice APIs.

## Architecture

```text
Clients (internal VMs) → Internal forwarding rule (10.0.2.100:8080)
                           → Backend service
                             → [vm-a, vm-b, vm-c] (backend instances)
```

## Step 1: Create an Instance Group with Backends

```bash
# Create an unmanaged instance group with your backend VMs

gcloud compute instance-groups unmanaged create backend-ig \
  --zone us-east1-b

# Add instances to the group
gcloud compute instance-groups unmanaged add-instances backend-ig \
  --instances vm-a,vm-b,vm-c \
  --zone us-east1-b
```

## Step 2: Create a Health Check

```bash
# Allow Google Cloud health checks to reach backend VMs on port 8080
gcloud compute firewall-rules create allow-ilb-health-checks \
  --network my-vpc \
  --action allow \
  --direction ingress \
  --source-ranges 130.211.0.0/22,35.191.0.0/16 \
  --rules tcp:8080

# Create a regional TCP health check on port 8080
gcloud compute health-checks create tcp hc-tcp-8080 \
  --region us-east1 \
  --port 8080 \
  --check-interval 10s \
  --healthy-threshold 2 \
  --unhealthy-threshold 3
```

## Step 3: Create a Backend Service

```bash
# Create a regional backend service for an internal TCP load balancer
gcloud compute backend-services create internal-bs \
  --load-balancing-scheme INTERNAL \
  --protocol TCP \
  --region us-east1 \
  --health-checks hc-tcp-8080 \
  --health-checks-region us-east1

# Add the instance group as a backend
gcloud compute backend-services add-backend internal-bs \
  --region us-east1 \
  --instance-group backend-ig \
  --instance-group-zone us-east1-b
```

## Step 4: Create a Forwarding Rule (Internal IP)

```bash
# Reserve an internal IPv4 address for the load balancer
gcloud compute addresses create ilb-ip \
  --region us-east1 \
  --subnet my-subnet \
  --addresses 10.0.2.100       # Choose a free IP in your subnet

# Create the internal forwarding rule
gcloud compute forwarding-rules create internal-fr \
  --load-balancing-scheme INTERNAL \
  --region us-east1 \
  --backend-service internal-bs \
  --backend-service-region us-east1 \
  --address ilb-ip \
  --ip-protocol TCP \
  --ports 8080 \
  --network my-vpc \
  --subnet my-subnet
```

## Step 5: Verify the Load Balancer

```bash
# Check forwarding rule
gcloud compute forwarding-rules describe internal-fr --region us-east1

# Check backend health
gcloud compute backend-services get-health internal-bs --region us-east1
```

## Terraform Configuration

```hcl
resource "google_compute_forwarding_rule" "internal" {
  name                  = "internal-fr"
  load_balancing_scheme = "INTERNAL"
  backend_service       = google_compute_region_backend_service.main.id
  ip_address            = google_compute_address.ilb.address
  ip_protocol           = "TCP"
  ports                 = ["8080"]
  network               = google_compute_network.vpc.id
  subnetwork            = google_compute_subnetwork.main.id
  region                = "us-east1"
}
```

## All-Ports vs Specific Ports

To forward all TCP ports instead of only port 8080, create the forwarding rule like this. If you want to keep the port-specific rule, use a different reserved IP address.

```bash
# Forward all TCP ports to backends
gcloud compute forwarding-rules create internal-fr-all \
  --load-balancing-scheme INTERNAL \
  --region us-east1 \
  --backend-service internal-bs \
  --backend-service-region us-east1 \
  --address ilb-ip \
  --ip-protocol TCP \
  --ports ALL \
  --network my-vpc \
  --subnet my-subnet
```

For UDP, create a separate backend service and forwarding rule with `UDP` instead of `TCP`.

## Conclusion

GCP's Internal TCP/UDP Load Balancer provides a reliable, low-latency way to distribute internal IPv4 traffic without exposing backends to the internet. It is the standard pattern for internal microservices, databases, and other private workloads in GCP.
