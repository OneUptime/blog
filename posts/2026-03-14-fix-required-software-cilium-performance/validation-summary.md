# Validation Summary: Fixing Required Software Issues in Cilium Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Linux kernel modules and bpffs
- iperf3
- netperf / Cilium connectivity performance testing
- bpftool, iproute2, ethtool, perf

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes Requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium Quick Installation / CLI install: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `connectivity perf` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_perf/
- Cilium Troubleshooting / `cilium-dbg monitor`: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Helm `rollback` reference: https://helm.sh/docs/v3/helm/helm_rollback/

## Issues Found
- The prerequisites used stale broad version guidance (`Kubernetes v1.24+` with `Cilium v1.14+`). Updated this to require a Kubernetes version supported by the installed Cilium release and added the current documented Linux kernel baseline for Cilium v1.19+.
- The kernel module section omitted `xt_socket`, which Cilium documents as relevant for redirected L7 traffic in non-tunneled datapath modes, and treated WireGuard as unconditionally required. Added `xt_socket` and made feature-specific modules tolerant of absence.
- The bpffs mount check used a broad `mount | grep bpf` test that could match unrelated BPF mounts. Changed it to check `/sys/fs/bpf` and use the documented `mount bpffs /sys/fs/bpf -t bpf` form.
- The benchmarking manifest created a single `bench-tools` pod, but the later benchmark command expected separate `perf-client` and `perf-server` endpoints. Replaced it with matching `perf-server` pod/service and `perf-client` pod resources, and pointed netperf users to `cilium connectivity perf`.
- The Cilium CLI install snippet did not verify the release checksum or handle arm64 Linux hosts. Updated it to match the official Cilium CLI install flow with `.sha256sum` verification and architecture detection.
- The verification comment referred to validation checks and PASS results that did not exist in the post. Changed it to describe the actual `cilium status --verbose` check.
- The post-fix checklist used daemon-side commands (`cilium monitor`, `cilium endpoint list`) as if they were available through the Kubernetes-facing Cilium CLI. Updated drop monitoring to run `cilium-dbg monitor --type drop` through `kubectl exec ds/cilium`, and changed endpoint inspection to use the Kubernetes `CiliumEndpoint` CRDs.
- The iperf3 benchmark command omitted the `monitoring` namespace and referenced a service that the post did not create. Updated it to execute in the correct namespace and use the created service DNS name.

## Review Notes
The remaining commands are operational examples and depend on cluster-specific details such as package availability, Helm release name, selected Cilium datapath mode, and whether metrics-server is installed for `kubectl top`. Those caveats do not make the examples syntactically invalid, but they should be considered before running the guide unchanged in production.
