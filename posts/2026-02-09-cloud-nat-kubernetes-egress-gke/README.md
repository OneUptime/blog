# How to Configure Cloud NAT for Kubernetes Egress Traffic on GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Kubernetes, Networking, GKE

Description: Learn how to set up Cloud NAT for GKE clusters to enable private nodes to access the internet and external services without public IP addresses.

---

Google Kubernetes Engine private clusters run nodes without public IP addresses for security and compliance. However, these nodes still need to reach external services like Docker Hub, package repositories, and third-party APIs. Cloud NAT solves this problem by providing managed network address translation for outbound traffic.

This guide shows you how to configure Cloud NAT for GKE egress traffic, customize NAT rules, and troubleshoot common issues.

## Understanding Cloud NAT Architecture

Cloud NAT is a distributed, software-defined managed service that allows private GKE nodes to access the internet without exposing them to inbound connections. The architecture works like this:

**Router** - A Cloud Router in your VPC that manages NAT configurations and handles routing.

**NAT Gateway** - The logical NAT gateway that translates private IPs to public IPs for outbound traffic.

**IP Addresses** - Either auto-allocated or manually specified public IPs used for NAT translation.

Unlike traditional NAT gateways, Cloud NAT is not a single point of failure. Google automatically scales it based on your traffic patterns.

## Prerequisites for Cloud NAT

You need a GKE cluster with private nodes:

```bash
# Create GKE cluster with private nodes
gcloud container clusters create private-cluster \
  --zone=us-central1-a \
  --enable-ip-alias \
  --enable-private-nodes \
  --master-ipv4-cidr=172.16.0.0/28 \
  --network=my-vpc \
  --subnetwork=my-subnet
```

Private nodes have no external IPs and cannot reach the internet by default.

## Creating Cloud Router and NAT Gateway

First, create a Cloud Router in your VPC:

```bash
# Create Cloud Router
gcloud compute routers create nat-router \
  --network=my-vpc \
  --region=us-central1
```

The router manages routing for your VPC and acts as the control plane for Cloud NAT.

Now create the NAT gateway:

```bash
# Create Cloud NAT
gcloud compute routers nats create my-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --nat-all-subnet-ip-ranges \
  --auto-allocate-nat-external-ips
```

This configuration:
- `--nat-all-subnet-ip-ranges` - NAT traffic from all subnets
- `--auto-allocate-nat-external-ips` - Automatically allocate public IPs

Your GKE nodes can now reach the internet.

## Configuring Cloud NAT with Terraform

For infrastructure as code, use Terraform:

```hcl
# cloud-nat.tf
resource "google_compute_router" "nat_router" {
  name    = "nat-router"
  region  = "us-central1"
  network = google_compute_network.vpc.id

  bgp {
    asn = 64514
  }
}

resource "google_compute_router_nat" "nat_gateway" {
  name                               = "my-nat-gateway"
  router                             = google_compute_router.nat_router.name
  region                             = google_compute_router.nat_router.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
```

Apply the configuration:

```bash
terraform init
terraform plan
terraform apply
```

## Using Reserved Static IPs for NAT

For services that whitelist IP addresses, use reserved static IPs:

```bash
# Reserve static IPs
gcloud compute addresses create nat-ip-1 --region=us-central1
gcloud compute addresses create nat-ip-2 --region=us-central1

# Get the IP addresses
IP1=$(gcloud compute addresses describe nat-ip-1 --region=us-central1 --format='value(address)')
IP2=$(gcloud compute addresses describe nat-ip-2 --region=us-central1 --format='value(address)')

echo "Reserved IPs: $IP1, $IP2"
```

Update NAT to use these IPs:

```bash
gcloud compute routers nats update my-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --nat-external-ip-pool=nat-ip-1,nat-ip-2
```

With Terraform:

```hcl
# static-nat-ips.tf
resource "google_compute_address" "nat_ips" {
  count  = 2
  name   = "nat-ip-${count.index + 1}"
  region = "us-central1"
}

resource "google_compute_router_nat" "nat_gateway" {
  name   = "my-nat-gateway"
  router = google_compute_router.nat_router.name
  region = google_compute_router.nat_router.region

  nat_ip_allocate_option = "MANUAL_ONLY"
  nat_ips                = google_compute_address.nat_ips[*].self_link

  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ALL"
  }
}
```

## Configuring NAT for Specific Subnets

To NAT only specific subnets:

```bash
gcloud compute routers nats create selective-nat \
  --router=nat-router \
  --region=us-central1 \
  --nat-custom-subnet-ip-ranges=my-subnet \
  --auto-allocate-nat-external-ips
```

Or with Terraform:

```hcl
resource "google_compute_router_nat" "selective_nat" {
  name   = "selective-nat"
  router = google_compute_router.nat_router.name
  region = "us-central1"

  nat_ip_allocate_option = "AUTO_ONLY"

  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.gke_subnet.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  log_config {
    enable = true
    filter = "TRANSLATIONS_ONLY"
  }
}
```

## Testing NAT Configuration

Deploy a test pod to verify NAT:

```yaml
# test-nat.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nat-test
spec:
  containers:
  - name: curl
    image: curlimages/curl:latest
    command: ["sleep", "3600"]
```

Apply and test:

```bash
kubectl apply -f test-nat.yaml

# Check pod IP (private)
kubectl get pod nat-test -o wide

# Test external connectivity
kubectl exec nat-test -- curl -s https://api.ipify.org

# Should return one of your NAT IPs
```

Test DNS resolution:

```bash
# Verify DNS works
kubectl exec nat-test -- nslookup google.com

# Test external API
kubectl exec nat-test -- curl -s https://jsonplaceholder.typicode.com/posts/1
```

## Configuring NAT Port Allocation

Control port allocation to prevent exhaustion:

```bash
gcloud compute routers nats update my-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --min-ports-per-vm=64 \
  --max-ports-per-vm=512 \
  --enable-dynamic-port-allocation
```

With Terraform:

```hcl
resource "google_compute_router_nat" "nat_gateway" {
  name   = "my-nat-gateway"
  router = google_compute_router.nat_router.name
  region = "us-central1"

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  # Port allocation
  min_ports_per_vm                 = 64
  max_ports_per_vm                 = 512
  enable_dynamic_port_allocation   = true
  enable_endpoint_independent_mapping = true

  log_config {
    enable = true
    filter = "ALL"
  }
}
```

Each VM gets between 64 and 512 ports dynamically allocated based on usage.

## Setting Up NAT Logging

Enable comprehensive logging:

```bash
gcloud compute routers nats update my-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --enable-logging \
  --log-filter=ALL
```

Available log filters:
- `ERRORS_ONLY` - Only log errors
- `TRANSLATIONS_ONLY` - Log new connections
- `ALL` - Log everything (expensive)

View logs in Cloud Logging:

```bash
# Query NAT logs
gcloud logging read 'resource.type="nat_gateway"' \
  --limit=10 \
  --format=json
```

Create log-based metrics:

```bash
gcloud logging metrics create nat_connection_count \
  --description="Count of NAT connections" \
  --log-filter='resource.type="nat_gateway"
    jsonPayload.connection.nat_ip!=""'
```

## Monitoring NAT Gateway Usage

View NAT metrics in Cloud Monitoring:

```bash
# Check allocated ports
gcloud compute routers nats describe my-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --format='value(status.minExtraNatIpsNeeded)'
```

Create monitoring dashboard:

```hcl
# monitoring.tf
resource "google_monitoring_dashboard" "nat_dashboard" {
  dashboard_json = jsonencode({
    displayName = "Cloud NAT Dashboard"
    mosaicLayout = {
      columns = 12
      tiles = [
        {
          width  = 6
          height = 4
          widget = {
            title = "NAT Connections"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"nat_gateway\" metric.type=\"router.googleapis.com/nat/nat_allocation_failed\""
                  }
                }
              }]
            }
          }
        }
      ]
    }
  })
}
```

Set up alerts for port exhaustion:

```bash
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="NAT Port Exhaustion" \
  --condition-display-name="Ports per VM high" \
  --condition-threshold-value=450 \
  --condition-threshold-duration=300s
```

## Troubleshooting Cloud NAT Issues

If pods cannot reach the internet:

```bash
# Check NAT status
gcloud compute routers nats describe my-nat-gateway \
  --router=nat-router \
  --region=us-central1

# Verify subnet configuration
gcloud compute routers nats list \
  --router=nat-router \
  --region=us-central1
```

Check for port exhaustion:

```bash
# View NAT metrics
gcloud compute routers get-nat-mapping-info nat-router \
  --region=us-central1

# Check for allocation failures
gcloud logging read 'resource.type="nat_gateway"
  jsonPayload.allocation_status!="OK"' \
  --limit=20
```

If specific pods fail:

```bash
# Debug pod networking
kubectl run debug-pod --image=nicolaka/netshoot -it --rm

# Inside the pod
curl -v https://api.ipify.org
traceroute 8.8.8.8
nslookup google.com
```

## NAT for GKE Workload Identity

When using Workload Identity, ensure NAT allows metadata server access:

```hcl
resource "google_compute_firewall" "allow_metadata" {
  name    = "allow-metadata-server"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["gke-node"]

  # Allow access to metadata server
  destination_ranges = ["169.254.169.254/32"]
}
```

Pods using Workload Identity need to reach Google APIs:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: workload-identity-test
spec:
  serviceAccountName: my-ksa
  containers:
  - name: gcloud
    image: google/cloud-sdk:slim
    command: ["sleep", "3600"]
```

Test access:

```bash
kubectl exec workload-identity-test -- gcloud auth list
kubectl exec workload-identity-test -- gcloud storage ls
```

## Cost Optimization for Cloud NAT

Cloud NAT charges for:
- Number of NAT gateways
- Data processing
- VM-to-NAT assignments

Optimize costs:

```bash
# Use auto-allocation for fewer IPs
gcloud compute routers nats update my-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --auto-allocate-nat-external-ips

# Enable dynamic port allocation
gcloud compute routers nats update my-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --enable-dynamic-port-allocation
```

Monitor costs:

```bash
# Export billing data
bq query --use_legacy_sql=false \
"SELECT
  service.description,
  sku.description,
  SUM(cost) as total_cost
FROM \`project.dataset.gcp_billing_export\`
WHERE service.description = 'Cloud NAT'
  AND usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY service.description, sku.description
ORDER BY total_cost DESC"
```

## Conclusion

Cloud NAT enables GKE private clusters to access external services securely without exposing nodes to the internet. The managed service automatically scales, requires no maintenance, and integrates seamlessly with GKE networking.

Key benefits include security through private nodes, simplified network architecture, and the ability to use reserved IPs for service whitelisting. Proper configuration of port allocation and logging ensures reliable operation while controlling costs.
