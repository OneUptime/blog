# How to Configure Traffic Mirroring with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Traffic Mirroring, AWS, VPC, Networking, Security, Monitoring

Description: Learn how to configure AWS VPC Traffic Mirroring with Terraform to capture and inspect network traffic for security analysis and troubleshooting.

---

VPC Traffic Mirroring is an AWS feature that lets you copy network traffic from elastic network interfaces (ENIs) and send it to a target for analysis. This is invaluable for intrusion detection, network forensics, content inspection, and debugging production network issues. Instead of deploying agents on every instance, Traffic Mirroring operates at the network level, capturing packets transparently. Terraform provides a clean way to configure all the components: mirror sources, targets, filters, and sessions.

## How Traffic Mirroring Works

Traffic Mirroring has three main components. The mirror source is the ENI whose traffic you want to capture. The mirror target is where the mirrored traffic is sent, which can be an ENI or a Network Load Balancer. The mirror filter defines which traffic to capture based on protocol, port, and direction rules. A mirror session ties these together, linking a source to a target through a filter.

Mirrored traffic is encapsulated in VXLAN format and sent to the target. The target must be able to receive and process VXLAN-encapsulated packets.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, a VPC with instances whose traffic you want to mirror, and a target instance or NLB to receive mirrored traffic. Note that Traffic Mirroring is supported on Nitro-based instances.

## Setting Up the Infrastructure

Start with the VPC and subnet configuration:

```hcl
# Configure the AWS provider
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

# VPC for traffic mirroring
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "mirror-vpc" }
}

# Subnet for source and target instances
resource "aws_subnet" "main" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "mirror-subnet" }
}
```

## Creating the Source Instance

The source instance is the one whose traffic you want to capture:

```hcl
# Security group for the source instance
resource "aws_security_group" "source" {
  name   = "source-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "source-sg" }
}

# Source instance (must be Nitro-based)
resource "aws_instance" "source" {
  ami           = "ami-0c02fb55956c7d316" # Amazon Linux 2
  instance_type = "t3.micro"              # Nitro-based
  subnet_id     = aws_subnet.main.id

  vpc_security_group_ids = [aws_security_group.source.id]

  tags = { Name = "mirror-source" }
}
```

## Creating the Mirror Target

The mirror target receives the captured traffic. You can use either an ENI or an NLB.

### Option 1: ENI Target

```hcl
# Security group for the target instance
resource "aws_security_group" "target" {
  name   = "target-sg"
  vpc_id = aws_vpc.main.id

  # Allow VXLAN traffic (UDP port 4789) from the source
  ingress {
    from_port   = 4789
    to_port     = 4789
    protocol    = "udp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "Allow VXLAN mirrored traffic"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "target-sg" }
}

# Target instance running packet analysis software
resource "aws_instance" "target" {
  ami           = "ami-0c02fb55956c7d316"
  instance_type = "t3.large"
  subnet_id     = aws_subnet.main.id

  vpc_security_group_ids = [aws_security_group.target.id]

  tags = { Name = "mirror-target" }
}

# Mirror target using the ENI of the target instance
resource "aws_ec2_traffic_mirror_target" "eni_target" {
  description          = "ENI mirror target"
  network_interface_id = aws_instance.target.primary_network_interface_id

  tags = { Name = "eni-mirror-target" }
}
```

### Option 2: NLB Target

```hcl
# Network Load Balancer as mirror target
resource "aws_lb" "mirror" {
  name               = "mirror-nlb"
  internal           = true
  load_balancer_type = "network"

  subnets = [aws_subnet.main.id]

  tags = { Name = "mirror-nlb" }
}

# Mirror target using the NLB
resource "aws_ec2_traffic_mirror_target" "nlb_target" {
  description                       = "NLB mirror target"
  network_load_balancer_arn         = aws_lb.mirror.arn

  tags = { Name = "nlb-mirror-target" }
}
```

## Creating Mirror Filters

Mirror filters control which traffic is captured. You define inbound and outbound rules:

```hcl
# Create a mirror filter
resource "aws_ec2_traffic_mirror_filter" "main" {
  description = "Main traffic mirror filter"

  tags = { Name = "main-mirror-filter" }
}

# Filter rule: capture all inbound HTTP traffic
resource "aws_ec2_traffic_mirror_filter_rule" "inbound_http" {
  traffic_mirror_filter_id = aws_ec2_traffic_mirror_filter.main.id
  description              = "Capture inbound HTTP"

  rule_number  = 100
  rule_action  = "accept"
  direction    = "ingress"
  protocol     = 6 # TCP

  destination_port_range {
    from_port = 80
    to_port   = 80
  }

  source_cidr_block      = "0.0.0.0/0"
  destination_cidr_block = "0.0.0.0/0"
}

# Filter rule: capture all inbound HTTPS traffic
resource "aws_ec2_traffic_mirror_filter_rule" "inbound_https" {
  traffic_mirror_filter_id = aws_ec2_traffic_mirror_filter.main.id
  description              = "Capture inbound HTTPS"

  rule_number  = 200
  rule_action  = "accept"
  direction    = "ingress"
  protocol     = 6 # TCP

  destination_port_range {
    from_port = 443
    to_port   = 443
  }

  source_cidr_block      = "0.0.0.0/0"
  destination_cidr_block = "0.0.0.0/0"
}

# Filter rule: capture all outbound traffic
resource "aws_ec2_traffic_mirror_filter_rule" "outbound_all" {
  traffic_mirror_filter_id = aws_ec2_traffic_mirror_filter.main.id
  description              = "Capture all outbound traffic"

  rule_number  = 100
  rule_action  = "accept"
  direction    = "egress"
  protocol     = 6 # TCP

  source_cidr_block      = "0.0.0.0/0"
  destination_cidr_block = "0.0.0.0/0"
}

# Filter rule: reject DNS traffic (reduce noise)
resource "aws_ec2_traffic_mirror_filter_rule" "reject_dns" {
  traffic_mirror_filter_id = aws_ec2_traffic_mirror_filter.main.id
  description              = "Reject DNS traffic to reduce noise"

  rule_number  = 50
  rule_action  = "reject"
  direction    = "egress"
  protocol     = 17 # UDP

  destination_port_range {
    from_port = 53
    to_port   = 53
  }

  source_cidr_block      = "0.0.0.0/0"
  destination_cidr_block = "0.0.0.0/0"
}
```

## Creating the Mirror Session

The mirror session connects the source, target, and filter:

```hcl
# Create the mirror session
resource "aws_ec2_traffic_mirror_session" "main" {
  description              = "Main mirror session"
  traffic_mirror_filter_id = aws_ec2_traffic_mirror_filter.main.id
  traffic_mirror_target_id = aws_ec2_traffic_mirror_target.eni_target.id
  network_interface_id     = aws_instance.source.primary_network_interface_id

  # Session number determines priority (lower = higher priority)
  session_number = 1

  # Optional: limit the number of bytes captured per packet
  # packet_length = 128

  # Optional: VXLAN network identifier
  virtual_network_id = 12345

  tags = { Name = "main-mirror-session" }
}
```

The `session_number` is important when an ENI has multiple mirror sessions. Lower numbers have higher priority. The `packet_length` parameter can be used to capture only the headers of each packet, reducing the amount of data sent to the target.

## Mirroring Multiple Sources

To mirror traffic from multiple instances, create a session for each source:

```hcl
variable "source_eni_ids" {
  description = "ENI IDs of instances to mirror"
  type        = list(string)
  default     = []
}

# Create mirror sessions for multiple sources
resource "aws_ec2_traffic_mirror_session" "multi" {
  count = length(var.source_eni_ids)

  description              = "Mirror session for ENI ${var.source_eni_ids[count.index]}"
  traffic_mirror_filter_id = aws_ec2_traffic_mirror_filter.main.id
  traffic_mirror_target_id = aws_ec2_traffic_mirror_target.nlb_target.id
  network_interface_id     = var.source_eni_ids[count.index]
  session_number           = 1

  tags = {
    Name = "mirror-session-${count.index}"
  }
}
```

## Outputs

```hcl
output "mirror_session_id" {
  description = "ID of the traffic mirror session"
  value       = aws_ec2_traffic_mirror_session.main.id
}

output "mirror_target_id" {
  description = "ID of the traffic mirror target"
  value       = aws_ec2_traffic_mirror_target.eni_target.id
}

output "mirror_filter_id" {
  description = "ID of the traffic mirror filter"
  value       = aws_ec2_traffic_mirror_filter.main.id
}
```

## Monitoring Mirrored Traffic

Monitoring your traffic mirroring setup helps ensure captured data is complete and actionable. Use [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-traffic-mirroring-with-terraform/view) to monitor the health and performance of your mirror targets and set up alerts when mirrored traffic patterns change unexpectedly.

## Best Practices

Use NLB targets when mirroring from multiple sources for better scalability. Filter out noisy protocols like DNS to reduce data volume. Use `packet_length` to capture only headers when full packet content is not needed. Ensure target instances have sufficient capacity to handle the mirrored traffic volume. Test mirror filters carefully before deploying in production.

## Conclusion

VPC Traffic Mirroring with Terraform provides a powerful, infrastructure-as-code approach to network traffic analysis. By defining mirror sources, targets, filters, and sessions in Terraform, you can consistently deploy and manage traffic mirroring across your infrastructure. This is essential for security monitoring, compliance auditing, and network troubleshooting in production environments.
