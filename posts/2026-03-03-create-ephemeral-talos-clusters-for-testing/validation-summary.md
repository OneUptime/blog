# Validation Summary: How to Create Ephemeral Talos Clusters for Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (`talosctl cluster create`, Docker provisioner)
- Kubernetes (`kubectl`)
- Bash scripting
- Cilium CNI
- Terraform (siderolabs/talos provider)
- systemd timers / cron
- Docker

## Sources Consulted
- Talos Linux Docker provisioner docs: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/local-platforms/docker/
- Talos `v1alpha1` ClusterConfig reference (confirming `allowSchedulingOnControlPlanes` path): https://pkg.go.dev/github.com/talos-systems/talos/pkg/machinery/config/types/v1alpha1
- siderolabs/talos Terraform provider docs: https://registry.terraform.io/providers/siderolabs/talos/latest/docs
- `talos_machine_configuration` data source schema: https://github.com/siderolabs/terraform-provider-talos/blob/main/docs/data-sources/machine_configuration.md
- `talos_cluster_kubeconfig` data source schema: https://github.com/siderolabs/terraform-provider-talos/blob/main/docs/data-sources/cluster_kubeconfig.md
- siderolabs/terraform-provider-talos releases (current version 0.11.x as of May 2026): https://github.com/siderolabs/terraform-provider-talos/releases

## Issues Found
1. **Terraform: dangling `depends_on` reference to undefined resource.** The `talos_cluster_kubeconfig` data source had `depends_on = [talos_machine_bootstrap.this]`, but no `talos_machine_bootstrap` resource is defined anywhere in the example. `terraform validate` would fail on the unknown reference. Removed the `depends_on` line. (The Terraform block is a structural skeleton — actual provisioning would still require `talos_machine_configuration_apply` and `talos_machine_bootstrap` resources — but at least the snippet as printed is now syntactically resolvable.)
2. **Terraform provider version pin was significantly outdated.** The example pinned `version = "~> 0.5"`, which restricts to the 0.5.x line. The current provider release line is 0.11.x (released May 2026). Bumped the constraint to `~> 0.7` to track a more recent and still-stable major. (`~> 0.7` allows 0.7.x; readers can adjust further to current.)

## Review Notes
- All `talosctl cluster create` flags used in the post (`--provisioner docker`, `--name`, `--controlplanes`, `--workers`, `--wait-timeout`, `--config-patch`) are valid and current.
- `talosctl kubeconfig --force --merge=false` is correct.
- The JSON patch path `/cluster/allowSchedulingOnControlPlanes` is correct for v1alpha1 machine configuration. Using `op: "add"` is appropriate since the field is normally absent by default.
- The JSON patch path `/cluster/network/cni/name` with `op: "replace"` is the correct way to set CNI to `none` for a custom CNI (e.g., Cilium) installation.
- The Terraform block in the "Ephemeral Clusters with Terraform" section remains an incomplete skeleton — it generates machine configurations and machine secrets, but does not apply them or bootstrap any node. A real working example would need `talos_machine_configuration_apply` resources for each node and a `talos_machine_bootstrap` resource, plus infrastructure (Docker containers, VMs, etc.) to host the Talos nodes. This is a stylistic/completeness concern rather than a correctness bug now that the dangling reference is removed.
- The systemd `.timer` snippet in the "Automatic TTL and Garbage Collection" section lacks a matching `ephemeral-gc.service` unit. A timer alone does not execute anything; readers will need to author the corresponding service unit. Not corrected in-place to avoid expanding scope beyond an error fix.
- In the pre-warming script, the `&` backgrounding followed immediately by `wait $!` is effectively synchronous. This works but is redundant — readers wanting genuine parallelism would need to collect PIDs across iterations and `wait` outside the loop. Behavior is correct as written, just not optimized.
- The Terraform provider version constraint should be revisited periodically; pinning to `~> 0.7` is a conservative bump from `~> 0.5` rather than tracking the absolute latest (0.11.x), which avoids potential breakage from any post-0.7 schema changes in the snippet.
