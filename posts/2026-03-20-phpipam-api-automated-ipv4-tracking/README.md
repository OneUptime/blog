# How to Configure phpIPAM API for Automated IPv4 Address Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: phpIPAM, IPAM, IPv4, API, Automation, Network Management

Description: Use the phpIPAM REST API to automate IPv4 address allocation, tracking, and updates as part of your infrastructure provisioning workflows.

## Introduction

phpIPAM is an open-source IP Address Management (IPAM) tool with a full REST API. By integrating the API into your provisioning scripts, you can automatically allocate IPs, record hostnames, and update usage status as servers are created and destroyed.

## Enabling the API in phpIPAM

1. Log into phpIPAM as admin
2. Navigate to **Administration > phpIPAM settings > Feature settings**
3. Enable **API** and set the API key encryption method
4. Create an API application under **Administration > API** with your desired permissions
5. Ensure URL rewriting is enabled on the web server, because phpIPAM requires it for API routes

## Authentication

phpIPAM supports token-based authentication:

```bash
# Authenticate and obtain a token

TOKEN=$(curl -s -X POST \
  "https://phpipam.example.com/api/myapp/user/" \
  -H "Content-Type: application/json" \
  -u "admin:adminpassword" | jq -r '.data.token')

echo "Token: ${TOKEN}"
```

## Listing Subnets

```bash
# Get all subnets in section 1 (Local)
curl -s \
  "https://phpipam.example.com/api/myapp/sections/1/subnets/" \
  -H "token: ${TOKEN}" | jq '.data[] | {id, subnet, mask, description}'
```

## Getting the First Available IP in a Subnet

```bash
SUBNET_ID=5   # Subnet ID from the list command

# Request the first available IP from subnet 5
AVAILABLE_IP=$(curl -s \
  "https://phpipam.example.com/api/myapp/subnets/${SUBNET_ID}/first_free/" \
  -H "token: ${TOKEN}" | jq -r '.data')

echo "Next available IP: ${AVAILABLE_IP}"
```

## Creating an IP Address Record

Once you have the IP, register it with the new host's details:

```bash
# Register the IP with hostname and description
curl -s -X POST \
  "https://phpipam.example.com/api/myapp/addresses/" \
  -H "Content-Type: application/json" \
  -H "token: ${TOKEN}" \
  -d "{
    \"subnetId\": \"${SUBNET_ID}\",
    \"ip\": \"${AVAILABLE_IP}\",
    \"hostname\": \"web-prod-07.example.com\",
    \"description\": \"Production web server\",
    \"note\": \"Provisioned by Terraform on $(date)\",
    \"tag\": 2
  }"
```

Default tag values in a stock phpIPAM install are: `1` = Offline, `2` = Used, `3` = Reserved, `4` = DHCP. If your installation uses custom tags, verify them with `/api/myapp/addresses/tags/`.

## Searching for an IP Address

```bash
# Search for a specific IP
curl -s \
  "https://phpipam.example.com/api/myapp/addresses/search/${AVAILABLE_IP}/" \
  -H "token: ${TOKEN}" | jq '.data[] | {id, ip, hostname, description}'
```

## Updating an IP Record

```bash
IP_RECORD_ID=42   # Get this from the search or create response

# Update hostname and description
curl -s -X PATCH \
  "https://phpipam.example.com/api/myapp/addresses/${IP_RECORD_ID}/" \
  -H "Content-Type: application/json" \
  -H "token: ${TOKEN}" \
  -d '{"hostname": "web-prod-07-renamed.example.com", "tag": 2}'
```

## Deleting (Releasing) an IP

```bash
# Release an IP record when the server is decommissioned
curl -s -X DELETE \
  "https://phpipam.example.com/api/myapp/addresses/${IP_RECORD_ID}/" \
  -H "token: ${TOKEN}"
```

## Integrating with Terraform

Use the Terraform phpIPAM provider for infrastructure-as-code IPAM integration:

```hcl
terraform {
  required_providers {
    phpipam = {
      source = "lord-kyron/phpipam"
    }
  }
}

provider "phpipam" {
  endpoint  = "https://phpipam.example.com/api"
  username  = "api-user"
  password  = var.phpipam_password
  app_id    = "myapp"
}

# Request next available IP from subnet
data "phpipam_first_free_address" "next_ip" {
  subnet_id = 5
}

# Create the IP record and use the IP for the VM
resource "phpipam_address" "vm_ip" {
  subnet_id   = 5
  ip_address  = data.phpipam_first_free_address.next_ip.ip_address
  hostname    = "web-prod-07.example.com"
  description = "Terraform managed"

  lifecycle {
    ignore_changes = [
      subnet_id,
      ip_address,
    ]
  }
}
```

## Conclusion

The phpIPAM API enables true IPAM-as-code: IPs are allocated, tracked, and released automatically as infrastructure is provisioned and decommissioned. This eliminates spreadsheet-based IP tracking and ensures accurate, up-to-date records in your IPAM system.
