# Validation Summary: How to Observe and Analyze Current Access in the Cilium Star Wars Demo

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- eBPF
- Cilium network policy observability
- Star Wars demo application

## Sources Consulted
- Cilium Star Wars demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI flow inspection documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium Layer 7 protocol visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html

## Issues Found
- The post used `hubble observe --namespace default --protocol http` while describing a no-policy baseline. Cilium's documentation states that L7 protocol visibility requires L7 proxy visibility through L7 policy configuration, while default visibility is L3/L4. I changed the example to filter TCP flows with `--protocol tcp`.
- The post used `kubectl exec -n kube-system ds/cilium -- cilium monitor`, but the current Cilium command reference documents `cilium-dbg monitor`. I changed the examples to use `cilium-dbg monitor`.
- The post used `cilium monitor --related-to xwing`, but `--related-to` expects an endpoint ID, not a pod name. I added an endpoint-list step and changed the monitor command to use a numeric endpoint ID variable.
- The post described `cilium monitor` as monitoring all packet events. Because the example execs into one Cilium DaemonSet pod, it monitors one agent's events; I adjusted the wording to avoid overstating cluster-wide scope.

## Review Notes
The Star Wars demo pod names, service name, request paths, and no-policy access behavior match the official Cilium demo. Hubble Relay port-forwarding and status validation commands are consistent with the official Hubble setup documentation.
