# Validation Summary: How to Deploy Ceph with Terraform on OpenStack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform (Infrastructure as Code)
- OpenStack (private cloud platform)
- OpenStack Terraform provider (`terraform-provider-openstack/openstack` ~> 1.54)
- HashiCorp Helm provider (~> 2.12)
- OpenStack Neutron networking (networks, subnets, routers, security groups)
- OpenStack Nova compute instances
- OpenStack Cinder block storage volumes
- Rook-Ceph (Kubernetes storage orchestrator)
- Helm

## Sources Consulted
- Terraform OpenStack Provider documentation (https://registry.terraform.io/providers/terraform-provider-openstack/openstack/latest/docs)
- Terraform OpenStack Provider resource references: `openstack_networking_network_v2`, `openstack_networking_subnet_v2`, `openstack_networking_router_v2`, `openstack_networking_router_interface_v2`, `openstack_compute_instance_v2`, `openstack_networking_secgroup_v2`, `openstack_networking_secgroup_rule_v2`, `openstack_blockstorage_volume_v3`, `openstack_compute_volume_attach_v2`
- Terraform variable block syntax and `sensitive` argument (https://developer.hashicorp.com/terraform/language/values/variables)
- Terraform environment variable convention for `TF_VAR_` prefix (https://developer.hashicorp.com/terraform/cli/config/environment-variables)
- Ceph documentation for monitor port 6789 and OSD port range 6800-7300 (https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/)
- Rook Helm chart documentation (https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/)

## Issues Found
1. **Incorrect environment variable in deploy section**: The deploy instructions used `export OS_AUTH_URL=...` which is a standard OpenStack environment variable, but the Terraform provider block is configured to read `var.os_auth_url` (a Terraform input variable). Setting `OS_AUTH_URL` would not feed into the provider as configured. Changed to `export TF_VAR_os_auth_url=...` to correctly pass the value through Terraform's `TF_VAR_` environment variable convention, consistent with how `TF_VAR_os_password` was already correctly used on the next line.

## Review Notes
- The security group rules correctly open Ceph monitor port 6789 and OSD port range 6800-7300. Modern Ceph versions (Nautilus+) also use port 3300 for the msgr2 protocol, which is not included. This is acceptable since Rook-Ceph within Kubernetes typically handles this through the pod network, but users running host networking may want to add a rule for port 3300.
- The project structure lists `rook.tf` but no code is shown for it. The post instead deploys Rook via Helm commands in the deploy section, which is a valid approach.
- The HCL uses semicolons to separate arguments in single-line variable blocks (e.g., `{ type = string; sensitive = true }`). This is valid HCL2 syntax.
- All OpenStack Terraform resource types and their arguments are correct and current for provider version ~> 1.54.
- The volume-to-node distribution logic using `floor(count.index / var.osds_per_node)` correctly assigns the right number of volumes per node.
