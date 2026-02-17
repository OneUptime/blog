# How to Practice Networking Questions for the GCP Associate Cloud Engineer Exam

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Networking, Certification, Associate Cloud Engineer, VPC, Load Balancing

Description: Practice guide for GCP networking topics on the Associate Cloud Engineer exam covering VPC networks, firewall rules, load balancing, VPN, and DNS with sample scenarios and commands.

---

Networking questions on the GCP Associate Cloud Engineer exam trip up a lot of people. The topics span VPC design, firewall rules, load balancing, hybrid connectivity, and DNS - and the questions are scenario-based, meaning you need to understand how these pieces fit together, not just what they are individually.

I found that the best way to prepare for networking questions was to actually build networks in a test project. Reading documentation helps, but running the commands and seeing what happens teaches you the nuances that show up on the exam. Here is a study guide with practice scenarios for each major networking topic.

## VPC Networks

### Key Concepts

A VPC (Virtual Private Cloud) is a global resource. Subnets are regional. This means a single VPC can span multiple regions, with each subnet being in one specific region.

Two modes for VPC creation:

- **Auto mode**: Automatically creates one subnet per region with a /20 range from the 10.128.0.0/9 block. Convenient for testing, not recommended for production.
- **Custom mode**: You create subnets manually with your chosen IP ranges. This is what the exam expects you to use for production.

### Practice: Create a Custom VPC

```bash
# Create a custom mode VPC (no auto-created subnets)
gcloud compute networks create prod-vpc \
  --subnet-mode=custom \
  --bgp-routing-mode=regional

# Create subnets in different regions
gcloud compute networks subnets create us-subnet \
  --network=prod-vpc \
  --region=us-central1 \
  --range=10.0.1.0/24

gcloud compute networks subnets create eu-subnet \
  --network=prod-vpc \
  --region=europe-west1 \
  --range=10.0.2.0/24

# Enable Private Google Access on a subnet
# This allows VMs without external IPs to reach Google APIs
gcloud compute networks subnets update us-subnet \
  --region=us-central1 \
  --enable-private-ip-google-access
```

### Practice Scenario

"A VM in us-central1 needs to communicate with a VM in europe-west1. Both are in the same VPC. Do you need to configure anything?"

Answer: No. VPC is global, so VMs in different regions of the same VPC can communicate using internal IPs. No VPN or peering needed.

## Firewall Rules

### Key Concepts

Firewall rules are applied at the VPC level and control traffic to and from VM instances. Important properties:

- **Direction**: Ingress (incoming) or Egress (outgoing)
- **Priority**: 0 (highest) to 65535 (lowest). Lower number wins.
- **Action**: Allow or Deny
- **Target**: Which instances the rule applies to (all instances, instances with specific tags, or instances with specific service accounts)
- **Source/Destination**: IP ranges, tags, or service accounts

Default rules that exist in every VPC:
- Allow egress to any destination (priority 65534)
- Deny all ingress (priority 65534)
- Allow internal traffic within the network (implied, but the auto-created rule is priority 65534)

### Practice: Set Up Firewall Rules

```bash
# Allow HTTP traffic to instances tagged as web servers
gcloud compute firewall-rules create allow-http \
  --network=prod-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:80,tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=web-server \
  --priority=1000

# Allow SSH only from a specific IP range (your office)
gcloud compute firewall-rules create allow-ssh-office \
  --network=prod-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=203.0.113.0/24 \
  --target-tags=allow-ssh \
  --priority=1000

# Allow internal communication between all instances in the VPC
gcloud compute firewall-rules create allow-internal \
  --network=prod-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=all \
  --source-ranges=10.0.0.0/8 \
  --priority=1000

# Deny all other ingress (explicit - the implied rule already does this)
gcloud compute firewall-rules create deny-all-ingress \
  --network=prod-vpc \
  --direction=INGRESS \
  --action=DENY \
  --rules=all \
  --source-ranges=0.0.0.0/0 \
  --priority=65000
```

### Practice Scenario

"You created a VM but cannot SSH into it. The VM has an external IP and the default VPC. What might be wrong?"

Answer: Check if the default `allow-ssh` firewall rule exists (the default VPC creates one, but a custom VPC does not). Also check that the VM has the correct network tag matching the firewall rule target.

```bash
# List firewall rules for the network
gcloud compute firewall-rules list --filter="network=prod-vpc"
```

## Load Balancing

### Key Concepts

Load balancing questions are common on the exam. Know the types:

| Type | Scope | Layer | Use Case |
|------|-------|-------|----------|
| HTTP(S) LB | Global | 7 | Web applications, URL routing |
| SSL Proxy | Global | 4 | Non-HTTP SSL traffic |
| TCP Proxy | Global | 4 | Non-HTTP, non-SSL TCP traffic |
| Network LB | Regional | 4 | UDP traffic, client IP preservation |
| Internal TCP/UDP | Regional | 4 | Internal services |
| Internal HTTP(S) | Regional | 7 | Internal web services |

### Practice: Create an HTTP(S) Load Balancer

This is a multi-step process. The exam expects you to understand the components:

```bash
# 1. Create an instance template
gcloud compute instance-templates create web-template \
  --machine-type=e2-small \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --tags=web-server \
  --metadata=startup-script='#!/bin/bash
apt-get update && apt-get install -y nginx
echo "Hello from $(hostname)" > /var/www/html/index.html'

# 2. Create a managed instance group
gcloud compute instance-groups managed create web-mig \
  --template=web-template \
  --size=3 \
  --zone=us-central1-a

# 3. Create a health check
gcloud compute health-checks create http web-health-check \
  --port=80 \
  --request-path=/

# 4. Create a backend service
gcloud compute backend-services create web-backend \
  --protocol=HTTP \
  --health-checks=web-health-check \
  --global

# 5. Add the instance group to the backend service
gcloud compute backend-services add-backend web-backend \
  --instance-group=web-mig \
  --instance-group-zone=us-central1-a \
  --global

# 6. Create a URL map
gcloud compute url-maps create web-map \
  --default-service=web-backend

# 7. Create a target HTTP proxy
gcloud compute target-http-proxies create web-proxy \
  --url-map=web-map

# 8. Create a forwarding rule (the actual external IP)
gcloud compute forwarding-rules create web-forwarding \
  --target-http-proxy=web-proxy \
  --ports=80 \
  --global
```

### Practice Scenario

"Your application is deployed in us-central1 and europe-west1. You need a single global IP that routes users to the nearest region. Which load balancer should you use?"

Answer: HTTP(S) Load Balancer (Global). It uses anycast to route users to the nearest healthy backend.

## VPC Peering and Shared VPC

### VPC Peering

Connects two VPCs so instances in each can communicate using internal IPs. Key facts:

- Peering is non-transitive. If VPC-A peers with VPC-B, and VPC-B peers with VPC-C, VPC-A cannot reach VPC-C.
- Both sides must create a peering connection.
- IP ranges cannot overlap.

```bash
# Create peering from VPC-A to VPC-B
gcloud compute networks peerings create peer-a-to-b \
  --network=vpc-a \
  --peer-project=project-b \
  --peer-network=vpc-b

# Create the reverse peering from VPC-B to VPC-A
gcloud compute networks peerings create peer-b-to-a \
  --network=vpc-b \
  --peer-project=project-a \
  --peer-network=vpc-a
```

### Shared VPC

Allows an organization to share a VPC network across multiple projects. One project is the host project (owns the VPC), and other projects are service projects (use the VPC's subnets).

Know when to use Shared VPC vs. VPC Peering:
- **Shared VPC**: Centralized network management, same organization, common for enterprise setups
- **VPC Peering**: Connecting networks across organizations or when teams need independent network control

## Cloud VPN and Cloud Interconnect

### Cloud VPN

Creates an encrypted tunnel between your on-premises network and GCP over the public internet.

Two types:
- **Classic VPN**: Single tunnel, 99.9% SLA
- **HA VPN**: Two tunnels for redundancy, 99.99% SLA (the exam prefers this)

### Cloud Interconnect

Direct physical connection between your data center and Google's network. Two options:
- **Dedicated Interconnect**: Your own connection to a Google colocation facility (10 Gbps or 100 Gbps)
- **Partner Interconnect**: Through a service provider (50 Mbps to 50 Gbps)

### Practice Scenario

"Your company needs to connect their on-premises data center to GCP with low latency and high bandwidth. They process sensitive financial data and want the traffic to avoid the public internet."

Answer: Dedicated Interconnect (or Partner Interconnect if Dedicated is not available at their location).

## Cloud DNS

Managed DNS service. Know how to create zones and records:

```bash
# Create a DNS managed zone
gcloud dns managed-zones create my-zone \
  --dns-name=example.com. \
  --description="My DNS zone"

# Add an A record
gcloud dns record-sets create app.example.com. \
  --zone=my-zone \
  --type=A \
  --ttl=300 \
  --rrdatas="34.120.1.1"
```

## Study Tips for Networking

1. **Build a test VPC from scratch**: Create a custom VPC, subnets, firewall rules, and VMs. Try to SSH into the VMs and troubleshoot when it does not work.
2. **Practice creating a load balancer**: The multi-step process trips people up. Do it at least three times.
3. **Draw the hierarchy**: VPC is global, subnets are regional, instances are zonal. Keep this in mind when answering questions about scope.
4. **Focus on troubleshooting**: Many exam questions describe a broken setup and ask you to identify the problem. The answer is usually a missing firewall rule or an incorrect network tag.
5. **Know the CLI**: Be able to list, describe, and create network resources using gcloud commands.

## Wrapping Up

Networking is one of the more challenging sections of the ACE exam because the questions require you to understand how multiple components interact. The best preparation is hands-on practice - build VPCs, configure firewall rules, set up load balancers, and troubleshoot connectivity issues. Focus on understanding the scope of each resource (global vs. regional vs. zonal), know when to use each type of load balancer, and be comfortable with both the console and the gcloud CLI. If you can design a basic network from scratch and troubleshoot common issues, you will handle the networking questions confidently.
