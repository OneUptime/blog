# Validation Summary: How to Configure Cilium IPv6 Service Load Balancing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes Services
- IPv6 and dual-stack networking
- kube-proxy replacement
- eBPF load balancing
- Hubble
- Helm

## Sources Consulted
- Cilium: Kubernetes Without kube-proxy https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium: Helm Reference https://docs.cilium.io/en/latest/helm-reference/
- Cilium: Command Reference, `cilium-dbg service list` https://docs.cilium.io/en/stable/cmdref/cilium-dbg_service_list/
- Cilium: Command Reference, `cilium-dbg bpf lb list` https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list/
- Cilium: eBPF Maps https://docs.cilium.io/en/latest/network/ebpf/maps/
- Cilium: Monitoring & Metrics https://docs.cilium.io/en/stable/observability/metrics/
- Cilium: Network Observability with Hubble https://docs.cilium.io/en/stable/observability/hubble/
- Kubernetes: IPv4/IPv6 dual-stack https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes: Virtual IPs and Service Proxies https://kubernetes.io/docs/reference/networking/virtual-ips/
- Hubble CLI help excerpt from the official `cilium/hubble` project https://github.com/cilium/hubble/issues/1280

## Issues Found
- The introduction implied Cilium service load balancing always operates at both socket level and XDP. I changed this to socket-based load balancing with optional XDP acceleration, which matches current Cilium documentation.
- The installation example omitted `helm repo add cilium https://helm.cilium.io/`, which is needed before `helm install cilium cilium/cilium` works in a fresh Helm environment. I added it.
- The kube-proxy replacement verification used a generic `cilium status` example, while the documented service-datapath verification is `kubectl -n kube-system exec ds/cilium -- cilium-dbg status | grep KubeProxyReplacement`. I updated the command to the documented one.
- The dual-stack `clusterIPs` example showed IPv4 first even though `.spec.ipFamilies` listed `IPv6` before `IPv4`, and it showed JSON-style output that does not match `kubectl -o jsonpath`. I corrected both the address order and the expected output format.
- The post used unsupported or incorrect inspection commands, including `cilium service list`, `cilium bpf nodeport list`, `cilium service get`, and `cilium bpf lb maglev list` for stickiness. I replaced them with documented `cilium-dbg service list`, `cilium-dbg bpf lb list --backends`, and Kubernetes service inspection commands.
- The NodePort IPv6 example assumed an `ExternalIP` exists on the node, which is not reliable across clusters. I changed it to extract an IPv6 address from the node’s address list instead.
- The DSR section said DSR requires BGP or L2 announcement. That is not a general Cilium DSR requirement. I replaced it with the documented routing requirements and added `routingMode=native` plus `loadBalancer.dsrDispatch=opt`, with a note about `geneve` dispatch for tunnel mode.
- The Hubble command used invalid filtering syntax: `--type l4` is not the right filter for this case and `--ip-version ipv6` is not the documented value. I changed it to `--verdict FORWARDED --to-port 80 --ip-version v6 --last 20`.
- The Prometheus example referenced `cilium_backend_state_count`, which is not a documented Cilium service metric in current docs. I replaced it with the documented `cilium_service_implementation_delay` metric.

## Review Notes
- The examples assume a Kubernetes cluster with IPv6 or dual-stack networking already enabled.
- The Hubble example assumes Hubble has been enabled and a Hubble CLI client is available.
- For DSR, the `opt` dispatch mode requires native routing. In environments that drop IPv6 destination options, the documented alternative is `loadBalancer.dsrDispatch=geneve`.
