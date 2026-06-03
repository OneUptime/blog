# Validation Summary: How to Enable ENA (Elastic Network Adapter) on EC2 Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2
- Elastic Network Adapter (ENA)
- AWS CLI
- Linux kernel modules
- EC2 enhanced networking
- EC2 jumbo frames and MTU

## Sources Consulted
- AWS EC2 User Guide: Enhanced networking on Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enhanced-networking.html
- AWS EC2 User Guide: Enable enhanced networking with ENA on your EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enhanced-networking-ena.html
- AWS EC2 User Guide: Enable enhanced networking on your instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enabling_enhanced_networking.html
- AWS EC2 User Guide: Network maximum transmission unit (MTU) for your EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html
- AWS EC2 User Guide: Set the MTU for your Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-mtu.html
- AWS EC2 User Guide: Amazon EC2 instance network bandwidth - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html
- AWS EC2 User Guide: Nitro system considerations for performance tuning - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ena-nitro-perf.html
- AWS EC2 User Guide: Improve network performance between EC2 instances with ENA Express - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ena-express.html
- AWS CLI Command Reference: describe-instance-types - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-types.html
- AWS CLI Command Reference: modify-instance-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- Amazon ENA Linux driver README - https://github.com/amzn/amzn-drivers/blob/master/kernel/linux/ena/README.rst

## Issues Found
- The `modinfo ena` comment said it checked whether the module was loaded. `modinfo` checks whether module metadata is available for the running kernel, so the comment was corrected.
- The prerequisites said every instance must be stopped before enabling ENA. AWS documents this stop requirement for EBS-backed instances; instance store-backed instances need an AMI registration flow instead. The wording was scoped accordingly.
- The `describe-instance-types` example did not explain that `NetworkInfo.EnaSupport` returns `required`, `supported`, or `unsupported`, not a boolean. A clarifying sentence was added.
- The driver build block used `sudo make install`, but the upstream ENA Makefile does not provide an install target. The commands were corrected to build `ena.ko`, copy it into the kernel module tree, run `depmod`, rebuild initramfs, and load it with `modprobe`.
- The MTU verification text described `ip link show eth0` as checking the maximum possible MTU. That command shows the current MTU, so the wording was corrected.
- The jumbo frame caveat incorrectly grouped all VPC peering traffic with internet-bound 1500 MTU traffic. AWS documents 1500 MTU for internet gateway and VPN traffic, and 8500 MTU for inter-Region VPC peering. The caveat was corrected.
- The wrap-up oversimplified the driver step as always installing the driver. It now says to make sure the driver is installed or available, which matches current AMIs where ENA is already present.

## Review Notes
The post is technically relevant and valid after correction. Future improvements could mention AWS's recommendation to back up important data before changing ENA support, and could expand the driver installation section with a DKMS-based path for distributions where kernel updates need automatic ENA module rebuilds.
