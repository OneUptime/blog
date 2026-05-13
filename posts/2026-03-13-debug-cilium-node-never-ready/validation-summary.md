# Validation Summary: How to Debug a Cilium Node That Never Becomes Ready

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- eBPF/BPF filesystem
- Linux kernel configuration

## Sources Consulted
- Kubernetes Node Status documentation: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Debugging Nodes with kubectl documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Cilium System Requirements documentation: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes Configuration documentation, BPFFS notes: https://docs.cilium.io/en/latest/network/kubernetes/configuration/
- Cilium cilium-agent command reference: https://docs.cilium.io/en/latest/cmdref/cilium-agent.html

## Issues Found
- The post described `NetworkUnavailable` as a condition "set by Cilium when it initializes." Kubernetes defines the node condition, while Cilium commonly marks it `False` with reason `CiliumIsUp` when networking is configured. Updated the wording to distinguish the Kubernetes condition from Cilium's reporting behavior.
- The kernel diagnostics referred to "kernel modules" while checking `CONFIG_BPF` values. These are kernel configuration options, not necessarily modules. Updated the wording.
- The `/proc/config.gz` command used `grep` directly against a gzip-compressed kernel config. Updated it to use `zcat` and fall back to `/host/boot/config-$(uname -r)` from a node debug pod.
- The BPF filesystem check grepped for any `bpf` mount and showed an incomplete expected output. Updated it to check `/sys/fs/bpf` specifically and documented the expected `type bpf` mount output.
- The post implied a missing BPF filesystem mount is always a static host problem. Cilium can auto-mount bpffs, so the text now notes disabled or blocked auto-mounting as the condition to investigate.
- The resource limit section said Cilium may crash if it exceeds memory or CPU limits. CPU limits normally throttle rather than crash a container, while memory limits can cause OOMKills. Updated the wording.
- The `failed to load programs` table entry mapped only to an old kernel. Updated it to the broader and more accurate kernel capability or configuration mismatch.

## Review Notes
The commands are generally valid for Kubernetes clusters with a working `kubectl` and appropriate RBAC. The local environment did not have `kubectl` installed, so CLI syntax was checked against the official Kubernetes command reference rather than local `--help` output.
