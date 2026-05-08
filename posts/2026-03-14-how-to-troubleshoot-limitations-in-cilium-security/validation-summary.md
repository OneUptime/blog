# Validation Summary: Troubleshooting Cilium Security Policy Limitations

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Hubble
- Cilium DNS proxy and FQDN policies
- Cilium L7/Envoy policy enforcement

## Sources Consulted
- Cilium command reference for `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg endpoint list`, `endpoint get`, and `endpoint health` command references: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_identity_list/
- Cilium `cilium-dbg fqdn cache list` DNS/FQDN debugging guidance: https://docs.cilium.io/en/latest/contributing/development/debugging/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/stable/security/dns.html
- Cilium DNS policy and `toFQDNs` documentation: https://docs.cilium.io/en/stable/security/policy/layer7.html
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Hubble CLI flow visibility documentation: https://github.com/cilium/hubble
- Kubernetes Pod DNS policy documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The post used the standalone `cilium` CLI for local agent debug commands such as `endpoint`, `identity`, `fqdn`, `policy`, and `monitor`. Current Cilium documentation exposes these diagnostics through `cilium-dbg`, so the examples were updated to run `cilium-dbg` inside the Cilium agent DaemonSet.
- `cilium monitor --type drop --output json` used an unsupported output flag for monitor events. It was changed to `cilium-dbg monitor --type drop --json`, matching the documented monitor flags.
- `cilium endpoint health` was shown without the required endpoint ID. It was changed to `cilium-dbg endpoint health <ENDPOINT_ID>`.
- The Hubble flow summary used `jq` without slurping the JSON stream, which would summarize each event independently instead of the full `--last 1000` result set. It was changed to `jq -s`.
- The debug Pod manifest ran `cat /etc/resolv.conf` with the default `restartPolicy: Always`, which is not ideal for a one-shot inspection container. It now sets `restartPolicy: Never`.
- The policy verification example used deprecated node-local policy output to look up a policy by Kubernetes metadata. It now verifies realized policy from the endpoint status, which matches Cilium's documented policy troubleshooting flow.

## Review Notes
The examples using `kubectl exec ds/cilium` inspect one selected Cilium agent pod. For multi-node incidents, operators should repeat node-local `cilium-dbg` checks on the Cilium agent running on the node that owns the affected endpoint.
