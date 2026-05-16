# Validation Summary: How to Install Talos Linux on AWS EC2

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Talos Linux (v1.7.x AMI series)
- AWS EC2 (instances, VPC, subnets, internet gateway, route tables)
- AWS Security Groups
- AWS Elastic Load Balancing v2 (Network Load Balancer + target group + listener)
- AWS CLI (aws ec2, aws elbv2)
- talosctl (gen config, config merge/endpoint/node, bootstrap, health, kubeconfig, etcd status)
- kubectl
- Kubernetes (control plane on port 6443, kubelet on 10250, etcd peer ports 2379-2380)

## Sources Consulted
- Talos AWS install guide (v1.7): https://www.talos.dev/v1.7/talos-guides/install/cloud-platforms/aws/ (redirects to docs.siderolabs.com)
- Talos talosctl installer script: https://talos.dev/install (verified — returns a valid shell installer)
- Talos releases (cloud-images.json schema): https://github.com/siderolabs/talos/releases
- AWS CLI reference for `ec2 run-instances`, `ec2 create-vpc`, `ec2 authorize-security-group-ingress`, `elbv2 create-load-balancer`, `elbv2 create-target-group`, `elbv2 create-listener`, `elbv2 register-targets`
- Talos `talosctl` subcommand reference (bootstrap, health, kubeconfig, etcd status, gen config)
- Sister posts already validated in this series (GCP, Hetzner Cloud) for stylistic and command-pattern consistency

## Issues Found
No technical issues found.

## Review Notes
- The talosctl install one-liner (`curl -sL https://talos.dev/install | sh`) is consistent across the entire Talos blog series and the script URL was verified to return a valid installer. The official Talos docs additionally document `brew install siderolabs/tap/talosctl` and direct GitHub release downloads; the one-liner is a convenience equivalent.
- The Sidero Labs AWS account ID `540036508848` used in `aws ec2 describe-images --owners` is the well-known publisher account for official Talos AMIs. The Talos docs themselves recommend using the `cloud-images.json` asset attached to each GitHub release for region-specific AMI IDs, but the `describe-images` lookup with a wildcard name filter is a valid and widely used alternative. The wildcard pattern `talos-v1.7.*-amd64` correctly matches names like `talos-v1.7.x-<region>-amd64` because the `*` glob spans hyphens in EC2 image-name filters.
- The post bootstraps using the control plane's public IP. Talos's AWS platform integration reads the instance's public IP from the EC2 metadata service and includes it in the machine API certificate SANs, so `talosctl bootstrap --nodes <PUBLIC_IP>` works without `--additional-sans`. This matches the pattern used in the already-validated GCP post.
- The worker security group has two overlapping rules from `${CP_SG}` (port 10250 specifically, then `--protocol -1`). The second supersedes the first; this is redundant but harmless and arguably aids reader comprehension by spelling out the kubelet port intent.
- The control plane security group opens `6443` from `0.0.0.0/0`. This is intentional because the Network Load Balancer preserves the client source IP for instance targets, so the SG must allow the actual client CIDR rather than the NLB. Acceptable for a tutorial; production users should narrow this to known client CIDRs.
- Talos v1.7.x was released in 2024; newer minor releases (v1.8+, v1.9+) exist. The AMI-lookup wildcard, install steps, and `talosctl` subcommand surface remain compatible. Readers may want to pin to a later version, but the post is not technically incorrect.
- `talosctl etcd status` and `talosctl health --wait-timeout` are valid current subcommands/flags.
- `--user-data file://_out/controlplane.yaml` correctly relies on the AWS CLI to base64-encode the file contents for the EC2 user-data field.
- Worker nodes are launched before the cluster is bootstrapped; Talos workers will retry joining until the control plane is up, so the ordering is fine.
