# Validation Summary: How to Validate Calico eBPF Troubleshooting Readiness

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes
- kubectl
- bpftool
- Calico FelixConfiguration
- Bash

## Sources Consulted
- Calico documentation: Troubleshoot eBPF mode, including `calico-node -bpf <args>` usage and `nat dump`: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: FelixConfiguration resource and `logSeverityScreen`: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: `kubectl exec` generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: `kubectl logs` generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes documentation: `kubectl run` generated reference, including `--overrides` and `--restart`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: `kubectl` command syntax and resource type/name form: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The script used `calico-node -bpf-nat-dump` and `calico-node -bpf-list-progs`, but current Calico documentation describes the supported built-in BPF tool syntax as `calico-node -bpf <args>`. Changed the NAT check to `calico-node -bpf nat dump` and changed the second built-in Calico BPF tool check to `calico-node -bpf help`.
- The debug pod validation used `sleep 5`, which can exit before `kubectl wait --for=condition=Ready --timeout=30s` observes readiness, especially if image pull or scheduling takes time. Changed it to `sleep 300` so the pod remains available during the readiness check.
- The conclusion said the readiness validation script tests debug pod deployment, but debug pod deployment is validated by a separate command block outside the script. Updated the conclusion to distinguish the script checks from the separate debug pod validation commands.

## Review Notes
- The commands assume the Calico operator namespace and DaemonSet name are `calico-system` and `calico-node`. That is correct for common operator-managed Calico installs, but non-operator or customized installations may use a different namespace such as `kube-system`.
- The local review environment did not have `kubectl` installed, so kubectl syntax was verified against the generated Kubernetes command reference rather than local `--help` output.
