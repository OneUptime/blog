# How to Create OCI Compute Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Oracle Cloud, OCI Compute, Infrastructure as Code, Virtual Machine

Description: Learn how to create Oracle Cloud Infrastructure (OCI) compute instances with OpenTofu, including VCN placement, SSH keys, and cloud-init configuration.

OCI Compute provides virtual machine instances with flexible shapes and bare-metal options. OpenTofu lets you provision instances, configure networking, and inject cloud-init scripts as code.

## Finding Required OCIDs

```hcl
# Get availability domains in your region

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_id
}

# Find the latest Oracle Linux image
data "oci_core_images" "oracle_linux" {
  compartment_id           = var.compartment_id
  operating_system         = "Oracle Linux"
  operating_system_version = "9"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}
```

## Creating a Compute Instance

```hcl
resource "oci_core_instance" "web" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_id
  display_name        = "web-01"
  shape               = "VM.Standard.E4.Flex"

  shape_config {
    ocpus         = 2
    memory_in_gbs = 8
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.oracle_linux.images[0].id
  }

  # Network configuration
  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true
    display_name     = "web-01-vnic"
  }

  metadata = {
    # SSH public key for opc user
    ssh_authorized_keys = var.ssh_public_key

    # Cloud-init user data (base64 encoded)
    user_data = base64encode(<<-EOT
      #!/bin/bash
      yum install -y nginx
      systemctl enable nginx
      systemctl start nginx
    EOT
    )
  }

  freeform_tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}

output "instance_public_ip" {
  value = oci_core_instance.web.public_ip
}
```

## Common OCI Shapes

| Shape | Description |
|---|---|
| VM.Standard.E4.Flex | AMD, flexible OCPUs/memory |
| VM.Standard.A1.Flex | ARM (Ampere), 4 Always Free OCPUs available |
| VM.Standard3.Flex | Intel, flexible OCPUs/memory |
| VM.DenseIO.E4.Flex | AMD, NVMe local SSD |

## Free Tier Instance (Always Free)

```hcl
resource "oci_core_instance" "free_tier" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_id
  display_name        = "free-tier-arm"
  shape               = "VM.Standard.A1.Flex"  # Always Free eligible

  shape_config {
    ocpus         = 4     # Up to 4 OCPUs free
    memory_in_gbs = 24    # Up to 24 GB free across instances
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.oracle_linux.images[0].id
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
  }
}
```

## Boot Volume Configuration

```hcl
resource "oci_core_instance" "custom_boot" {
  # ...
  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.oracle_linux.images[0].id
    boot_volume_size_in_gbs = 100  # Custom boot volume size
  }
}
```

## Conclusion

OCI Compute instances are provisioned with `oci_core_instance`. Use flexible shapes to right-size CPU and memory, inject SSH keys via the `metadata` block, and use cloud-init for first-boot configuration. Consider ARM-based `VM.Standard.A1.Flex` instances for cost efficiency, especially for Always Free tier usage.
