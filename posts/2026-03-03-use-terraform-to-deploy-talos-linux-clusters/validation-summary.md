# Validation Summary: How to Use Terraform to Deploy Talos Linux Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- Terraform
- Terraform AWS provider
- Terraform HTTP provider
- Terraform Talos provider
- AWS EC2, VPC, security groups, and Network Load Balancer
- Kubernetes

## Sources Consulted
- Sidero Labs Talos v1.13 support matrix: https://docs.siderolabs.com/talos/v1.13/getting-started/support-matrix
- Sidero Labs Talos production cluster guidance: https://docs.siderolabs.com/talos/v1.13/getting-started/prodnotes
- Sidero Labs Talos AWS installation guidance: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/cloud-platforms/aws
- Sidero Labs Talos machine configuration reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Sidero Labs Talos v1.13.2 GitHub release and cloud-images.json asset: https://github.com/siderolabs/talos/releases/tag/v1.13.2
- Terraform Registry, siderolabs/talos provider documentation: https://registry.terraform.io/providers/siderolabs/talos/latest/docs
- Terraform Registry, talos_machine_configuration data source: https://registry.terraform.io/providers/siderolabs/talos/latest/docs/data-sources/machine_configuration
- Terraform Registry, talos_machine_configuration_apply resource: https://registry.terraform.io/providers/siderolabs/talos/latest/docs/resources/machine_configuration_apply
- Terraform Registry, talos_cluster_kubeconfig resource: https://registry.terraform.io/providers/siderolabs/talos/latest/docs/resources/cluster_kubeconfig
- Terraform Registry, hashicorp/aws provider aws_lb_target_group_attachment resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group_attachment
- Kubernetes release information: https://kubernetes.io/releases

## Issues Found
- The provider versions were outdated. Updated the AWS provider constraint to `~> 6.0`, added the HTTP provider required by the corrected AMI lookup, and updated the Talos provider constraint to `~> 0.11`.
- The default Talos and Kubernetes versions were outdated. Updated the defaults to Talos `v1.13.2` and Kubernetes `v1.36.0`, which match the current Talos release images and supported Kubernetes minor version.
- The `kubernetes_version` variable was defined but not used. Added `kubernetes_version = var.kubernetes_version` to both Talos machine configuration data sources.
- The Talos provider documentation recommends setting `talos_version` explicitly when generating machine configuration. Added `talos_version = var.talos_version` to both Talos machine configuration data sources.
- The Kubernetes API load balancer DNS name was added under `machine.certSANs`, which is for Talos machine certificate SANs, not Kubernetes API server certificate SANs. Moved the load balancer DNS name to `cluster.apiServer.certSANs`.
- The example disabled kube-proxy for Cilium replacement but did not install Cilium. Removed that patch so the default generated Talos networking remains internally consistent.
- The example looked up Talos AMIs by a guessed AWS owner and AMI name pattern. Official Talos AWS guidance points readers to the release `cloud-images.json` asset for official AMI IDs, so the snippet now reads that file with the Terraform HTTP provider and selects the matching AWS region and `amd64` AMI.
- The post used the deprecated `talos_cluster_kubeconfig` data source pattern. Updated the example to use the `talos_cluster_kubeconfig` resource and fixed the output reference.

## Review Notes
The post is a tutorial and contains substantial Terraform and Talos configuration. The corrected example is still intentionally simple and publicly exposes the Kubernetes and Talos APIs for demonstration purposes; production deployments should restrict ingress and account for organization-specific networking, IAM, observability, and cloud controller requirements.
