# How to Build Private DNS Zones in Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Cloud, AWS, GCP, Azure, Route 53, Terraform, Networking, VPC, DevOps

Description: A comprehensive guide to creating and managing private DNS zones across AWS, GCP, and Azure for secure internal name resolution within your cloud infrastructure.

---

> Private DNS zones let your services discover each other by name without exposing internal hostnames to the public internet. They are the backbone of secure, maintainable microservices architectures in the cloud.

## Why Private DNS Zones Matter

Public DNS exposes your infrastructure details to anyone who queries it. Private DNS zones solve this by keeping internal service names resolvable only within your virtual network. Benefits include:

- **Security**: Internal hostnames never leak to the public internet
- **Simplicity**: Services reference each other by name, not IP addresses
- **Flexibility**: Update backend IPs without changing application configs
- **Multi-environment**: Use the same hostnames across dev, staging, and production

## AWS Route 53 Private Hosted Zones

Route 53 private hosted zones provide DNS resolution within one or more VPCs. Records in these zones are only resolvable from associated VPCs.

### Creating a Private Hosted Zone via AWS CLI

```bash
# Create the private hosted zone associated with a VPC
# The --caller-reference must be unique for each create request
aws route53 create-hosted-zone \
  --name internal.mycompany.com \
  --caller-reference "$(date +%s)" \
  --hosted-zone-config Comment="Internal services",PrivateZone=true \
  --vpc VPCRegion=us-east-1,VPCId=vpc-0123456789abcdef0

# The response includes the hosted zone ID which you'll need for records
# Example: /hostedzone/Z1234567890ABC
```

### Adding DNS Records

```bash
# Create a JSON file for the record change batch
cat > /tmp/dns-record.json << 'EOF'
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.internal.mycompany.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [
          { "Value": "10.0.1.50" }
        ]
      }
    }
  ]
}
EOF

# Apply the record change
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file:///tmp/dns-record.json
```

### Associating Additional VPCs

```bash
# Associate another VPC with the private hosted zone
# This allows resources in vpc-0987654321fedcba0 to resolve the zone
aws route53 associate-vpc-with-hosted-zone \
  --hosted-zone-id Z1234567890ABC \
  --vpc VPCRegion=us-west-2,VPCId=vpc-0987654321fedcba0
```

## GCP Cloud DNS Private Zones

Google Cloud DNS private zones work similarly but use the concept of "managed zones" with visibility set to private.

### Creating a Private Zone via gcloud CLI

```bash
# Create a private managed zone
# The --networks flag specifies which VPC networks can resolve this zone
gcloud dns managed-zones create internal-zone \
  --description="Internal services DNS zone" \
  --dns-name="internal.mycompany.com." \
  --visibility=private \
  --networks=my-vpc-network

# Note: The dns-name must end with a trailing dot
```

### Adding DNS Records in GCP

```bash
# Start a transaction to batch record changes
gcloud dns record-sets transaction start \
  --zone=internal-zone

# Add an A record for the API service
gcloud dns record-sets transaction add \
  --zone=internal-zone \
  --name="api.internal.mycompany.com." \
  --ttl=300 \
  --type=A \
  "10.128.0.50"

# Add a CNAME record pointing to the A record
gcloud dns record-sets transaction add \
  --zone=internal-zone \
  --name="api-v2.internal.mycompany.com." \
  --ttl=300 \
  --type=CNAME \
  "api.internal.mycompany.com."

# Execute the transaction to apply all changes atomically
gcloud dns record-sets transaction execute \
  --zone=internal-zone
```

### Adding More Networks to a GCP Private Zone

```bash
# Update the zone to include additional VPC networks
gcloud dns managed-zones update internal-zone \
  --networks=my-vpc-network,shared-services-network,dev-network
```

## Azure Private DNS

Azure Private DNS zones integrate with Virtual Networks (VNets) through "virtual network links."

### Creating an Azure Private DNS Zone

```bash
# Create a resource group if you don't have one
az group create \
  --name dns-rg \
  --location eastus

# Create the private DNS zone
# Azure private zones don't need a trailing dot
az network private-dns zone create \
  --resource-group dns-rg \
  --name internal.mycompany.com
```

### Linking VNets to the Private Zone

```bash
# Link a VNet to the private DNS zone
# --registration-enabled true allows VMs to auto-register their hostnames
az network private-dns link vnet create \
  --resource-group dns-rg \
  --zone-name internal.mycompany.com \
  --name production-vnet-link \
  --virtual-network /subscriptions/SUB_ID/resourceGroups/network-rg/providers/Microsoft.Network/virtualNetworks/production-vnet \
  --registration-enabled true
```

### Adding Records in Azure

```bash
# Create an A record set
az network private-dns record-set a create \
  --resource-group dns-rg \
  --zone-name internal.mycompany.com \
  --name api \
  --ttl 300

# Add an IP address to the A record set
az network private-dns record-set a add-record \
  --resource-group dns-rg \
  --zone-name internal.mycompany.com \
  --record-set-name api \
  --ipv4-address 10.0.1.50
```

## VPC/VNet Association Deep Dive

Understanding how DNS resolution flows through your network is critical for troubleshooting.

### AWS VPC DNS Resolution Flow

```
+-------------------+
| EC2 Instance      |
| (10.0.1.10)       |
+--------+----------+
         |
         | Query: api.internal.mycompany.com
         v
+--------+----------+
| VPC DNS Resolver  |
| (10.0.0.2)        |  <-- Always at VPC CIDR + 2
+--------+----------+
         |
         | Is zone associated with this VPC?
         v
+--------+----------+
| Route 53 Private  |
| Hosted Zone       |
+-------------------+
         |
         | Returns: 10.0.1.50
         v
```

For this to work, your VPC must have:

```bash
# Ensure DNS resolution is enabled on the VPC
aws ec2 modify-vpc-attribute \
  --vpc-id vpc-0123456789abcdef0 \
  --enable-dns-support '{"Value": true}'

# Ensure DNS hostnames are enabled
aws ec2 modify-vpc-attribute \
  --vpc-id vpc-0123456789abcdef0 \
  --enable-dns-hostnames '{"Value": true}'
```

### GCP DNS Resolution Flow

GCP uses metadata servers at 169.254.169.254 for DNS resolution:

```bash
# Verify DNS resolution from a GCE instance
# The metadata server forwards queries to Cloud DNS
dig @169.254.169.254 api.internal.mycompany.com
```

### Azure DNS Resolution Flow

Azure VMs use 168.63.129.16 as the DNS resolver when configured to use Azure DNS:

```bash
# Verify from an Azure VM
nslookup api.internal.mycompany.com 168.63.129.16
```

## Cross-Account Resolution (AWS)

Organizations often split workloads across multiple AWS accounts. Route 53 Resolver enables cross-account and cross-VPC DNS resolution.

### Setting Up Outbound Resolver Endpoints

```bash
# Create a security group for the resolver endpoints
aws ec2 create-security-group \
  --group-name dns-resolver-sg \
  --description "Security group for Route 53 Resolver" \
  --vpc-id vpc-0123456789abcdef0

# Allow DNS traffic (TCP and UDP port 53)
aws ec2 authorize-security-group-ingress \
  --group-id sg-resolver123 \
  --protocol udp \
  --port 53 \
  --cidr 10.0.0.0/8

aws ec2 authorize-security-group-ingress \
  --group-id sg-resolver123 \
  --protocol tcp \
  --port 53 \
  --cidr 10.0.0.0/8
```

### Creating Resolver Endpoints

```bash
# Create an outbound resolver endpoint
# This forwards queries from your VPC to another network
aws route53resolver create-resolver-endpoint \
  --name "outbound-to-shared-services" \
  --direction OUTBOUND \
  --security-group-ids sg-resolver123 \
  --ip-addresses SubnetId=subnet-abc123,Ip=10.0.1.10 SubnetId=subnet-def456,Ip=10.0.2.10

# Create a forwarding rule to send queries to the shared services DNS
aws route53resolver create-resolver-rule \
  --name "forward-to-shared-services" \
  --rule-type FORWARD \
  --domain-name "shared.internal.mycompany.com" \
  --resolver-endpoint-id rslvr-out-abc123 \
  --target-ips Ip=10.100.0.53,Port=53 Ip=10.100.1.53,Port=53

# Associate the rule with your VPC
aws route53resolver associate-resolver-rule \
  --resolver-rule-id rslvr-rr-abc123 \
  --vpc-id vpc-0123456789abcdef0
```

### Using AWS Resource Access Manager (RAM) for Cross-Account Sharing

```bash
# Share a resolver rule with another AWS account using RAM
aws ram create-resource-share \
  --name "dns-resolver-rules-share" \
  --resource-arns arn:aws:route53resolver:us-east-1:111111111111:resolver-rule/rslvr-rr-abc123 \
  --principals 222222222222

# The receiving account must accept the share
aws ram accept-resource-share-invitation \
  --resource-share-invitation-arn arn:aws:ram:us-east-1:111111111111:resource-share-invitation/abc123
```

## Terraform Examples

Infrastructure as Code is essential for managing DNS zones consistently across environments.

### AWS Private Hosted Zone with Terraform

```hcl
# providers.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# variables.tf
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Base domain name for the private zone"
  type        = string
  default     = "internal.mycompany.com"
}

# main.tf - VPC and Private Hosted Zone
# Create VPC for our workloads
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true   # Required for private hosted zones
  enable_dns_hostnames = true   # Required for private hosted zones

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  }
}

# Create the private hosted zone
resource "aws_route53_zone" "private" {
  name    = var.domain_name
  comment = "Private zone for ${var.environment} internal services"

  # Associate with the primary VPC
  vpc {
    vpc_id = aws_vpc.main.id
  }

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Environment = var.environment
  }
}

# dns_records.tf - Service DNS Records
# A record for the API service
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.private.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = ["10.0.1.50"]
}

# CNAME for versioned API endpoint
resource "aws_route53_record" "api_v2" {
  zone_id = aws_route53_zone.private.zone_id
  name    = "api-v2.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = ["api.${var.domain_name}"]
}

# Alias record pointing to an internal load balancer
resource "aws_route53_record" "internal_lb" {
  zone_id = aws_route53_zone.private.zone_id
  name    = "services.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.internal.dns_name
    zone_id                = aws_lb.internal.zone_id
    evaluate_target_health = true
  }
}

# multi_vpc.tf - Associate additional VPCs
# Associate a secondary VPC with the private zone
resource "aws_route53_zone_association" "secondary" {
  zone_id = aws_route53_zone.private.zone_id
  vpc_id  = aws_vpc.secondary.id
}

# outputs.tf
output "private_zone_id" {
  description = "ID of the private hosted zone"
  value       = aws_route53_zone.private.zone_id
}

output "private_zone_name_servers" {
  description = "Name servers for the private zone"
  value       = aws_route53_zone.private.name_servers
}
```

### GCP Private DNS Zone with Terraform

```hcl
# providers.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-central1"
}

# variables.tf
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

# main.tf - VPC Network and Private Zone
# Create VPC network
resource "google_compute_network" "main" {
  name                    = "${var.environment}-vpc"
  auto_create_subnetworks = false
}

# Create subnet
resource "google_compute_subnetwork" "main" {
  name          = "${var.environment}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  network       = google_compute_network.main.id
  region        = "us-central1"
}

# Create private DNS zone
resource "google_dns_managed_zone" "private" {
  name        = "${var.environment}-internal-zone"
  dns_name    = "internal.mycompany.com."  # Trailing dot required
  description = "Private DNS zone for ${var.environment}"
  visibility  = "private"

  # Configure which networks can resolve this zone
  private_visibility_config {
    networks {
      network_url = google_compute_network.main.id
    }
  }
}

# dns_records.tf - Service Records
# A record for API service
resource "google_dns_record_set" "api" {
  managed_zone = google_dns_managed_zone.private.name
  name         = "api.internal.mycompany.com."
  type         = "A"
  ttl          = 300
  rrdatas      = ["10.0.0.50"]
}

# A record for database
resource "google_dns_record_set" "database" {
  managed_zone = google_dns_managed_zone.private.name
  name         = "db.internal.mycompany.com."
  type         = "A"
  ttl          = 300
  rrdatas      = ["10.0.0.100"]
}

# SRV record for service discovery
resource "google_dns_record_set" "api_srv" {
  managed_zone = google_dns_managed_zone.private.name
  name         = "_http._tcp.api.internal.mycompany.com."
  type         = "SRV"
  ttl          = 300
  # Priority Weight Port Target
  rrdatas      = ["10 100 8080 api.internal.mycompany.com."]
}

# outputs.tf
output "dns_zone_name" {
  description = "Name of the private DNS zone"
  value       = google_dns_managed_zone.private.name
}
```

### Azure Private DNS with Terraform

```hcl
# providers.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

# main.tf - Resource Group, VNet, and Private DNS Zone
# Resource group for DNS resources
resource "azurerm_resource_group" "dns" {
  name     = "${var.environment}-dns-rg"
  location = var.location
}

# Virtual network
resource "azurerm_virtual_network" "main" {
  name                = "${var.environment}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.dns.location
  resource_group_name = azurerm_resource_group.dns.name
}

# Subnet
resource "azurerm_subnet" "main" {
  name                 = "main-subnet"
  resource_group_name  = azurerm_resource_group.dns.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Private DNS zone
resource "azurerm_private_dns_zone" "internal" {
  name                = "internal.mycompany.com"
  resource_group_name = azurerm_resource_group.dns.name

  tags = {
    Environment = var.environment
  }
}

# Link VNet to the private DNS zone
resource "azurerm_private_dns_zone_virtual_network_link" "main" {
  name                  = "${var.environment}-vnet-link"
  resource_group_name   = azurerm_resource_group.dns.name
  private_dns_zone_name = azurerm_private_dns_zone.internal.name
  virtual_network_id    = azurerm_virtual_network.main.id
  registration_enabled  = true  # Auto-register VM hostnames
}

# dns_records.tf - Service Records
# A record for API
resource "azurerm_private_dns_a_record" "api" {
  name                = "api"
  zone_name           = azurerm_private_dns_zone.internal.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  records             = ["10.0.1.50"]
}

# A record for database with multiple IPs (round-robin)
resource "azurerm_private_dns_a_record" "database" {
  name                = "db"
  zone_name           = azurerm_private_dns_zone.internal.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  records             = ["10.0.1.100", "10.0.1.101", "10.0.1.102"]
}

# CNAME record
resource "azurerm_private_dns_cname_record" "api_alias" {
  name                = "backend"
  zone_name           = azurerm_private_dns_zone.internal.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  record              = "api.internal.mycompany.com"
}

# outputs.tf
output "private_dns_zone_id" {
  description = "ID of the private DNS zone"
  value       = azurerm_private_dns_zone.internal.id
}
```

## Best Practices Summary

### Naming Conventions

- Use a consistent domain hierarchy: `<service>.<environment>.internal.<company>.com`
- Examples: `api.prod.internal.mycompany.com`, `db.staging.internal.mycompany.com`
- Avoid using public TLDs for private zones to prevent split-horizon DNS issues

### TTL Configuration

- Use low TTLs (60-300 seconds) for services that may change IP addresses
- Use higher TTLs (3600+ seconds) for stable infrastructure like databases
- Consider TTL impact on failover time during incidents

### Security Considerations

- Limit which VPCs/VNets can resolve your private zones
- Use separate zones for different security tiers (e.g., PCI vs. non-PCI)
- Audit DNS query logs for anomalous resolution patterns
- Never expose private zone records through public DNS

### High Availability

- Deploy DNS resolver endpoints in multiple availability zones
- Use health checks with alias records when possible
- Test DNS resolution during disaster recovery drills

### Operational Excellence

- Use Infrastructure as Code (Terraform, Pulumi, CloudFormation) for all DNS changes
- Implement change management processes for DNS modifications
- Monitor DNS resolution latency and failure rates
- Document your DNS architecture and update it when changes occur

### Multi-Cloud Considerations

- Use consistent naming conventions across cloud providers
- Consider a centralized DNS management approach for hybrid environments
- Test cross-cloud DNS resolution thoroughly before production

---

Private DNS zones are foundational infrastructure that often gets overlooked until something breaks. Take the time to design them properly, automate their management, and document your architecture. Your future self debugging a 3 AM incident will thank you.

For monitoring your DNS infrastructure and getting alerted when resolution fails, check out [OneUptime](https://oneuptime.com) - it can monitor your internal services and alert you before your users notice problems.
