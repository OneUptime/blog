# Validation Summary: How to Create DigitalOcean Kubernetes Clusters with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- DigitalOcean Terraform provider (`digitalocean/digitalocean` ~> 2.0)
- DigitalOcean Kubernetes Service (DOKS)
- DigitalOcean VPC
- HashiCorp `local_file` resource
- kubectl

## Sources Consulted
- DigitalOcean Terraform provider docs — `digitalocean_kubernetes_cluster`: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/kubernetes_cluster.md
- DigitalOcean Terraform provider docs — `digitalocean_kubernetes_node_pool`: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/kubernetes_node_pool.md
- DigitalOcean Terraform provider docs — `digitalocean_vpc`: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/vpc.md
- DigitalOcean Droplet size slug reference (basic `s-` and memory-optimized `m-` prefixes)

## Issues Found
No technical issues found.

Verified items:
- Provider source `digitalocean/digitalocean` and `~> 2.0` constraint are correct.
- `digitalocean_kubernetes_cluster` required arguments (`name`, `region`, `version`, `node_pool`) and optional `vpc_uuid`, `tags`, and `timeouts` block are all valid.
- `node_pool` block fields (`name`, `size`, `node_count`, `labels`, `tags`) are correct.
- `digitalocean_kubernetes_node_pool` arguments (`cluster_id`, `name`, `size`, `node_count`, `auto_scale`, `min_nodes`, `max_nodes`, `labels`, `taint`) are correct.
- `taint` block fields (`key`, `value`, `effect` with `NoSchedule`) are correct.
- `kube_config[0].raw_config` attribute access pattern is correct.
- `digitalocean_vpc` arguments (`name`, `region`, `ip_range`) are correct.
- Droplet size slugs `s-2vcpu-4gb` (Basic shared) and `m-4vcpu-32gb` (Memory-Optimized) are valid.
- Region slug `nyc3` is valid.
- DOKS version format `1.32.2-do.0` matches the format returned by `doctl kubernetes options versions`.
- `timeouts { create = "30m" }` is supported (default create timeout is 30 minutes).

## Review Notes
- The post relies on the `hashicorp/local` provider for the `local_file` resource but does not declare it in `required_providers`. Terraform/OpenTofu will auto-install it from the registry, so the example still works, but explicitly declaring it would be more robust. Not a correctness issue.
- DOKS Kubernetes versions are released and deprecated regularly. The exact version slug `1.32.2-do.0` will eventually be unavailable; readers should run `doctl kubernetes options versions` (already noted in the comment) to pick a current version.
- The cluster autoscaling example only enables autoscaling on a separate node pool, not the default one inside the cluster resource. The default node pool also supports `auto_scale`/`min_nodes`/`max_nodes`; this is a stylistic choice rather than an error.
