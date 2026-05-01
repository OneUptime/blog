# How to Deploy Portainer on Oracle Cloud Free Tier

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Oracle Cloud, OCI, Docker, Free Tier, Self-Hosted

Description: Learn how to deploy Portainer CE on Oracle Cloud's Always Free tier compute instances for a zero-cost Docker management platform.

---

Oracle Cloud's Always Free tier includes up to two AMD micro VMs (1 OCPU, 1 GB RAM each) or up to four Arm-based Ampere A1 instances, with 4 OCPUs and 24 GB of memory total across them. This makes it one of the most generous free cloud tiers for self-hosted Docker workloads.

---

## Configure the OCI Provider

```hcl
terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 8.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}
```

---

## Create the Compute Instance (Ampere A1 Free Tier)

```hcl
resource "oci_core_instance" "portainer" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "portainer"
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = 2
    memory_in_gbs = 12
  }

  source_details {
    source_type = "image"
    source_id   = var.ubuntu_image_ocid
  }

  create_vnic_details {
    subnet_id = oci_core_subnet.public.id
    assign_public_ip = true
  }

  metadata = {
    ssh_authorized_keys = file(pathexpand("~/.ssh/id_rsa.pub"))
    user_data = base64encode(<<-EOF
      #!/bin/bash
      apt-get update -y
      curl -fsSL https://get.docker.com | sh
      docker volume create portainer_data
      docker run -d         --name portainer         --restart=always         -p 9443:9443         -v /var/run/docker.sock:/var/run/docker.sock         -v portainer_data:/data         portainer/portainer-ce:latest
    EOF
    )
  }
}
```

---

## Security List Rules (Firewall)

```hcl
resource "oci_core_security_list" "portainer" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "portainer-sl"

  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
    stateless   = false
  }

  ingress_security_rules {
    protocol  = "6"  # TCP
    source    = var.admin_ip_cidr
    stateless = false
    tcp_options {
      min = 9443
      max = 9443
    }
  }
}
```

---

## Summary

Oracle Cloud's Always Free A1 Flex instances (ARM-based) provide generous compute for Portainer. Use `shape = "VM.Standard.A1.Flex"` in your tenancy's home region and allocate up to 4 OCPUs and 24 GB RAM across free instances. Pass a `user_data` bootstrap script to install Docker and Portainer. Configure security list rules to allow outbound access and restrict inbound port 9443 to your admin CIDR.
