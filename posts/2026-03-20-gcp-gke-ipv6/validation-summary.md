# Validation Summary: How to Configure GKE Clusters with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud VPC networking
- IPv6
- Dual-stack Kubernetes networking
- `gcloud` CLI
- Terraform
- Kubernetes Services and Deployments

## Sources Consulted
- GKE: Create a VPC-native cluster / dual-stack networking: https://cloud.google.com/kubernetes-engine/docs/how-to/alias-ips
- GKE: VPC-native clusters / dual-stack requirements and limitations: https://cloud.google.com/kubernetes-engine/docs/concepts/alias-ips
- GKE Terraform quickstart with dual-stack examples: https://cloud.google.com/kubernetes-engine/docs/quickstarts/create-cluster-using-terraform
- Google Cloud VPC subnet documentation for internal IPv6 and ULA requirements: https://cloud.google.com/vpc/docs/subnets
- Google Cloud VPC network creation quickstart (`--enable-ula-internal-ipv6`): https://cloud.google.com/vpc/docs/create-modify-vpc-networks
- Terraform Registry `google_container_cluster`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Registry `google_compute_subnetwork`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Kubernetes IPv4/IPv6 dual-stack Services: https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found
- The introduction was outdated. It said dual-stack required GKE 1.21+ and Standard mode only, but current Google Cloud documentation says dual-stack is available for new Standard clusters in GKE 1.24+ and Autopilot clusters in GKE 1.25+. I corrected the support statement.
- The introduction omitted two current requirements for the Standard example: GKE Dataplane V2 and, for internal IPv6, a custom-mode VPC with ULA internal IPv6 enabled. I added both requirements.
- The `gcloud` workflow created an internal dual-stack subnet on `vpc-main` without first creating a custom-mode VPC with ULA internal IPv6 enabled. That command sequence would fail on a fresh project. I added the VPC creation step.
- The Standard cluster creation command omitted `--enable-dataplane-v2`, which current GKE documentation lists as required for dual-stack Standard clusters. I added the flag.
- The Terraform example referenced `google_compute_network.main` without defining it. I added the missing VPC resource and enabled `enable_ula_internal_ipv6` on it so the internal IPv6 subnetwork is valid.
- The Terraform example did not enable Dataplane V2. I added `datapath_provider = "ADVANCED_DATAPATH"` to match the documented dual-stack requirement.
- The sample workload used `nginx:latest` but exposed port `8080` in both the Service target and container declaration. Stock `nginx` listens on port `80`, so the Service would not route correctly. I changed both ports to `80`.
- The verification section used `ping6` against an undefined `test-pod`, which made the example incomplete and less portable. I changed it to `ping -6` and clarified that the command should be run from a pod that has `ping` installed.
- The conclusion overstated the requirements by implying all GKE dual-stack clusters are configured the same way. I narrowed it to the Standard-cluster flow shown in the post and updated the verification guidance to include `ipAllocationPolicy`.

## Review Notes
- Current GKE documentation says newer clusters can use a GKE-managed IPv4 Service range by default, so the explicit Services secondary range in this post is still valid but no longer the only option.
- Local execution validation was not possible in this environment because `gcloud`, `kubectl`, and `terraform` are not installed. The review was completed against current official documentation instead.
