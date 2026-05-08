# Validation Summary: Troubleshooting Advantages of the Encapsulation Model in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium encapsulation/overlay routing
- eBPF datapath debugging
- Hubble observability
- Linux networking tools

## Sources Consulted
- Cilium routing and encapsulation documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config/
- `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption/
- Cilium WireGuard transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium IPsec transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec.html
- Hubble observability documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Hubble setup and CLI access documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/

## Issues Found
- The introduction overstated the overlay model as preventing pod IP conflicts and described encryption as occurring at the tunnel level. Updated it to match Cilium documentation: encapsulation removes the need for the underlay to route PodCIDRs, requires node-to-node reachability and allowed encapsulation ports, and can be combined with transparent encryption depending on configuration.
- Several datapath commands used `cilium` inside Cilium agent pods. Current Cilium troubleshooting and command references use `cilium-dbg` for agent-local commands such as `bpf tunnel list`, `monitor`, `endpoint list`, and `metrics list`. Updated those examples.
- The pod-to-service connectivity test used `http://kubernetes.default.svc:443`, which sends HTTP to the Kubernetes API HTTPS port. Updated it to `curl -sk https://kubernetes.default.svc:443/version`.
- The verification section used `cilium endpoint list`, which is not a current Cilium CLI command for listing agent endpoints. Updated it to run `cilium-dbg endpoint list` inside the Cilium DaemonSet.
- The troubleshooting section referenced `cilium monitor`, `cilium bpf ct list`, and `cilium bpf prog list`. Updated these to current/accurate alternatives: `cilium-dbg monitor`, `cilium-dbg bpf ct list`, `cilium-dbg metrics list`, and node-level `bpftool prog show`.

## Review Notes
- The examples assume `kubectl exec -n kube-system ds/cilium` selects a suitable Cilium pod. This is acceptable for a concise guide, but in deeper troubleshooting users may need to target the Cilium pod running on the affected node.
- Hubble commands are valid when Hubble is enabled and the local Cilium agent pod has flow visibility for the traffic being inspected; Hubble Relay or port-forwarded CLI usage may be preferable for cluster-wide observation.
