# Validation Summary: How to Understand Talos Linux Controller Runtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Talos controller runtime
- Talos resources and COSI resource model
- talosctl CLI
- Kubernetes controller pattern
- Talos networking resources
- etcd and kubelet management in Talos

## Sources Consulted
- Talos/Sidero documentation: Controllers and Resources, https://docs.siderolabs.com/talos/v1.9/learn-more/controllers-resources/
- Talos/Sidero documentation: Networking Resources, https://docs.siderolabs.com/talos/v1.9/learn-more/networking-resources/
- Talos/Sidero documentation: Hostname configuration, https://docs.siderolabs.com/talos/v1.12/networking/configuration/hostname
- Talos/Sidero documentation: talosctl CLI reference, https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos/Sidero documentation: Configuration Patches, https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos/Sidero documentation: What's New in Talos 1.12.0, https://docs.siderolabs.com/talos/v1.12/getting-started/what%27s-new-in-talos
- Go package documentation for Talos network resources, https://pkg.go.dev/github.com/siderolabs/talos/pkg/machinery/resources/network

## Issues Found
- The post used `talosctl patch machineconfig` with `/machine/network/hostname`. In Talos v1.12, `.machine.network.hostname` is deprecated and replaced by the `HostnameConfig` document. Updated the example to use a `HostnameConfig` strategic merge patch.
- The post said the configuration controller directly updates `HostnameSpec`. Updated the wording to describe `HostnameConfig` being translated by network configuration controllers into the corresponding `HostnameSpec`.
- The post described controller dependencies as a fixed ordered pipeline. Talos uses a controller/resource input-output dependency graph, and the official docs expose this with `talosctl inspect dependencies`. Replaced the fixed pipeline with the supported inspection commands.
- The post said to look for the `layer` field in resource metadata. In the documented YAML examples, `layer` is under `spec`. Updated the comment accordingly.
- The `talosctl get rd` example described every listed resource definition as controller-managed. Resource definitions describe available resource types in the Talos resource API. Updated the comment to avoid overclaiming.

## Review Notes
The remaining commands and concepts are consistent with the Talos documentation reviewed. Some examples rely on resource aliases such as `hostname`, `addresses`, and `rd`, which are supported by `talosctl get` resource definitions but can vary slightly across Talos versions; `talosctl get rd` remains the right way to confirm aliases on a running node.
