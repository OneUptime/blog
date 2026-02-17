# How to Migrate AWS VPC Networking and Security Groups to Google Cloud VPC Firewall Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud VPC, Firewall Rules, AWS VPC, Security Groups, Networking, Cloud Migration

Description: Learn how to translate your AWS VPC networking setup including subnets, security groups, and NACLs into Google Cloud VPC networks and firewall rules.

---

Networking is typically the first thing you set up in a cloud migration and the part that causes the most confusion because AWS and GCP approach it differently. AWS VPCs are regional with availability-zone-scoped subnets. GCP VPCs are global with region-scoped subnets. Security groups in AWS are stateful instance-level firewalls. GCP uses VPC firewall rules that apply based on network tags or service accounts.

Understanding these differences upfront saves a lot of head-scratching later.

## Conceptual Mapping

Here is how the networking concepts map between the two platforms:

| AWS Concept | GCP Equivalent |
|------------|----------------|
| VPC | VPC Network |
| Subnet (AZ-scoped) | Subnet (region-scoped) |
| Internet Gateway | Default internet routing (automatic) |
| NAT Gateway | Cloud NAT |
| Route Table | VPC Routes |
| Security Group | Firewall Rules (with target tags) |
| Network ACL | Firewall Rules (with priority ordering) |
| VPC Peering | VPC Network Peering |
| Transit Gateway | Network Connectivity Center or Shared VPC |
| Elastic IP | Static External IP |

A key difference: GCP VPC is global. A single VPC can have subnets in every region. In AWS, a VPC lives in one region. This means you often need fewer VPCs in GCP than in AWS.

## Step 1: Document Your AWS VPC Architecture

Export your VPC configuration to understand what you are working with.

```bash
# List all VPCs
aws ec2 describe-vpcs \
  --query 'Vpcs[*].{ID:VpcId,CIDR:CidrBlock,Name:Tags[?Key==`Name`].Value|[0]}' \
  --output table

# List all subnets with their VPC and AZ
aws ec2 describe-subnets \
  --query 'Subnets[*].{
    ID:SubnetId,
    VPC:VpcId,
    CIDR:CidrBlock,
    AZ:AvailabilityZone,
    Name:Tags[?Key==`Name`].Value|[0]
  }' \
  --output table

# Export all security groups
aws ec2 describe-security-groups \
  --query 'SecurityGroups[*].{
    ID:GroupId,
    Name:GroupName,
    VPC:VpcId,
    IngressRules:IpPermissions,
    EgressRules:IpPermissionsEgress
  }' > security-groups.json

# Export route tables
aws ec2 describe-route-tables \
  --query 'RouteTables[*].{ID:RouteTableId,VPC:VpcId,Routes:Routes}' > route-tables.json
```

## Step 2: Design the GCP VPC Network

For most migrations, a single custom-mode VPC with subnets in the regions you need works well.

```bash
# Create a custom-mode VPC (no auto-created subnets)
gcloud compute networks create my-vpc \
  --subnet-mode=custom \
  --bgp-routing-mode=global

# Create subnets in the regions you need
# Map your AWS AZ subnets to GCP regional subnets
gcloud compute networks subnets create us-central1-subnet \
  --network=my-vpc \
  --region=us-central1 \
  --range=10.0.1.0/24 \
  --secondary-range=pods=10.4.0.0/14,services=10.8.0.0/20

gcloud compute networks subnets create us-east1-subnet \
  --network=my-vpc \
  --region=us-east1 \
  --range=10.0.2.0/24

gcloud compute networks subnets create europe-west1-subnet \
  --network=my-vpc \
  --region=europe-west1 \
  --range=10.0.3.0/24
```

In AWS, if you had three subnets across three AZs in us-east-1, you might consolidate these into a single subnet in us-east1 on GCP (since GCP subnets span all zones in a region).

## Step 3: Convert Security Groups to Firewall Rules

This is where the biggest translation work happens. AWS security groups are attached to individual instances and are stateful. GCP firewall rules apply to VMs through network tags or service accounts.

Here is an example AWS security group and its GCP firewall rule equivalent:

```bash
# AWS Security Group: web-servers
# Inbound: Allow HTTP (80) from 0.0.0.0/0
# Inbound: Allow HTTPS (443) from 0.0.0.0/0
# Inbound: Allow SSH (22) from 10.0.0.0/8
# Outbound: Allow all traffic

# GCP Firewall Rules equivalent:

# Allow HTTP and HTTPS from the internet to instances tagged 'web-server'
gcloud compute firewall-rules create allow-web-traffic \
  --network=my-vpc \
  --direction=INGRESS \
  --priority=1000 \
  --action=ALLOW \
  --rules=tcp:80,tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=web-server

# Allow SSH from internal network only
gcloud compute firewall-rules create allow-ssh-internal \
  --network=my-vpc \
  --direction=INGRESS \
  --priority=1000 \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=10.0.0.0/8 \
  --target-tags=web-server

# GCP allows all egress by default, matching AWS security group default behavior
# If you need to restrict egress, create deny rules with specific priorities
```

### Security Group References to Firewall Tags

In AWS, security groups can reference other security groups (e.g., "allow traffic from the app-server security group"). In GCP, you use source tags or source service accounts.

```bash
# AWS: Allow MySQL from app-servers security group
# GCP equivalent: Allow MySQL from instances tagged 'app-server'
gcloud compute firewall-rules create allow-mysql-from-app \
  --network=my-vpc \
  --direction=INGRESS \
  --priority=1000 \
  --action=ALLOW \
  --rules=tcp:3306 \
  --source-tags=app-server \
  --target-tags=db-server
```

### Converting NACLs

AWS Network ACLs are stateless and use numbered priority rules - which is actually closer to how GCP firewall rules work. Convert NACLs by mapping rule numbers to firewall priorities.

```bash
# AWS NACL: Rule 100 - Allow HTTP inbound from 0.0.0.0/0
# AWS NACL: Rule 200 - Deny all from 10.0.5.0/24
# AWS NACL: Rule * - Deny all (default)

# GCP equivalent using priority ordering
gcloud compute firewall-rules create nacl-allow-http \
  --network=my-vpc \
  --direction=INGRESS \
  --priority=100 \
  --action=ALLOW \
  --rules=tcp:80 \
  --source-ranges=0.0.0.0/0

gcloud compute firewall-rules create nacl-deny-suspicious \
  --network=my-vpc \
  --direction=INGRESS \
  --priority=200 \
  --action=DENY \
  --rules=all \
  --source-ranges=10.0.5.0/24
```

## Step 4: Set Up Cloud NAT

If your AWS setup uses NAT Gateways for private subnet internet access, set up Cloud NAT.

```bash
# Create a Cloud Router (required for Cloud NAT)
gcloud compute routers create my-router \
  --network=my-vpc \
  --region=us-central1

# Create Cloud NAT configuration
gcloud compute routers nats create my-nat \
  --router=my-router \
  --region=us-central1 \
  --nat-all-subnet-ip-ranges \
  --auto-allocate-nat-external-ips
```

## Step 5: Configure VPC Peering

If you have VPC peering connections in AWS, set up equivalent peering in GCP.

```bash
# Create VPC peering between two networks
gcloud compute networks peerings create peer-to-shared \
  --network=my-vpc \
  --peer-project=shared-services-project \
  --peer-network=shared-vpc \
  --export-custom-routes \
  --import-custom-routes
```

For hub-and-spoke topologies that use AWS Transit Gateway, consider GCP's Shared VPC model instead of individual peering connections.

## Step 6: Set Up Private Google Access

Equivalent to AWS VPC endpoints, Private Google Access lets VMs without external IPs reach Google APIs.

```bash
# Enable Private Google Access on a subnet
gcloud compute networks subnets update us-central1-subnet \
  --region=us-central1 \
  --enable-private-ip-google-access

# For Private Service Connect (equivalent to AWS PrivateLink)
gcloud compute addresses create google-apis-endpoint \
  --global \
  --purpose=PRIVATE_SERVICE_CONNECT \
  --addresses=10.0.100.1 \
  --network=my-vpc
```

## Step 7: Validate the Network Configuration

Test connectivity to make sure your firewall rules and routing work as expected.

```bash
# Use VPC Flow Logs for debugging (equivalent to VPC Flow Logs in AWS)
gcloud compute networks subnets update us-central1-subnet \
  --region=us-central1 \
  --enable-flow-logs

# Test firewall rules with connectivity tests
gcloud network-management connectivity-tests create test-web-access \
  --source-instance=projects/my-project/zones/us-central1-a/instances/test-vm \
  --destination-ip-address=10.0.1.5 \
  --destination-port=80 \
  --protocol=TCP

# List all firewall rules to verify
gcloud compute firewall-rules list \
  --filter="network=my-vpc" \
  --format='table(name, direction, priority, sourceRanges, allowed, targetTags)'
```

## Common Migration Patterns

A script to bulk-convert security groups to firewall rules:

```python
import boto3
import subprocess
import json

# Read security groups from AWS and generate GCP firewall commands
ec2 = boto3.client('ec2')
response = ec2.describe_security_groups()

for sg in response['SecurityGroups']:
    sg_name = sg['GroupName'].lower().replace(' ', '-')

    for rule in sg['IpPermissions']:
        protocol = rule.get('IpProtocol', 'all')
        from_port = rule.get('FromPort', '')
        to_port = rule.get('ToPort', '')

        for ip_range in rule.get('IpRanges', []):
            cidr = ip_range['CidrIp']
            rule_spec = f"tcp:{from_port}" if from_port == to_port else f"tcp:{from_port}-{to_port}"

            # Print the gcloud command for review before execution
            print(f"gcloud compute firewall-rules create {sg_name}-{from_port} "
                  f"--network=my-vpc --direction=INGRESS --priority=1000 "
                  f"--action=ALLOW --rules={rule_spec} "
                  f"--source-ranges={cidr} --target-tags={sg_name}")
```

## Summary

The networking migration requires careful planning because the models differ significantly between AWS and GCP. The global nature of GCP VPCs is actually an advantage - you often need fewer networks and simpler peering. The biggest adjustment is moving from instance-attached security groups to tag-based firewall rules. Take the time to document your AWS setup thoroughly, map each security group to firewall rules, and validate with connectivity tests before migrating any workloads.
