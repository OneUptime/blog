# Validation Summary: How to Use EC2 Enhanced Networking for Higher Throughput

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon EC2 enhanced networking
- Elastic Network Adapter (ENA)
- Intel 82599 VF / ixgbevf
- AWS CLI
- Linux networking tools (`ethtool`, `sysctl`, `ip`, `iperf3`)
- CloudWatch EC2 network metrics
- EC2 placement groups
- Jumbo frames / MTU

## Sources Consulted
- AWS EC2 User Guide: Enhanced networking on Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enhanced-networking.html
- AWS EC2 User Guide: Enable enhanced networking with ENA on your EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enhanced-networking-ena.html
- AWS EC2 User Guide: Amazon EC2 instance network bandwidth - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html
- AWS EC2 Instance Types Guide: General purpose instance network specifications - https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html
- AWS EC2 User Guide: Network maximum transmission unit (MTU) for your EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html
- AWS EC2 User Guide: Placement groups for your Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html
- AWS EC2 User Guide: Improve network latency for Linux based EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ena-improve-network-latency-linux.html
- AWS EC2 User Guide: ENA queues - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ena-queues.html
- AWS CLI Command Reference: modify-instance-attribute - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/modify-instance-attribute.html
- AWS CLI Command Reference: get-metric-statistics - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/cloudwatch/get-metric-statistics.html
- AWS official ENA driver repository - https://github.com/amzn/amzn-drivers

## Issues Found
- The post described ENA as required for all current-generation instance types. AWS documents that all Nitro-based instances use ENA for enhanced networking, so the wording was corrected to avoid overgeneralizing.
- The jitter comparison claimed enhanced networking has "near-zero" jitter. AWS documents consistently lower latency, but not zero or near-zero jitter, so the table now says "lower and more consistent."
- The benchmark expectation for `m5.8xlarge` said 25 Gbps aggregate throughput. AWS documents `m5.8xlarge` as a 10 Gbps instance, so the expected aggregate result was corrected to close to 10 Gbps.
- The M5 bandwidth table listed the smaller M5 sizes as having "Up to 10 Gbps" baseline bandwidth. AWS documents baseline values of 0.75, 1.25, 2.5, and 5 Gbps for `m5.large` through `m5.4xlarge`, with burst up to 10 Gbps. The table was updated.
- The placement group section said cluster placement groups put instances on the same physical rack. AWS documents cluster placement groups as packing instances close together inside an Availability Zone, so the rack-specific claim was removed.
- The jumbo frames section said jumbo frames only work within the same VPC or peered VPCs. AWS documents additional limits, including 1500 MTU over internet gateways and VPNs and 8500 MTU over inter-Region VPC peering. The caveat was updated.
- The Amazon Linux 2 update example used `yum update -y ena`, but AWS-provided Linux ENA support is normally delivered through the kernel or the Amazon Drivers GitHub source package, not a standalone `ena` yum package. The command was changed to update the kernel.
- The RSS queue example set the queue count directly to the CPU count, which can fail when the instance exposes fewer maximum combined queues than vCPUs. The example now caps the requested queue count at the interface's reported maximum.

## Review Notes
The AWS CLI examples use current command names and flags. The Linux tuning commands are syntactically valid, but some values are workload- and instance-dependent; the post already notes that ring buffer values depend on instance type. Persistent MTU configuration is distribution-specific and may need a NetworkManager or netplan equivalent on newer distributions.
