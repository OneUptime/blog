# How to Configure Oracle Cloud Infrastructure with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, OCI, Oracle Cloud, VCN, Networking

Description: Configure IPv6 on Oracle Cloud Infrastructure (OCI), including enabling IPv6 on VCN, subnets, and compute instances with Terraform.

## Introduction

Oracle Cloud Infrastructure (OCI) supports IPv6 on Virtual Cloud Networks (VCNs). IPv6 must be enabled at the VCN level, then on each subnet, and finally assigned to instances. OCI provides both BYO-IP IPv6 and Oracle-assigned IPv6 ranges.

## Enabling IPv6 on a New VCN

```bash
# OCI CLI: create VCN with IPv6

oci network vcn create \
  --compartment-id "ocid1.compartment.oc1...." \
  --display-name "my-vcn" \
  --cidr-block "10.0.0.0/16" \
  --is-ipv6-enabled true

# Add IPv6 CIDR to existing VCN
oci network vcn add-ipv6-vcn-cidr \
  --vcn-id "ocid1.vcn.oc1...." \
  --is-oracle-gua-allocation-enabled true
```

## Terraform: VCN with IPv6

```hcl
# main.tf - OCI VCN with IPv6
resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_id
  display_name   = "ipv6-vcn"
  cidr_block     = "10.0.0.0/16"
  is_ipv6enabled = true
}

resource "oci_core_subnet" "public" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.main.id
  display_name      = "public-subnet"
  cidr_block        = "10.0.1.0/24"
  ipv6cidr_block    = cidrsubnet(oci_core_vcn.main.ipv6cidr_blocks[0], 8, 0)
  route_table_id    = oci_core_route_table.public.id
  security_list_ids = [oci_core_security_list.public.id]
}

resource "oci_core_instance" "web" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "web-server"
  shape               = "VM.Standard.E4.Flex"

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true
    assign_ipv6ip    = true  # Request IPv6 address
  }

  source_details {
    source_id   = var.image_id
    source_type = "image"
  }

  shape_config {
    ocpus         = 2
    memory_in_gbs = 8
  }
}
```

## Internet Gateway for IPv6

```hcl
resource "oci_core_internet_gateway" "igw" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "internet-gateway"
  enabled        = true
}

resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "public-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.igw.id
  }

  # IPv6 default route
  route_rules {
    destination       = "::/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.igw.id
  }
}
```

## Security List for IPv6

```hcl
resource "oci_core_security_list" "public" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "public-sl"

  # Allow inbound HTTPS from IPv6
  ingress_security_rules {
    protocol    = "6"  # TCP
    source      = "::/0"
    source_type = "CIDR_BLOCK"

    tcp_options {
      min = 443
      max = 443
    }
  }

  # Allow all outbound IPv6
  egress_security_rules {
    protocol         = "all"
    destination      = "::/0"
    destination_type = "CIDR_BLOCK"
  }
}
```

## Verifying IPv6 on Instance

```bash
# SSH into instance and verify
ip -6 addr show ens3
# inet6 2603:c020:400f:abc::1/64 scope global dynamic

# Test connectivity
ping6 2001:4860:4860::8888

# Check routing
ip -6 route show default
# default via fe80::1 dev ens3 proto ra
```

## Conclusion

OCI IPv6 requires explicit enablement at the VCN, subnet, and instance VNIC level. Use `assign_ipv6ip = true` in Terraform to request an IPv6 address. Add `::/0` routes to the internet gateway route table for IPv6 default routing. Monitor OCI instance IPv6 reachability and application health with OneUptime.
