# Validation Summary: How to Remove System Extensions from Talos Linux

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Talos Image Factory (factory.talos.dev)
- System Extensions (iscsi-tools, qemu-guest-agent, tailscale, nvidia)
- Kubernetes (kubectl)
- etcd
- Longhorn (referenced as example storage)
- NVIDIA k8s-device-plugin

## Sources Consulted
- Talos Linux documentation on system extensions: https://www.talos.dev/v1.7/talos-guides/configuration/system-extensions/
- Talos Image Factory documentation: https://www.talos.dev/v1.7/learn-more/image-factory/
- Sidero Labs extensions catalog: https://github.com/siderolabs/extensions
- talosctl CLI reference (upgrade, patch, get extensions, etcd status, dmesg, logs, reboot, services, read): https://www.talos.dev/v1.7/reference/cli/
- Companion post in this series: posts/2026-03-03-add-system-extensions-to-talos-linux/README.md (for command convention consistency)
- Kubernetes documentation for `kubectl drain`, `uncordon`, `delete`, `get pv/pvc/storageclass`: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
No technical issues found.

The post uses correct talosctl subcommands (`get extensions`, `patch machineconfig`, `upgrade --image`, `services`, `dmesg`, `logs machined`, `get members`, `etcd status`, `reboot`, `config info`, `read`). The Image Factory schematic payload format (`customization.systemExtensions.officialExtensions`) matches the documented JSON/YAML schema. The image reference format `factory.talos.dev/installer/<schematic-id>:<version>` is correct. JSON Patch operations (RFC 6902 `op: remove`, `path: /machine/files/0`) are valid against the Talos machine config schema. The advice that Talos rolls back automatically on a failed upgrade is accurate (A/B partition scheme).

## Review Notes
- Talos v1.7.x is used throughout as the example version, which is internally consistent with the companion "add system extensions" post. Readers on newer Talos versions (1.8+, 1.9+) should substitute the appropriate installer tag — extension version compatibility is generally tied to the Talos minor version.
- The `talosctl read /proc/modules | grep iscsi` command works because `talosctl read` proxies file reads through the OS API; the `iscsi_tcp` module presence indicates active sessions, but is not by itself proof of in-use volumes.
- The `kubectl get svc ... | grep -E "100\."` heuristic for Tailscale CGNAT addresses (100.64.0.0/10) is approximate and could yield false positives for non-Tailscale IPs starting with `100.` — readers should treat it as a starting signal.
- The patch examples that target `/machine/files/0` or `/machine/kernel/modules/0` are illustrative; the post correctly cautions readers to verify the actual index before applying. In production, readers may prefer `"op": "test"` guards or path-by-name patches generated from the live config.
- The 180s/120s `sleep` durations in the rolling script are reasonable estimates but not deterministic — a production runbook would replace them with a readiness loop (`talosctl health` or `kubectl wait --for=condition=Ready node/<name>`).
- "Atomic and reversible" is a fair description of the install/upgrade model, though strictly speaking reversibility depends on the previous image still being on the B partition (which it is after a single upgrade, but not after two consecutive upgrades).
