# Validation Summary: How to Understand Talos System Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- containerd
- etcd
- kubelet
- Talos system extensions

## Sources Consulted
- Talos Linux Components documentation: https://docs.siderolabs.com/talos/v1.13/learn-more/components
- Talos talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos talosctl overview: https://docs.siderolabs.com/talos/v1.13/learn-more/talosctl
- Talos Network Connectivity documentation: https://docs.siderolabs.com/talos/v1.13/learn-more/talos-network-connectivity
- Talos System Extensions documentation: https://docs.siderolabs.com/talos/v1.7/build-and-extend-talos/custom-images-and-development/system-extensions
- Talos Containerd configuration documentation: https://www.talos.dev/v1.10/talos-guides/configuration/containerd/
- Talos Time Synchronization documentation: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/system-configuration/time-sync

## Issues Found
- The post used `talosctl services`, but the current CLI command is `talosctl service` with no argument to list services. Updated all examples to use `talosctl service`.
- The example service table omitted the `NODE`, `LAST CHANGE`, and `LAST EVENT` columns shown by current Talos service output. Updated the sample output format.
- The post said Talos is different from every other Linux distribution. This was too broad to validate as a technical claim, so it now says many other Linux distributions.
- The post said `talosctl` connects directly to machined for all commands. Talos documentation describes `apid` as the gRPC entry point that forwards requests to machined. Updated the machined and apid sections to reflect that API path.
- The dependency diagram placed CRI under kubelet, implying CRI depends on kubelet. The kubelet uses the CRI runtime, so the simplified diagram now lists CRI before kubelet.
- The control plane and worker service lists omitted common Talos services such as `networkd` and `timed`. Added them to both lists.
- Kubernetes static pod log examples used `talosctl logs` without selecting the Kubernetes containerd namespace. Updated those examples to use `talosctl logs --kubernetes`.

## Review Notes
The post is a high-level operational guide, so the service dependency diagram remains intentionally simplified. Exact service ordering can vary by Talos version and node role; for precise troubleshooting, use `talosctl service <service-name> -n <node-ip>` and inspect the live node state.
