# Validation Summary: How to Deploy Ceph with Terraform on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform (HCL configuration)
- AWS EKS (Elastic Kubernetes Service)
- AWS VPC and EBS
- Rook-Ceph (Helm-based deployment)
- Kubernetes
- Helm

## Sources Consulted
- terraform-aws-modules/eks/aws v20.x module documentation and source code (https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest)
- terraform-aws-modules/vpc/aws module documentation (https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest)
- Rook Helm chart repository index (https://charts.rook.io/release)
- Rook-Ceph operator Helm chart documentation (https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/)
- Ceph network configuration reference (https://docs.ceph.com/en/reef/rados/configuration/network-config-ref/)
- Rook GitHub releases (https://github.com/rook/rook/releases)
- Terraform Helm provider documentation (https://registry.terraform.io/providers/hashicorp/helm/latest/docs)
- Terraform Kubernetes provider documentation (https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs)

## Issues Found

### 1. Missing VPC module definition (Critical)
**What was wrong:** The code referenced `module.vpc.vpc_id` and `module.vpc.private_subnets` in the EKS module, but no VPC module was defined anywhere in the post. This would cause a Terraform error on `terraform plan`.
**What was changed:** Added a complete `module "vpc"` block using `terraform-aws-modules/vpc/aws` ~> 5.0 with 3 AZs, private/public subnets, NAT gateway, and proper Kubernetes subnet tags.
**Why:** The EKS module requires an existing VPC and subnets. Without defining the VPC module, the Terraform configuration is incomplete and non-functional.

### 2. Missing Kubernetes and Helm provider configuration (Critical)
**What was wrong:** The `kubernetes` and `helm` providers were declared in `required_providers` but never configured with the EKS cluster connection details (endpoint, CA certificate, authentication). The `helm_release` resources would fail because Terraform wouldn't know how to connect to the Kubernetes cluster.
**What was changed:** Added `provider "kubernetes"` and `provider "helm"` blocks configured with `module.eks.cluster_endpoint`, `module.eks.cluster_certificate_authority_data`, and exec-based authentication using `aws eks get-token`.
**Why:** Helm and Kubernetes providers must be explicitly configured to communicate with the EKS cluster. Without this, Terraform cannot deploy any Kubernetes or Helm resources.

### 3. Missing Ceph monitor v2 (msgr2) port 3300 (Moderate)
**What was wrong:** The security group rules included port 6789 (Ceph monitor v1) and 6800-7300 (OSD range) but omitted port 3300, which is used by the Ceph monitor v2 protocol (msgr2). Since Ceph Nautilus+, monitors use both ports, and Rook v1.13 configures both by default.
**What was changed:** Added an `ingress_ceph_mon_v2` security group rule for TCP port 3300 with `self = true`.
**Why:** Modern Ceph deployments (including those managed by Rook v1.13) use the msgr2 protocol on port 3300 for monitor communication. Without this rule, monitor v2 traffic between nodes would be blocked.

### 4. Incorrect project structure (Minor)
**What was wrong:** The project structure showed `modules/eks/` and `modules/rook-ceph/` subdirectories, but the actual code uses community registry modules (`terraform-aws-modules/eks/aws`) and Helm releases directly -- no local modules are used.
**What was changed:** Updated the project structure to remove the misleading `modules/` directory and added `ceph-cluster-values.yaml` (which is referenced by the `templatefile()` call).
**Why:** The project structure should accurately reflect the files used in the tutorial to avoid confusing readers.

## Review Notes
- Rook v1.13.0 is end-of-life. The latest stable version is v1.19.3 (as of March 2026). The post is technically correct for v1.13.0 but readers should be aware they should use a current version for production deployments.
- The `ceph-cluster-values.yaml` template file is referenced in the `templatefile()` call but its contents are not provided in the post. Readers will need to create this file themselves based on Rook documentation.
- Kubernetes 1.28 is used for `cluster_version`. This version's standard EKS support ended around November 2024, though extended support may still be available. Consider updating to a more current version (e.g., 1.29 or 1.30).
- The `csi.enableRbdDriver` and `csi.enableCephfsDriver` Helm values are set to `true`, which is their default. These set blocks are redundant but harmless and serve as documentation.
- The i3.2xlarge instances include NVMe instance storage (1.9TB SSD), but the post only configures EBS volumes. The summary mentions "instance store or dedicated EBS volumes" but the code only provisions EBS. Readers using i3 instances for their NVMe storage would need additional Ceph/Rook configuration to use the instance store devices.
