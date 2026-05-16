# Validation Summary: How to Provision Talos Linux on AWS with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7.0)
- AWS (EC2, VPC, subnets, internet gateway, security groups, Network Load Balancer, AMIs)
- Terraform (HCL, AWS provider, `aws_ami` / `aws_availability_zones` data sources)
- `talosctl` CLI (gen secrets, gen config, apply-config, bootstrap, kubeconfig)
- Kubernetes (control plane / worker topology, API on port 6443)

## Sources Consulted
- Talos AWS platform install docs (v1.7): https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/cloud-platforms/aws/
- Talos network connectivity reference (v1.7): https://docs.siderolabs.com/talos/v1.7/learn-more/talos-network-connectivity/
- talosctl CLI reference (v1.7.0): https://github.com/siderolabs/talos/blob/v1.7.0/website/content/v1.7/reference/cli.md
- Sidero Labs official Terraform AWS example: https://github.com/siderolabs/contrib/blob/main/examples/terraform/aws/main.tf
- Talos v1.7.0 release notes: https://github.com/siderolabs/talos/releases/tag/v1.7.0
- Terraform AWS provider docs for `aws_lb`, `aws_lb_listener`, `aws_lb_target_group`, `aws_route_table`, `aws_route_table_association`, `aws_ami`

## Issues Found
1. **Missing route table and route table association for public subnets.** The original Terraform created a VPC, public subnets, and an internet gateway, but never associated the subnets with a route table containing a `0.0.0.0/0` route to the IGW. Without that, the subnets are not actually reachable from the internet and instances cannot reach outbound services — so the cluster would never bootstrap. Added an `aws_route_table` with a default route to the IGW and an `aws_route_table_association` (count = 3) in the networking section.
2. **Missing NLB listener.** The original code created an `aws_lb` and `aws_lb_target_group` but no `aws_lb_listener`, meaning the NLB would accept no traffic on port 6443 and `talosctl`/kubectl could not reach the Kubernetes API through it. Added an `aws_lb_listener` for TCP/6443 that forwards to the target group.
3. **`talosctl kubeconfig` was missing `--talosconfig talosconfig`.** The bootstrap command above it correctly passes `--talosconfig talosconfig`, but the kubeconfig command did not — and since the local talosconfig was written to the current directory (not the default `~/.talos/config` path), the command would fail to authenticate. Added the `--talosconfig talosconfig` flag for consistency with the bootstrap step.

## Review Notes
- Sidero Labs AMI owner account `540036508848` is correct and matches the official `siderolabs/contrib` Terraform example.
- The AMI name filter `talos-${var.talos_version}-*` is loose but functional. Official Talos AMI names follow `talos-vX.Y.Z-<az-id>-amd64` (e.g. `talos-v1.7.0-use1-az1-amd64`); the architecture filter on the `aws_ami` data source narrows results to amd64, so this works. A tighter pattern like `talos-${var.talos_version}-*-amd64` would be more explicit, but the current filter is not incorrect.
- Port assignments (50000 apid, 50001 trustd intra-cluster, 6443 Kubernetes API) are accurate per the Talos network connectivity reference.
- Talos v1.7.0 is a real release (April 19, 2024). As of mid-2026 this is several minors behind the current Talos release line; the post does not claim to use the newest version, so this is fine, but readers may want to bump `talos_version` to a more current release.
- The post does not configure `user_data` on the EC2 instances. This is intentional and consistent with the workflow described — Talos boots into maintenance mode and the machine config is delivered later via `talosctl apply-config --insecure`. An alternative pattern is to render the machine config and pass it via `user_data` at boot, but both approaches are valid.
- The production-considerations callouts (private subnets + NAT, IAM instance roles, EBS encryption, S3 + DynamoDB state backend) are accurate and appropriate for a production hardening checklist.
