# Validation Summary: How to Inspect Node Resources with talosctl get

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Talos Linux (talosctl CLI)
- COSI (Common Operating System Interface) resource model
- Kubernetes node management
- Bash / jq scripting

## Sources Consulted
- Talos source code, `pkg/machinery/resources/hardware/processor.go` (CPU resource definition and `cpus` alias): https://github.com/siderolabs/talos/blob/main/pkg/machinery/resources/hardware/processor.go
- Talos source code, `pkg/machinery/resources/hardware/memorymodule.go` (`memorymodules` alias): https://github.com/siderolabs/talos/blob/main/pkg/machinery/resources/hardware/memorymodule.go
- Talos source code, `pkg/machinery/resources/network/{address,link,route,resolver,hostname}_status.go` (network resource aliases)
- Talos source code, `pkg/machinery/resources/runtime/mount_status.go` (`mounts` alias)
- Talos source code, `pkg/machinery/resources/block/{device,disk}.go` (`BlockDevices.block.talos.dev`, `Disks.block.talos.dev`)
- Talos source code, `pkg/machinery/resources/perf/{cpu,mem}.go` (`CPUStats.perf.talos.dev`, `MemoryStats.perf.talos.dev`)
- Talos source code, `pkg/machinery/resources/k8s/{node_status,secrets_status,nodename}.go`
- Talos source code, `pkg/machinery/resources/cluster/member.go` (`Members.cluster.talos.dev`)
- Talos source code, `pkg/machinery/resources/v1alpha1/service.go` (`Services.v1alpha1.talos.dev`)
- Talos source code, `pkg/machinery/resources/config/machine_config.go` (`MachineConfigs.config.talos.dev`)
- COSI runtime `pkg/resource/meta/spec/resource_definition.go` (the `Fill()` auto-alias algorithm — generates lowercase singular/plural + uppercase-letter abbreviations from the type name)
- Talos `cmd/talosctl/cmd/talos/get.go` (`get` command implementation, resource resolution via `ResolveResourceKind`)
- Talos `pkg/machinery/client/resources.go` (`ResolveResourceKind` does case-insensitive exact-match against the resource ID and registered aliases)
- Talos documentation: https://docs.siderolabs.com/talos/v1.11/

## Issues Found

1. **Invalid resource type `systemstat`** — The post used `talosctl get systemstat --nodes <node-ip> -o yaml` for "runtime memory stats." There is no `SystemStat` or `SystemStats` resource in Talos. The real runtime memory-stats resource is `MemoryStats.perf.talos.dev`, which is queried via the auto-generated alias `memorystats`. Changed the command to `talosctl get memorystats --nodes <node-ip> -o yaml`.

2. **Invalid resource type `kubernetesstatus`** — The post used `talosctl get kubernetesstatus --nodes <node-ip> -o yaml` under the "Certificate Issues" section. There is no `KubernetesStatus`/`KubernetesStatuses` resource in Talos. The closest valid resource for inspecting the status of Kubernetes secrets/certificates (etcd, kube-apiserver, etc.) is `SecretStatuses.kubernetes.talos.dev`, queried as `secretstatuses` (or its singular form `secretstatus`). Updated the command and accompanying comment to `talosctl get secretstatuses --nodes <node-ip> -o yaml`.

3. **Misleading resource alias `memory`** — In the "commonly used types" bullet list the post listed `memory - Memory information`. There is no alias `memory`; the relevant types are `memorymodules` (hardware) and `memorystats` (runtime). Changed the bullet to `memorymodules - Memory module hardware information` so it matches the example command actually shown in the post.

## Review Notes

- All other resource type names used in the post (`addresses`, `links`, `routes`, `resolvers`, `hostname`, `cpus`, `memorymodules`, `blockdevices`, `machineconfig`, `members`, `services`, `nodename`, `nodestatus`, `mounts`, `resourcedefinitions`) are valid — either via explicit aliases declared in the Talos resource definitions or via the COSI runtime's auto-alias algorithm (lowercase singular/plural form of the type name).
- The post's claim that `--watch` keeps the command running and streams events is accurate (see `getCmd` watch branch in `cmd/talosctl/cmd/talos/get.go`).
- The address ID example `eth0/192.168.1.10` is the correct ID format for an `AddressStatus` resource.
- The example shell script using `jq -r '.spec.address'` is reasonable for the `-o json` output of `addresses`.
- The post does not pin a Talos version. The verified facts above were checked against the `main` branch of `siderolabs/talos` (matching the current 1.11.x line). If readers run against an older Talos (pre-1.5) some auto-aliases may differ, but the explicit aliases used here have been stable for several releases.
