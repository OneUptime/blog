# How to Use the cidrnetmask Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Networking, CIDR, Subnet Mask, Infrastructure as Code

Description: Learn how to use Terraform's cidrnetmask function to convert CIDR prefix lengths into traditional dotted-decimal subnet masks for your network configurations.

---

Subnet masks come in two common formats: CIDR notation (like `/24`) and dotted-decimal notation (like `255.255.255.0`). While modern cloud platforms and Terraform itself prefer CIDR notation, many legacy systems, on-premises devices, and configuration files still require the dotted-decimal format. Terraform's `cidrnetmask` function bridges this gap by converting CIDR prefixes to subnet masks.

## What Does cidrnetmask Do?

The `cidrnetmask` function takes an IPv4 address prefix in CIDR notation and returns the corresponding subnet mask in dotted-decimal format.

```hcl
# Convert a /24 prefix to its subnet mask
output "mask" {
  value = cidrnetmask("10.0.0.0/24")
  # Result: "255.255.255.0"
}
```

## Syntax

```hcl
cidrnetmask(prefix)
```

The `prefix` argument is a string in CIDR notation. The function returns a string containing the subnet mask in the standard four-octet dotted-decimal format.

Note that this function only works with IPv4 addresses. IPv6 does not use dotted-decimal subnet masks.

## Common CIDR to Subnet Mask Conversions

Here are the most frequently used conversions for reference:

```hcl
locals {
  masks = {
    # Class A equivalent
    slash_8  = cidrnetmask("10.0.0.0/8")    # 255.0.0.0

    # Class B equivalent
    slash_16 = cidrnetmask("172.16.0.0/16")  # 255.255.0.0

    # Common subnet sizes
    slash_20 = cidrnetmask("10.0.0.0/20")    # 255.255.240.0
    slash_24 = cidrnetmask("10.0.0.0/24")    # 255.255.255.0
    slash_25 = cidrnetmask("10.0.0.0/25")    # 255.255.255.128
    slash_26 = cidrnetmask("10.0.0.0/26")    # 255.255.255.192
    slash_27 = cidrnetmask("10.0.0.0/27")    # 255.255.255.224
    slash_28 = cidrnetmask("10.0.0.0/28")    # 255.255.255.240
  }
}
```

## Practical Examples

### Configuring Network Interfaces on VMs

When setting up virtual machines with static network configurations, you often need the subnet mask in traditional format:

```hcl
variable "network_cidr" {
  description = "Network CIDR for the application tier"
  type        = string
  default     = "10.0.1.0/24"
}

# Use cidrnetmask to get the mask for VM configuration scripts
resource "null_resource" "configure_network" {
  provisioner "remote-exec" {
    inline = [
      # Configure the network interface with the correct subnet mask
      "sudo ifconfig eth1 ${cidrhost(var.network_cidr, 50)} netmask ${cidrnetmask(var.network_cidr)} up"
    ]

    connection {
      type = "ssh"
      host = aws_instance.app.public_ip
      user = "ubuntu"
    }
  }
}
```

### Generating Configuration Files

Many applications and network devices expect subnet masks in dotted-decimal format in their configuration files:

```hcl
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

# Generate a network configuration file for an on-premises device
resource "local_file" "network_config" {
  filename = "${path.module}/generated/network.conf"
  content  = <<-EOT
    # Auto-generated network configuration
    NETWORK=${cidrhost(var.vpc_cidr, 0)}
    NETMASK=${cidrnetmask(var.vpc_cidr)}
    GATEWAY=${cidrhost(var.vpc_cidr, 1)}
    DNS1=10.0.0.2
  EOT
}
```

### Working with VPN Configurations

VPN configurations frequently need subnet masks in dotted-decimal format:

```hcl
variable "vpn_networks" {
  description = "Networks to route through the VPN"
  type        = list(string)
  default     = [
    "10.0.0.0/16",
    "172.16.0.0/12",
    "192.168.0.0/24",
  ]
}

# Generate VPN route entries with both network and mask
locals {
  vpn_routes = [
    for cidr in var.vpn_networks : {
      network = cidrhost(cidr, 0)
      netmask = cidrnetmask(cidr)
    }
  ]
}

# Use in a VPN configuration template
resource "local_file" "vpn_config" {
  filename = "${path.module}/generated/vpn-routes.conf"
  content = join("\n", [
    for route in local.vpn_routes :
    # Format: route <network> <netmask>
    "route ${route.network} ${route.netmask}"
  ])
}

# Output for verification
output "vpn_routes" {
  value = local.vpn_routes
  # Example output:
  # [
  #   { network = "10.0.0.0", netmask = "255.255.0.0" },
  #   { network = "172.16.0.0", netmask = "255.240.0.0" },
  #   { network = "192.168.0.0", netmask = "255.255.255.0" }
  # ]
}
```

### Provisioning Firewall Rules

Some firewall systems use subnet masks rather than CIDR notation:

```hcl
variable "allowed_networks" {
  description = "Networks allowed through the firewall"
  type        = list(string)
  default     = [
    "10.0.1.0/24",
    "10.0.2.0/24",
    "192.168.100.0/26",
  ]
}

# Generate firewall rules in the format the device expects
resource "local_file" "firewall_rules" {
  filename = "${path.module}/generated/firewall.rules"
  content = join("\n", [
    for idx, cidr in var.allowed_networks :
    # Firewall rule format: permit <network> <wildcard_mask>
    "access-list 100 permit ip ${cidrhost(cidr, 0)} ${cidrnetmask(cidr)} any"
  ])
}
```

### Templating with templatefile

You can use `cidrnetmask` inside template files for more complex configurations:

```hcl
# In main.tf
variable "subnets" {
  type = map(string)
  default = {
    web = "10.0.1.0/24"
    app = "10.0.2.0/24"
    db  = "10.0.3.0/28"
  }
}

locals {
  # Pre-compute subnet details for the template
  subnet_details = {
    for name, cidr in var.subnets : name => {
      cidr    = cidr
      network = cidrhost(cidr, 0)
      netmask = cidrnetmask(cidr)
      gateway = cidrhost(cidr, 1)
    }
  }
}

resource "local_file" "dhcp_config" {
  filename = "${path.module}/generated/dhcpd.conf"
  content  = templatefile("${path.module}/templates/dhcpd.conf.tpl", {
    subnets = local.subnet_details
  })
}
```

And in `templates/dhcpd.conf.tpl`:

```
%{ for name, subnet in subnets ~}
# ${name} subnet
subnet ${subnet.network} netmask ${subnet.netmask} {
  option routers ${subnet.gateway};
  option subnet-mask ${subnet.netmask};
}
%{ endfor ~}
```

## Limitations

The `cidrnetmask` function only works with IPv4 CIDR prefixes. If you pass an IPv6 prefix, Terraform will return an error. This makes sense because IPv6 networking does not use dotted-decimal subnet masks.

```hcl
# This works fine
output "ipv4_mask" {
  value = cidrnetmask("10.0.0.0/24")
}

# This will produce an error
# output "ipv6_mask" {
#   value = cidrnetmask("fd00::/64")
# }
```

## Understanding the Math

The conversion from CIDR prefix length to subnet mask is straightforward: a `/n` prefix means the first `n` bits are set to 1, and the remaining bits are 0. These bits are then grouped into four 8-bit octets and converted to decimal.

For example, `/20` means 20 ones followed by 12 zeros:
- Binary: `11111111.11111111.11110000.00000000`
- Decimal: `255.255.240.0`

The `cidrnetmask` function handles this conversion for you, but understanding the underlying math helps when debugging network issues.

## Summary

The `cidrnetmask` function serves a specific but important purpose: converting CIDR prefix lengths to traditional dotted-decimal subnet masks. While cloud-native configurations mostly use CIDR notation, there are plenty of scenarios where the old-school format is needed - VPN configs, DHCP server setups, legacy device provisioning, and more. Keep `cidrnetmask` handy for those situations, and combine it with [cidrhost](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-cidrhost-function-in-terraform/view) and [cidrsubnet](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-cidrsubnet-function-in-terraform/view) for complete network address management in Terraform.
