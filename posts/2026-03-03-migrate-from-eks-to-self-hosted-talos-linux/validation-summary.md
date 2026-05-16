# Validation Summary: How to Migrate from EKS to Self-Hosted Talos Linux

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Amazon EKS (Elastic Kubernetes Service)
- Talos Linux (v1.9.0)
- Kubernetes
- talosctl CLI
- kubectl
- Velero (backup tool with AWS plugin)
- Longhorn (storage)
- MetalLB (load balancing — IPAddressPool, L2Advertisement)
- ingress-nginx (ingress controller)
- HashiCorp Vault (secrets management)
- AWS EBS CSI driver, AWS EFS CSI driver
- IRSA (IAM Roles for Service Accounts)
- ExternalDNS
- Helm

## Sources Consulted
- Amazon EKS Pricing: https://aws.amazon.com/eks/pricing/
- Talos v1.9 CLI Reference: https://www.talos.dev/v1.9/reference/cli/
- Talos v1.9 Configuration Reference: https://www.talos.dev/v1.9/reference/configuration/v1alpha1/config/
- Talos v1.9.0 Release: https://github.com/siderolabs/talos/releases/tag/v1.9.0
- Velero Plugin for AWS: https://github.com/vmware-tanzu/velero-plugin-for-aws
- Velero File System Backup docs: https://velero.io/docs/main/file-system-backup/
- MetalLB Installation & Configuration: https://metallb.universe.tf/installation/, https://metallb.universe.tf/configuration/
- AWS EKS IRSA: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- AWS EBS CSI Driver: https://github.com/kubernetes-sigs/aws-ebs-csi-driver
- AWS EFS CSI Driver: https://github.com/kubernetes-sigs/aws-efs-csi-driver
- Longhorn Helm Chart: https://charts.longhorn.io
- ingress-nginx Helm Chart: https://kubernetes.github.io/ingress-nginx
- HashiCorp Vault Helm Chart: https://helm.releases.hashicorp.com

## Issues Found
1. **`talosctl gen config` flag `--output-dir` is deprecated in Talos 1.9** — replaced with `--output` (or `-o`). The deprecated flag still works but using it in a current tutorial is suboptimal. Changed `--output-dir _out` to `--output _out` in the Step 3 code block.

## Review Notes
- EKS pricing claim ($0.10/hr per cluster, ≈$73/month) is accurate for standard support. Note: extended support tier (introduced 2024) is $0.60/hr per cluster, but the post is referring to standard support which remains $0.10/hr.
- All Velero, MetalLB, Helm chart, CSI driver, IRSA annotation, and kubectl commands verified as correct.
- `--default-volumes-to-fs-backup` is the correct flag (replaces the older `--default-volumes-to-restic`).
- The MetalLB `L2Advertisement` resource without an explicit `ipAddressPools` selector advertises all pools — fine for the example, but readers running multi-pool setups will need to add the selector.
- The Vault Helm install shown is the bare default install; in production, readers will need to initialize and unseal Vault, configure storage backend, and set up auto-unseal. The post does not claim to be a complete Vault setup guide.
- Talos installer image `ghcr.io/siderolabs/installer:v1.9.0` is valid; readers may want to track newer patch releases as they become available.
