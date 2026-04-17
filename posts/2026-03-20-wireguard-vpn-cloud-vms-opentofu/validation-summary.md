# Validation Summary: How to Set Up WireGuard VPN on Cloud VMs with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- HCL (HashiCorp Configuration Language)
- WireGuard VPN
- AWS EC2
- AWS Security Groups
- AWS Elastic IP
- Ubuntu 22.04 (Jammy Jellyfish)
- systemd / wg-quick
- Bash / cloud-init user data

## Sources Consulted
- Canonical Ubuntu AWS image documentation: https://documentation.ubuntu.com/aws/aws-how-to/instances/find-ubuntu-images/
- Terraform variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- HCL language specification (block/attribute grammar)
- WireGuard official documentation (wg-quick, wg(8), wg.conf format): https://www.wireguard.com/quickstart/
- AWS provider `aws_eip` documentation (`domain = "vpc"` replacing deprecated `vpc = true`)
- Canonical AWS account ID `099720109477` (verified against Ubuntu cloud images registry)

## Issues Found
1. **Incorrect Ubuntu AMI name filter.** The filter `ubuntu/images/hvm-ssd/ubuntu-22.04-amd64-server-*` would not match any Canonical AMI. Canonical's official AMI naming pattern includes the release codename: `ubuntu/images/$VIRT-$VOL/ubuntu-$CODENAME-$VERSION-$ARCH-$PRODUCT`. Updated the filter to `ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*` so the data source resolves an AMI.

2. **Invalid HCL variable block syntax.** The original combined two attributes on a single line: `variable "wg_server_private_key" { type = string  sensitive = true }`. HCL2's grammar requires attributes to be terminated by a newline (the one-line block form permits at most a single attribute). Reformatted both `variable` blocks to place each attribute on its own line.

## Review Notes
- The security group only opens UDP 51820. SSH (22/TCP) is intentionally not exposed; managing the host requires SSM, a bastion, or temporarily widening the SG. Worth flagging to readers but not technically incorrect.
- The example WireGuard config does not include `PostUp`/`PostDown` iptables MASQUERADE rules. With `net.ipv4.ip_forward=1` enabled but no NAT, peers can reach the server's `10.99.0.0/24` subnet but cannot route out to the internet via the EC2 instance. This is fine for a private/site-to-site style tunnel; if the intent is full-tunnel internet egress, a `PostUp = iptables -t nat -A POSTROUTING -o ens5 -j MASQUERADE` (and matching `PostDown`) would be needed. Not modified since the post does not explicitly claim full-tunnel behavior.
- `aws_instance` does not set `user_data_replace_on_change = true`; modifying `user_data` later will not re-provision the instance. Acceptable for an initial tutorial.
- Canonical owner ID `099720109477` is correct.
- `wg-quick@wg0` systemd unit, port 51820/UDP, and the `wg.conf` field names (`Address`, `ListenPort`, `PrivateKey`, `PublicKey`, `AllowedIPs`) all match WireGuard's official documentation.
- `aws_eip`'s `domain = "vpc"` argument is the current, non-deprecated form (replaces the legacy `vpc = true`).
