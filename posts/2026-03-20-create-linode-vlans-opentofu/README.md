# How to Create Linode VLANs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Linode, VLAN, Private Networking, Infrastructure as Code

Description: Learn how to use Linode VLANs with OpenTofu to create isolated private networks for secure inter-instance communication.

Linode VLANs provide private, layer-2 network segments that allow instances to communicate over private IP addresses without traffic leaving Linode's infrastructure. Unlike Linode's shared private network, VLANs are isolated per account and region.

## How Linode VLANs Work

VLANs in Linode are created implicitly by assigning instances to the same VLAN label. Instances on the same VLAN can communicate directly over their VLAN interface (`eth1`).

## Attaching an Instance to a VLAN

VLAN configuration is done inline within the `linode_instance` resource via the `interface` block:

```hcl
resource "linode_instance" "app" {
  count           = 3
  label           = "app-${count.index + 1}"
  region          = "us-east"
  type            = "g6-standard-2"
  image           = "linode/ubuntu24.04"
  root_pass       = var.root_password
  authorized_keys = [var.ssh_public_key]

  # Public internet interface (eth0)
  interface {
    purpose = "public"
  }

  # VLAN interface (eth1) - all instances on the same label form a VLAN
  interface {
    purpose   = "vlan"
    label     = "production-vlan"            # Instances sharing this label are in the same VLAN
    ipam_address = "10.0.0.${count.index + 10}/24"  # Assign VLAN IP manually
  }
}
```

## Connecting to Only Private (VLAN) Network

For backend servers that should not have a public interface:

```hcl
resource "linode_instance" "database" {
  label           = "db-01"
  region          = "us-east"
  type            = "g6-standard-2"
  image           = "linode/ubuntu24.04"
  root_pass       = var.root_password
  authorized_keys = [var.ssh_public_key]

  # No public interface - only VLAN connectivity
  interface {
    purpose      = "vlan"
    label        = "production-vlan"
    ipam_address = "10.0.0.50/24"
  }
}
```

## Multi-Tier Architecture with VLANs

```hcl
# Web tier with public + VLAN interfaces

resource "linode_instance" "web" {
  count = 2
  label = "web-${count.index + 1}"
  # ...

  interface { purpose = "public" }
  interface {
    purpose      = "vlan"
    label        = "production-vlan"
    ipam_address = "10.0.0.${count.index + 10}/24"
  }
}

# App tier with VLAN only
resource "linode_instance" "app" {
  count = 2
  label = "app-${count.index + 1}"
  # ...

  interface {
    purpose      = "vlan"
    label        = "production-vlan"
    ipam_address = "10.0.0.${count.index + 20}/24"
  }
}
```

## VLAN Interface Configuration with Cloud-Init

After creating the instance, configure the VLAN interface with cloud-init:

```hcl
resource "linode_instance" "app" {
  # ...
  metadata {
    user_data = base64encode(<<-EOT
      #cloud-config
      runcmd:
        # Ensure the VLAN interface (eth1) is up
        - ip link set eth1 up
        - ip addr add 10.0.0.10/24 dev eth1
    EOT
    )
  }
}
```

## Conclusion

Linode VLANs provide free, isolated private networking between instances within the same region. Create VLANs implicitly by assigning instances to the same VLAN label, use `ipam_address` to assign consistent private IPs, and combine public and VLAN interfaces for web-tier instances while using VLAN-only for backend instances that don't need public access.
