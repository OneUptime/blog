# How to Configure Private Service Connect for Cross-Organization Service Access on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Private Service Connect, Networking, VPC, Security, Google Cloud

Description: Learn how to use Google Cloud Private Service Connect to securely expose and consume services across different GCP organizations without VPC peering.

---

When two separate GCP organizations need to share services - a SaaS provider exposing an API to customers, a partner integration, or a shared services team serving multiple business units - the networking gets complicated fast. VPC peering is limited to the same organization in most setups and introduces security concerns by linking entire networks. VPN tunnels add latency and operational overhead.

Private Service Connect (PSC) solves this cleanly. It lets a service producer expose a specific service through a service attachment, and a consumer in a completely different organization can access it through a private endpoint in their own VPC. No peering, no VPN, no public internet exposure.

## How Private Service Connect Works

The architecture has two sides. The producer side creates an internal load balancer in front of their service and attaches it to a PSC service attachment. The consumer side creates a PSC endpoint in their VPC that gets a private IP address. Traffic from the consumer flows through Google's network backbone directly to the producer's service, never touching the public internet.

The producer controls who can connect through an acceptance list that specifies which consumer projects or organizations are allowed. The consumer sees only the private IP endpoint - they have no visibility into the producer's VPC topology.

## Producer Side: Exposing a Service

Let us walk through a complete example. Suppose your organization runs an internal API that a partner organization needs to access.

### Create the Producer Service

First, set up the backend service with an internal load balancer.

```bash
# Create a subnet for the internal load balancer
gcloud compute networks subnets create producer-ilb-subnet \
  --network=producer-vpc \
  --region=us-central1 \
  --range=10.0.1.0/24 \
  --project=producer-project

# Create a dedicated subnet for Private Service Connect NAT
# This subnet is used by PSC to translate consumer traffic
gcloud compute networks subnets create psc-nat-subnet \
  --network=producer-vpc \
  --region=us-central1 \
  --range=10.0.2.0/24 \
  --purpose=PRIVATE_SERVICE_CONNECT \
  --project=producer-project
```

Create an internal TCP/UDP load balancer pointing to your service.

```bash
# Create a health check for the backend
gcloud compute health-checks create http producer-api-hc \
  --port=8080 \
  --request-path=/health \
  --project=producer-project

# Create a backend service
gcloud compute backend-services create producer-api-backend \
  --load-balancing-scheme=INTERNAL \
  --protocol=TCP \
  --region=us-central1 \
  --health-checks=producer-api-hc \
  --project=producer-project

# Add your instance group as a backend
gcloud compute backend-services add-backend producer-api-backend \
  --instance-group=api-instance-group \
  --instance-group-zone=us-central1-a \
  --region=us-central1 \
  --project=producer-project

# Create a forwarding rule (the internal load balancer frontend)
gcloud compute forwarding-rules create producer-api-ilb \
  --load-balancing-scheme=INTERNAL \
  --network=producer-vpc \
  --subnet=producer-ilb-subnet \
  --region=us-central1 \
  --ip-protocol=TCP \
  --ports=443 \
  --backend-service=producer-api-backend \
  --project=producer-project
```

### Create the Service Attachment

The service attachment is what makes the internal load balancer accessible via PSC.

```bash
# Create a PSC service attachment
# The accept list controls which consumer projects can connect
gcloud compute service-attachments create producer-api-attachment \
  --region=us-central1 \
  --producer-forwarding-rule=producer-api-ilb \
  --nat-subnets=psc-nat-subnet \
  --connection-preference=ACCEPT_MANUAL \
  --consumer-accept-list=consumer-project-id=10 \
  --project=producer-project
```

The `--consumer-accept-list` parameter specifies which projects can connect and the maximum number of connections from each. Using `ACCEPT_MANUAL` gives you explicit control over who connects. You can also use `ACCEPT_AUTOMATIC` if you want any allowed consumer to connect without manual approval.

### For Cross-Organization Access

To allow connections from another organization, add their project IDs to the accept list.

```bash
# Add a consumer project from a different organization to the accept list
gcloud compute service-attachments update producer-api-attachment \
  --region=us-central1 \
  --consumer-accept-list=consumer-project-id=10,partner-project-id=5 \
  --project=producer-project
```

## Consumer Side: Connecting to the Service

The consumer organization needs the service attachment URI from the producer. Share it securely out of band.

### Create the PSC Endpoint

```bash
# Reserve a static internal IP address for the PSC endpoint
gcloud compute addresses create psc-api-endpoint-ip \
  --region=us-central1 \
  --subnet=consumer-subnet \
  --addresses=10.1.0.100 \
  --project=consumer-project

# Create the PSC endpoint (forwarding rule) that connects to the producer's service
gcloud compute forwarding-rules create psc-api-endpoint \
  --region=us-central1 \
  --network=consumer-vpc \
  --address=psc-api-endpoint-ip \
  --target-service-attachment=projects/producer-project/regions/us-central1/serviceAttachments/producer-api-attachment \
  --project=consumer-project
```

After creating the endpoint, the consumer can reach the producer's service at `10.1.0.100:443` from any VM or service in their VPC.

### Set Up DNS for the Endpoint

Give the endpoint a meaningful DNS name so applications do not hardcode IP addresses.

```bash
# Create a private DNS zone in the consumer VPC
gcloud dns managed-zones create psc-services \
  --dns-name=psc.internal. \
  --visibility=private \
  --networks=consumer-vpc \
  --project=consumer-project

# Add a DNS record pointing to the PSC endpoint
gcloud dns record-sets create partner-api.psc.internal. \
  --zone=psc-services \
  --type=A \
  --ttl=300 \
  --rrdatas=10.1.0.100 \
  --project=consumer-project
```

Now applications can connect to `partner-api.psc.internal:443`.

## Verifying the Connection

On the producer side, check the service attachment status to see connected consumers.

```bash
# Check service attachment connection status
gcloud compute service-attachments describe producer-api-attachment \
  --region=us-central1 \
  --project=producer-project \
  --format="yaml(connectedEndpoints)"
```

On the consumer side, verify the endpoint is active.

```bash
# Check the PSC endpoint status
gcloud compute forwarding-rules describe psc-api-endpoint \
  --region=us-central1 \
  --project=consumer-project \
  --format="yaml(pscConnectionStatus)"
```

The status should show `ACCEPTED` when the producer has approved the connection.

## Terraform Configuration

For infrastructure-as-code, here is the Terraform setup for both sides.

```hcl
# Producer side - service attachment
resource "google_compute_service_attachment" "api_attachment" {
  name        = "producer-api-attachment"
  region      = "us-central1"
  project     = "producer-project"
  description = "PSC attachment for cross-org API access"

  enable_proxy_protocol = false
  connection_preference = "ACCEPT_MANUAL"
  nat_subnets           = [google_compute_subnetwork.psc_nat.id]
  target_service        = google_compute_forwarding_rule.producer_ilb.id

  consumer_accept_lists {
    project_id_or_num = "consumer-project-id"
    connection_limit  = 10
  }
}

# Consumer side - PSC endpoint
resource "google_compute_forwarding_rule" "psc_endpoint" {
  name    = "psc-api-endpoint"
  region  = "us-central1"
  project = "consumer-project"

  target                = google_compute_service_attachment.api_attachment.id
  load_balancing_scheme = ""
  network               = "consumer-vpc"
  ip_address            = google_compute_address.psc_ip.id
}

resource "google_compute_address" "psc_ip" {
  name         = "psc-api-endpoint-ip"
  region       = "us-central1"
  project      = "consumer-project"
  subnetwork   = "consumer-subnet"
  address_type = "INTERNAL"
  address      = "10.1.0.100"
}
```

## Security Considerations

Private Service Connect is inherently more secure than VPC peering because it exposes only the specific service, not the entire network. The producer controls acceptance, and the consumer has no visibility into the producer's internal topology.

However, consider adding firewall rules on both sides. On the producer side, restrict the NAT subnet to only allow traffic to the intended backend. On the consumer side, control which workloads can access the PSC endpoint.

```bash
# Producer firewall - only allow PSC NAT traffic to the API backend
gcloud compute firewall-rules create allow-psc-to-api \
  --network=producer-vpc \
  --direction=INGRESS \
  --source-ranges=10.0.2.0/24 \
  --target-tags=api-server \
  --allow=tcp:443 \
  --project=producer-project
```

Private Service Connect is the right tool for cross-organization service access on GCP. It is more secure than peering, simpler than VPNs, and scales without the limitations of traditional network interconnects. The producer maintains control, the consumer gets a simple endpoint, and both sides keep their network isolation intact.
