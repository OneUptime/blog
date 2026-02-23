# How to Calculate Available IP Addresses in Subnets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Subnets, CIDR, IP Addresses, Networking, Infrastructure as Code

Description: Learn how to calculate available IP addresses in AWS subnets with Terraform using CIDR functions, plan subnet sizing, and avoid IP exhaustion in your VPC architecture.

---

Running out of IP addresses in a subnet can cause new resources to fail to launch, disrupting your operations. Understanding how many IPs are available in your subnets and planning their sizes correctly is essential for stable AWS infrastructure. This guide covers using Terraform's built-in CIDR functions to calculate and plan IP address allocations across your VPC subnets.

## How AWS Subnet IP Addressing Works

In every AWS subnet, five IP addresses are reserved by AWS and cannot be assigned to your resources. For a subnet with CIDR 10.0.1.0/24, the reserved addresses are the network address (10.0.1.0), the VPC router (10.0.1.1), the DNS server (10.0.1.2), a reserved-for-future-use address (10.0.1.3), and the broadcast address (10.0.1.255). This means a /24 subnet gives you 251 usable IPs, not 256.

## Prerequisites

You need Terraform 1.0 or later. This guide focuses on CIDR math and Terraform functions, so no AWS account is strictly required for the calculations, though you will need one to apply the configurations.

## Subnet Size Reference Table

Here is a quick reference for common subnet sizes and their usable IP counts.

```hcl
locals {
  # Subnet size reference: prefix length -> total IPs -> usable IPs (minus 5 AWS reserved)
  subnet_sizes = {
    "/16" = { total = 65536, usable = 65531 }
    "/17" = { total = 32768, usable = 32763 }
    "/18" = { total = 16384, usable = 16379 }
    "/19" = { total = 8192,  usable = 8187  }
    "/20" = { total = 4096,  usable = 4091  }
    "/21" = { total = 2048,  usable = 2043  }
    "/22" = { total = 1024,  usable = 1019  }
    "/23" = { total = 512,   usable = 507   }
    "/24" = { total = 256,   usable = 251   }
    "/25" = { total = 128,   usable = 123   }
    "/26" = { total = 64,    usable = 59    }
    "/27" = { total = 32,    usable = 27    }
    "/28" = { total = 16,    usable = 11    }
  }
}

output "subnet_size_reference" {
  description = "Reference table for subnet sizes and usable IPs"
  value       = local.subnet_sizes
}
```

## Calculating IPs with Terraform Functions

Terraform provides the `cidrhost`, `cidrsubnet`, `cidrnetmask`, and `cidrcontains` functions for IP address math.

```hcl
locals {
  vpc_cidr = "10.0.0.0/16"

  # Calculate the total number of IPs in a CIDR block
  # Formula: 2^(32 - prefix_length)
  vpc_prefix_length = tonumber(split("/", local.vpc_cidr)[1])
  vpc_total_ips     = pow(2, 32 - local.vpc_prefix_length)

  # Calculate subnet CIDRs with cidrsubnet
  # cidrsubnet(prefix, newbits, netnum)
  # newbits: how many additional bits to use for subnetting
  # For a /16 VPC, 8 newbits creates /24 subnets
  subnet_examples = {
    "/24_from_16" = {
      cidr       = cidrsubnet(local.vpc_cidr, 8, 0)  # 10.0.0.0/24
      total_ips  = pow(2, 32 - 24)                     # 256
      usable_ips = pow(2, 32 - 24) - 5                 # 251
    }
    "/20_from_16" = {
      cidr       = cidrsubnet(local.vpc_cidr, 4, 0)  # 10.0.0.0/20
      total_ips  = pow(2, 32 - 20)                     # 4096
      usable_ips = pow(2, 32 - 20) - 5                 # 4091
    }
    "/22_from_16" = {
      cidr       = cidrsubnet(local.vpc_cidr, 6, 0)  # 10.0.0.0/22
      total_ips  = pow(2, 32 - 22)                     # 1024
      usable_ips = pow(2, 32 - 22) - 5                 # 1019
    }
  }
}

output "vpc_capacity" {
  value = {
    vpc_cidr      = local.vpc_cidr
    total_ips     = local.vpc_total_ips
    usable_ips    = local.vpc_total_ips - 5
  }
}

output "subnet_calculations" {
  value = local.subnet_examples
}
```

## Practical Subnet Planning Module

Here is a module that plans subnets based on your requirements.

```hcl
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_count" {
  description = "Number of public subnets"
  type        = number
  default     = 3
}

variable "private_subnet_count" {
  description = "Number of private subnets"
  type        = number
  default     = 3
}

variable "database_subnet_count" {
  description = "Number of database subnets"
  type        = number
  default     = 3
}

locals {
  vpc_prefix = tonumber(split("/", var.vpc_cidr)[1])

  # Calculate optimal subnet sizes based on VPC size
  # Public subnets: smaller (for load balancers, NAT gateways)
  # Private subnets: larger (for application instances, containers)
  # Database subnets: medium (for RDS, ElastiCache)
  public_newbits   = 8   # /24 from /16 = 251 usable IPs per subnet
  private_newbits  = 4   # /20 from /16 = 4091 usable IPs per subnet
  database_newbits = 8   # /24 from /16 = 251 usable IPs per subnet

  # Calculate the subnet CIDRs
  public_subnets = {
    for i in range(var.public_subnet_count) :
    "public-${i + 1}" => {
      cidr       = cidrsubnet(var.vpc_cidr, local.public_newbits, i)
      usable_ips = pow(2, 32 - (local.vpc_prefix + local.public_newbits)) - 5
    }
  }

  private_subnets = {
    for i in range(var.private_subnet_count) :
    "private-${i + 1}" => {
      # Start private subnets at a higher netnum to avoid overlap with public
      cidr       = cidrsubnet(var.vpc_cidr, local.private_newbits, i + 1)
      usable_ips = pow(2, 32 - (local.vpc_prefix + local.private_newbits)) - 5
    }
  }

  database_subnets = {
    for i in range(var.database_subnet_count) :
    "database-${i + 1}" => {
      cidr       = cidrsubnet(var.vpc_cidr, local.database_newbits, i + 200)
      usable_ips = pow(2, 32 - (local.vpc_prefix + local.database_newbits)) - 5
    }
  }

  # Total capacity summary
  total_public_ips   = sum([for s in local.public_subnets : s.usable_ips])
  total_private_ips  = sum([for s in local.private_subnets : s.usable_ips])
  total_database_ips = sum([for s in local.database_subnets : s.usable_ips])
}

output "subnet_plan" {
  description = "Complete subnet plan with IP calculations"
  value = {
    vpc_cidr   = var.vpc_cidr
    vpc_total  = pow(2, 32 - local.vpc_prefix) - 5

    public_subnets = local.public_subnets
    public_total   = local.total_public_ips

    private_subnets = local.private_subnets
    private_total   = local.total_private_ips

    database_subnets = local.database_subnets
    database_total   = local.total_database_ips

    total_allocated = local.total_public_ips + local.total_private_ips + local.total_database_ips
    utilization_pct = format("%.1f%%",
      (local.total_public_ips + local.total_private_ips + local.total_database_ips) /
      (pow(2, 32 - local.vpc_prefix) - 5) * 100
    )
  }
}
```

## EKS-Optimized Subnet Planning

EKS clusters consume a large number of IP addresses. Each pod gets its own IP, so subnet sizing is critical.

```hcl
locals {
  # EKS IP planning
  # Assume: 50 nodes, 30 pods per node = 1,500 pod IPs needed
  # Add 20% buffer = 1,800 IPs
  # Plus node IPs: 50
  # Total: 1,850 IPs minimum

  eks_required_ips = 1850
  eks_prefix       = 32 - ceil(log(local.eks_required_ips + 5, 2))  # Calculate needed prefix

  # /20 = 4091 usable IPs, /21 = 2043 usable IPs
  # For 1850 IPs, we need at least /21 per AZ, or /20 for comfort

  eks_subnets = {
    for i in range(3) :
    "eks-${i + 1}" => {
      cidr       = cidrsubnet("10.0.0.0/16", 4, i + 4)  # /20 subnets
      total_ips  = pow(2, 32 - 20)
      usable_ips = pow(2, 32 - 20) - 5
      can_support_pods = pow(2, 32 - 20) - 5 - 50  # Minus node IPs
    }
  }
}

output "eks_subnet_plan" {
  description = "EKS-optimized subnet plan"
  value = {
    required_ips       = local.eks_required_ips
    subnets            = local.eks_subnets
    total_available    = sum([for s in local.eks_subnets : s.usable_ips])
    max_pods_supported = sum([for s in local.eks_subnets : s.can_support_pods])
  }
}
```

## Monitoring IP Utilization

Track available IPs at runtime using data sources.

```hcl
# Get current subnet utilization
data "aws_subnet" "monitored" {
  count = length(aws_subnet.private)
  id    = aws_subnet.private[count.index].id
}

output "subnet_utilization" {
  description = "Current IP utilization for each subnet"
  value = {
    for idx, subnet in data.aws_subnet.monitored :
    subnet.tags["Name"] => {
      cidr_block            = subnet.cidr_block
      available_ip_count    = subnet.available_ip_address_count
      total_usable_ips      = pow(2, 32 - tonumber(split("/", subnet.cidr_block)[1])) - 5
      utilization_percent   = format("%.1f%%",
        (1 - subnet.available_ip_address_count /
        (pow(2, 32 - tonumber(split("/", subnet.cidr_block)[1])) - 5)) * 100
      )
    }
  }
}
```

## CloudWatch Alarm for Low IP Availability

```hcl
# Custom metric for subnet IP availability via Lambda
resource "aws_cloudwatch_metric_alarm" "low_ips" {
  alarm_name          = "subnet-low-available-ips"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "AvailableIPAddressCount"
  namespace           = "CustomSubnetMetrics"
  period              = 300
  statistic           = "Minimum"
  threshold           = 50  # Alert when fewer than 50 IPs available
  alarm_description   = "Subnet running low on available IP addresses"

  alarm_actions = [aws_sns_topic.network_alerts.arn]
}

resource "aws_sns_topic" "network_alerts" {
  name = "subnet-ip-alerts"
}
```

## Best Practices for Subnet Sizing

For production workloads, use /20 subnets (4,091 usable IPs) for EKS and large container workloads. Use /22 (1,019 usable IPs) for standard application tiers. Use /24 (251 usable IPs) for small dedicated subnets like load balancers, databases, or management. Always plan for growth and leave room for secondary CIDR blocks.

Avoid using /28 subnets (only 11 usable IPs) unless you have a very specific use case like a NAT gateway subnet. Running out of IPs in a subnet requires creating new subnets, which means reconfiguring resources.

## Conclusion

Calculating and planning IP addresses in Terraform prevents the painful problem of IP exhaustion. By using Terraform's CIDR functions for automated calculations, monitoring utilization with data sources, and following sizing best practices, you can build VPC architectures that scale without running into address space limitations.

For more VPC planning topics, see our guide on [How to Handle CIDR Block Conflicts in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-cidr-block-conflicts-in-terraform/view).
