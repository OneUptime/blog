# Validation Summary: How to Operationalize Calico eBPF Installation

## Status
validated

## Post Type
Operational guide / runbook (tutorial-style)

## Technologies Covered
- Calico (Tigera Operator, FelixConfiguration, Installation CRD)
- Calico eBPF data plane
- Kubernetes (kubectl, ConfigMap, DaemonSet, endpoints, TigeraStatus)
- bpftool (BPF program inspection)
- Prometheus metrics
- VXLAN encapsulation
- Bash scripting (heredoc, command substitution)

## Sources Consulted
- Calico eBPF installation docs: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico FelixConfiguration reference (prometheusMetricsEnabled, logSeverityScreen, default Prometheus port 9091)
- Calico operator CRDs (`operator.tigera.io/v1` Installation, `projectcalico.org/v3` FelixConfiguration)

## Issues Found
No technical issues found.

Verified items:
- ConfigMap `kubernetes-services-endpoint` in the `tigera-operator` namespace with `KUBERNETES_SERVICE_HOST` and `KUBERNETES_SERVICE_PORT` keys matches the official Calico kube-proxy-replacement requirement.
- Minimum kernel version 5.10+ matches the documented minimum for the Calico eBPF data plane.
- `spec.calicoNetwork.linuxDataplane: BPF` is a valid value (alongside `Iptables` and `VPP`).
- `spec.calicoNetwork.hostPorts: Disabled` is a valid value (alongside the default `Enabled`).
- `encapsulation: VXLAN` is a valid IPPool encapsulation value.
- `apiVersion: operator.tigera.io/v1` for `Installation` and `apiVersion: projectcalico.org/v3` for `FelixConfiguration` are correct.
- Default Felix Prometheus metrics port 9091 is correct.
- `kubectl wait --for=condition=Available tigerastatus/calico` uses the correct condition on the TigeraStatus resource.
- jsonpath expressions for `status.calicoVersion`, `spec.calicoNetwork.linuxDataplane`, and `spec.calicoNetwork.ipPools[0]` reflect the actual Installation CR shape.
- `bpftool prog list` is the correct command for listing loaded BPF programs.

## Review Notes
- The nested fenced code blocks in the runbook section use `` ```plaintext `` as closing fences. This is a non-standard CommonMark pattern (closing fences should not carry an info string) and may render oddly in some viewers, but it does not affect the technical correctness of the content shown to the reader.
- Calico eBPF supports additional features on newer kernels (v6.6+ is recommended in the docs for full feature access); the post's 5.10+ floor is correct as a minimum but readers may want to target newer kernels in greenfield deployments.
- `nodeSelector: "all()"` on an IP pool is Calico's selector syntax and is correct; readers unfamiliar with Calico selectors should know this is a Calico expression, not a Kubernetes label selector.
