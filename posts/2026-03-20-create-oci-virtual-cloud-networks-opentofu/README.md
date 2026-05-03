# How to Create OCI Virtual Cloud Networks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Oracle Cloud, VCN, Networking, Infrastructure as Code

Description: Learn how to create Oracle Cloud Infrastructure (OCI) Virtual Cloud Networks with OpenTofu, including subnets, internet gateways, and route tables.

An OCI Virtual Cloud Network (VCN) is the fundamental networking resource in OCI. It provides an isolated virtual network with subnets, routing, and security controls. OpenTofu lets you define the complete VCN topology as code.

## Creating a VCN

```hcl
resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_id
  cidr_block     = "10.0.0.0/16"
  display_name   = "production-vcn"
  dns_label      = "production"  # Used for internal DNS

  freeform_tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}
```

## Adding an Internet Gateway

```hcl
resource "oci_core_internet_gateway" "main" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "production-igw"
  enabled        = true
}
```

## Creating a Route Table

```hcl
resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "public-route-table"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.main.id
  }
}
```

## Creating Public and Private Subnets

```hcl
# Public subnet

resource "oci_core_subnet" "public" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = "10.0.1.0/24"
  display_name      = "public-subnet"
  dns_label         = "public"
  route_table_id    = oci_core_route_table.public.id
  prohibit_public_ip_on_vnic = false  # Allow public IPs
}

# Private subnet (uses default route table with no IGW route)
resource "oci_core_subnet" "private" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = "10.0.2.0/24"
  display_name      = "private-subnet"
  dns_label         = "private"
  prohibit_public_ip_on_vnic = true   # No public IPs allowed
}
```

## Adding a NAT Gateway for Private Subnets

```hcl
resource "oci_core_nat_gateway" "main" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "production-nat"
}

resource "oci_core_route_table" "private" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "private-route-table"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_nat_gateway.main.id
  }
}

# Update private subnet to use the private route table
resource "oci_core_subnet" "private_nat" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = "10.0.3.0/24"
  display_name      = "private-nat-subnet"
  dns_label         = "privatenat"
  route_table_id    = oci_core_route_table.private.id
  prohibit_public_ip_on_vnic = true
}
```

## Security Lists (Default Inbound/Outbound Rules)

```hcl
resource "oci_core_security_list" "web" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "web-security-list"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  ingress_security_rules {
    protocol = "6"  # TCP
    source   = "0.0.0.0/0"
    tcp_options {
      max = 443
      min = 443
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      max = 80
      min = 80
    }
  }
}
```

## Conclusion

An OCI VCN requires multiple components: the VCN itself, subnets, gateways (internet and NAT), and route tables. Use `oci_core_vcn`, `oci_core_subnet`, and the gateway resources together to build a standard public/private network topology. Security lists provide subnet-level traffic rules complementary to Network Security Groups.
