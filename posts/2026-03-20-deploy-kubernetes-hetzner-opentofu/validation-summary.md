# Validation Summary: How to Deploy Kubernetes on Hetzner Cloud with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Hetzner Cloud (`hetznercloud/hcloud` provider)
- Kubernetes (k3s lightweight distribution)
- Hetzner Cloud Controller Manager (CCM) and CSI driver
- Hetzner Load Balancer, private networks, placement groups

## Sources Consulted
- Hetzner Cloud Terraform provider docs: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs
- `hcloud_server` resource: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/server.md
- `hcloud_load_balancer_target` resource: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/load_balancer_target.md
- `hcloud_load_balancer_service` resource: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/load_balancer_service.md
- Hetzner Cloud locations: https://docs.hetzner.com/cloud/general/locations/
- Hetzner Cloud Load Balancer types: https://www.hetzner.com/cloud/load-balancer/
- Hetzner new CX (Intel) plans: https://www.hetzner.com/news/new-cx-plans/
- terraform-provider-hcloud releases: https://github.com/hetznercloud/terraform-provider-hcloud/releases
- HCL native syntax spec: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- k3s server CLI docs: https://docs.k3s.io/cli/server

## Issues Found
- **Invalid HCL syntax in provider block.** The original `required_providers` snippet used semicolons to separate attributes within a single-line block:
  ```hcl
  hcloud = { source = "hetznercloud/hcloud"; version = "~> 1.49" }
  ```
  HCL2 native syntax does not accept semicolons as attribute separators; this would fail to parse with a "Missing attribute separator" error. Fixed by expanding to multi-line form, which is the conventional and unambiguously valid style.

## Review Notes
- Resource arguments verified as accurate against the official `hetznercloud/hcloud` provider documentation: `hcloud_server` (image, server_type, location, ssh_keys, placement_group_id, network block), `hcloud_load_balancer`, `hcloud_load_balancer_service`, `hcloud_load_balancer_target` (including `use_private_ip`), `hcloud_placement_group` (`spread` is the only currently supported type), `hcloud_network_subnet` (`cloud` is a valid type).
- `cx32` (Intel shared vCPU, 4 vCPU / 8 GB) and `nbg1` (Nuremberg) are current valid identifiers; `eu-central` is a valid network zone; `lb11` is a valid load balancer type.
- k3s API port 6443 is correct (k3s `--https-listen-port` default).
- Provider version pin `~> 1.49` is reasonable; latest at review time is v1.62.x and the constraint resolves up to <2.0.
- The post correctly notes that the Hetzner CCM and CSI drivers must be installed post-provisioning — these are not managed by the `hcloud` Terraform provider and require separate Helm/manifest installation. This is an accurate caveat.
- The tutorial omits the actual `k3s-init.yaml`, `k3s-join.yaml`, and `k3s-agent.yaml` cloud-init templates referenced in `templatefile(...)` calls. This is a content gap rather than a technical error and would need to be supplied by the reader, but is worth noting for future revisions.
