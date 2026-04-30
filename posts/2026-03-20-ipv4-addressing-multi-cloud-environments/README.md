# How to Plan IPv4 Addressing for Multi-Cloud Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Multi-Cloud, AWS, Azure, GCP, VPC, Network Design, Peering

Description: Design a non-overlapping IPv4 addressing scheme across AWS, Azure, and GCP that supports VPC/VNet peering, Transit Gateway, and on-premises connectivity without CIDR conflicts.

## Introduction

Multi-cloud architectures require non-overlapping IPv4 CIDRs across all cloud providers and on-premises networks. A single CIDR conflict prevents VPC peering and complicates routing. Planning upfront avoids expensive renumbering.
This example assumes GCP custom mode VPC networks. Google Cloud auto mode VPC networks use `10.128.0.0/9`, so avoid that range if you need connectivity to default or other auto mode networks.

## Multi-Cloud Addressing Framework

```text
Master Allocation: 10.0.0.0/8

  On-Premises:    10.0.0.0/10    (10.0.0.0 – 10.63.255.255)
    Corp LAN:     10.1.0.0/16
    Data Centers: 10.10.0.0/14

  AWS:            10.64.0.0/10   (10.64.0.0 – 10.127.255.255)
    us-east-1:    10.64.0.0/12
    us-west-2:    10.80.0.0/12
    eu-west-1:    10.96.0.0/12

  Azure:          10.128.0.0/10  (10.128.0.0 – 10.191.255.255)
    East US:      10.128.0.0/12
    West Europe:  10.144.0.0/12

  GCP:            10.192.0.0/10  (10.192.0.0 – 10.255.255.255)
    us-central1:  10.192.0.0/12
    europe-west1: 10.208.0.0/12
```

## AWS VPC Subnetting

```hcl
# Terraform

resource "aws_vpc" "prod" {
  cidr_block = "10.64.0.0/16"
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.prod.id
  cidr_block        = "10.64.0.0/24"
  availability_zone = "us-east-1a"
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.prod.id
  cidr_block        = "10.64.10.0/24"
  availability_zone = "us-east-1a"
}
```

## Azure VNet Subnetting

```hcl
resource "azurerm_virtual_network" "prod" {
  name                = "prod-vnet"
  address_space       = ["10.128.0.0/16"]
  location            = "East US"
  resource_group_name = azurerm_resource_group.prod.name
}

resource "azurerm_subnet" "workloads" {
  name                 = "workloads"
  resource_group_name  = azurerm_resource_group.prod.name
  virtual_network_name = azurerm_virtual_network.prod.name
  address_prefixes     = ["10.128.10.0/24"]
}
```

## GCP VPC Subnetting

```hcl
resource "google_compute_network" "prod" {
  name                    = "prod"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "us_central" {
  name          = "prod-us-central1"
  ip_cidr_range = "10.192.0.0/20"
  region        = "us-central1"
  network       = google_compute_network.prod.id
}
```

## Python Overlap Checker

```python
import ipaddress

def check_overlaps(networks: dict[str, str]) -> list[tuple]:
    parsed = {name: ipaddress.IPv4Network(cidr)
              for name, cidr in networks.items()}
    overlaps = []
    names = list(parsed.keys())
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            n1, n2 = parsed[names[i]], parsed[names[j]]
            if n1.overlaps(n2):
                overlaps.append((names[i], names[j], str(n1), str(n2)))
    return overlaps

allocation = {
    "on_prem_corp":   "10.1.0.0/16",
    "aws_use1":       "10.64.0.0/16",
    "aws_usw2":       "10.80.0.0/16",
    "azure_eastus":   "10.128.0.0/16",
    "gcp_uscentral1": "10.192.0.0/16",
}

overlaps = check_overlaps(allocation)
if overlaps:
    for o in overlaps:
        print(f"OVERLAP: {o[0]} ({o[2]}) vs {o[1]} ({o[3]})")
else:
    print("No overlaps detected.")
```

## Conclusion

Reserve separate private CIDR blocks for each cloud provider and on-premises, and subdivide them by region. If GCP default or other auto mode VPC networks are in scope, avoid the `10.128.0.0/9` range that auto mode uses. Validate non-overlap programmatically before provisioning peering connections. With non-overlapping ranges, this structure supports Transit Gateway, Azure VNet peering, and GCP VPC peering without renumbering.
