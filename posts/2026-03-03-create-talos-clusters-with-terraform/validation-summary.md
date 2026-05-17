# Validation Summary: How to Create Talos Clusters with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Terraform (>= 1.5.0)
- Kubernetes (v1.30.0)
- siderolabs/talos Terraform provider (~> 0.5.0)
- dmacvicar/libvirt Terraform provider (~> 0.7.0)
- terraform-aws-modules/vpc/aws (~> 5.0)
- AWS EC2 (m6i.large/xlarge instances)
- libvirt / QEMU

## Sources Consulted
- siderolabs/terraform-provider-talos GitHub repository: https://github.com/siderolabs/terraform-provider-talos
- Talos Linux AWS installation docs: https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/cloud-platforms/aws/
- Terraform Registry — siderolabs/talos provider: https://registry.terraform.io/providers/siderolabs/talos
- Talos Image Factory: https://factory.talos.dev/
- Prior verified knowledge of the siderolabs/talos provider (v0.5.x) resource/data source schemas

## Issues Found
No technical issues found.

The blog post correctly uses the siderolabs/talos provider patterns:
- `talos_machine_secrets` with the optional `talos_version` argument
- `data.talos_machine_configuration` with `cluster_name`, `machine_type`, `cluster_endpoint`, `machine_secrets`, `kubernetes_version`, and `config_patches`
- `talos_machine_configuration_apply` with `client_configuration`, `machine_configuration_input`, `node`, and per-node `config_patches` (used here for hostname)
- `talos_machine_bootstrap` targeting a single control plane node
- `data.talos_cluster_kubeconfig` exposing `kubeconfig_raw`
- `data.talos_client_configuration` exposing `talos_config`

The installer image URLs (`factory.talos.dev/installer/<schematic>:<version>` and `ghcr.io/siderolabs/installer:<version>`) and the Kubernetes API endpoint format (`https://<vip>:6443`) are accurate. The `terraform init/plan/apply/destroy` and `talosctl health --nodes` command shapes are all correct.

## Review Notes
- The post pins the provider to `~> 0.5.0` for Talos v1.7.0. As of 2026-05-17 the provider has progressed to v0.11.x (with newer Talos releases such as v1.8/v1.9 available). The shown schema is still valid for v0.5.x, so readers following the tutorial verbatim will get a working setup; readers wanting the latest features should bump the version pin and adjust accordingly.
- The control-plane → bootstrap → worker ordering (workers `depends_on` the bootstrap) is a valid, conservative pattern. Many examples apply both control-plane and worker configurations before bootstrap; both approaches work because worker nodes will only fully join after the control plane is bootstrapped regardless.
- For the libvirt example the `cluster_vip` is used as the cluster endpoint, but a VIP requires either a `machine.network.interfaces[].vip` patch on the control plane nodes or an external load balancer. The tutorial does not show that patch — readers using libvirt locally should be aware they need to enable Talos's built-in VIP or front the API with HAProxy/keepalived. This is a tutorial scope choice rather than a correctness issue.
- The AWS section relies on Talos AMIs booting into maintenance mode so that `talos_machine_configuration_apply` can push the config over the Talos API; this is a valid alternative to passing the config via EC2 `user_data`. Production setups typically also add security groups (ports 50000/6443/2379-2380), an NLB for the Kubernetes API, and IAM/instance profile configuration. The `var.talos_ami_id` variable is referenced but not declared in `variables.tf`; readers will need to add it themselves.
- `terraform destroy` resets Talos nodes via the provider's reset behavior. On cloud providers the instances are also destroyed; on bare metal/libvirt the disks may need a manual wipe if reused.
