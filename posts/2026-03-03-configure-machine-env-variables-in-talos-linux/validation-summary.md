# Validation Summary: How to Configure Machine Env Variables in Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (machine configuration, `machine.env`, `EnvironmentConfig`)
- `talosctl` CLI (`apply-config`, `get machineconfig`, `dmesg`, `image pull`, `--nodes`, `--config-patch`)
- Containerd / CRI image pulls
- Kubelet
- Talos system services (`apid`, `machined`, `trustd`)
- HTTP/HTTPS/NO proxy environment variables
- gRPC-Go logging environment variables
- Kubernetes service/pod CIDRs and cluster DNS suffixes (`.svc`, `.cluster.local`)

## Sources Consulted
- Talos v1.9 machine config reference (machine.env field, recognized values): https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos source — `MachineEnv` field documentation in `pkg/machinery/config/types/v1alpha1/v1alpha1_types.go` (release-1.9 branch): https://raw.githubusercontent.com/siderolabs/talos/release-1.9/pkg/machinery/config/types/v1alpha1/v1alpha1_types.go
- Talos source — `EnvironmentV1Alpha1` document (replacement for `machine.env`, POSIX-1 key validation) in `pkg/machinery/config/types/runtime/environment.go` (main branch): https://raw.githubusercontent.com/siderolabs/talos/main/pkg/machinery/config/types/runtime/environment.go
- Talos main branch `MachineEnv` deprecation note in `v1alpha1_types.go`: https://raw.githubusercontent.com/siderolabs/talos/main/pkg/machinery/config/types/v1alpha1/v1alpha1_types.go
- Talos v1.9 CLI reference (`talosctl image pull`, `dmesg`, `get`, `--nodes` flag): https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos v1.13.0 release notes (introduction of `EnvironmentConfig`, deprecation of `.machine.env`): https://github.com/siderolabs/talos/releases/tag/v1.13.0

## Issues Found

1. **"Setting Custom Variables" section was technically incorrect.** The original post implied `machine.env` could be used for arbitrary system tuning with examples like `CONTAINERD_LOG_LEVEL: debug`, `GODEBUG: netdns=go`, `TALOS_ENV: production`, `DATACENTER: us-east-1`. The Talos documentation and source explicitly list only five recognized values for `machine.env`: `GRPC_GO_LOG_VERBOSITY_LEVEL`, `GRPC_GO_LOG_SEVERITY_LEVEL`, `http_proxy`, `https_proxy`, `no_proxy`. `CONTAINERD_LOG_LEVEL` is not a containerd env var (containerd's log level lives in its config file, not the environment), so the comment "Increase containerd log verbosity" was actively misleading. The custom keys `TALOS_ENV` / `DATACENTER` have no consumer inside Talos. Replaced the section with one titled "Beyond Proxy Settings: gRPC Logging" that documents the actual two non-proxy recognized keys and explicitly warns that arbitrary keys pass validation but have no Talos consumer.

2. **Misleading NO_PROXY CIDR breakdown.** The original labeled `10.0.0.0/8` as "Common pod CIDR range", `172.16.0.0/12` as "Common service CIDR range", and `192.168.0.0/16` as "Common node network range". These are simply RFC 1918 private ranges - none of them is the default Talos pod CIDR (`10.244.0.0/16`) or service CIDR (`10.96.0.0/12`). Relabeled the comments to identify them correctly as RFC 1918 private ranges and added a note giving the actual Talos defaults so readers can substitute their real CIDRs.

3. **Domain typo / inconsistency.** First proxy block used `.company.internal`, the breakdown block used `.internal.company`. Standardized on `.company.internal`.

4. **Inconsistent proxy key casing vs. official docs.** Talos documentation lists the proxy keys in lowercase (`http_proxy`, `https_proxy`, `no_proxy`). The post mixed uppercase (`HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`) throughout. Normalized to lowercase in the primary examples and rewrote the case-sensitivity troubleshooting paragraph to accurately explain that lowercase is the canonical form Talos recognizes, while still allowing setting both for non-Go consumers.

5. **Missing deprecation note.** As of Talos v1.13 (released 2025), `machine.env` is deprecated in favor of a dedicated `EnvironmentConfig` document; the field still works for backward compatibility. Added a one-line deprecation note after the first example and a closing line in the Summary directing v1.13+ users to `EnvironmentConfig`.

6. **Propagation explanation undersold one important detail.** The Talos `EnvironmentConfig` docs explicitly state that "Propagation of environment variables to services is done only at initial service start time." The post's "How Environment Variables Propagate" section didn't make this clear, so I added a sentence noting that affected services (or the node) must restart for new values to take effect.

## Review Notes

- `talosctl image pull`, `talosctl dmesg`, `talosctl get machineconfig`, `talosctl apply-config` with `--insecure`, `--nodes`, `--file`, and `--config-patch` flags were all verified against the v1.9 CLI reference and are correct.
- The `talosctl get machineconfig --nodes <ip> -o yaml | grep -A 20 "env:"` verification command is fine, though grep on YAML is fragile; a future revision could suggest `yq` for cleaner extraction. Not changed since it works.
- `talosctl dmesg ... | grep -i proxy` is unlikely to return proxy-related output in normal operation since proxy env vars are not logged to kmsg. Left as-is because the surrounding text frames it as a check that "might" show something, but a future revision could replace it with `talosctl logs <service>` or `talosctl read /proc/<pid>/environ`-style verification, which would be more reliable.
- The `env: {}` removal example works but on Talos v1.13+ the equivalent for `EnvironmentConfig` would be to remove the document or empty the `variables` map and restart the node. Not added to keep scope minimal.
- The post still uses `machine.env` exclusively rather than `EnvironmentConfig`. That's fine for backward compatibility, and the added deprecation notes flag the future direction.
