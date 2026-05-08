# Validation Summary: Validating Results After Running calicoctl node status

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- BGP
- Kubernetes
- kubectl
- Linux routing
- Bash

## Sources Consulted
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calicoctl node` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico BGP peering guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The scripts parsed `calicoctl node status` with whitespace fields and treated `Established` as the state. Calico's documented table uses pipe-delimited columns where `STATE` is `up` and `INFO` is `Established`, so the parsing was fragile and the `SINCE` field index was wrong. Updated the peer count, peer IP extraction, and session stability examples to parse the documented table columns with `awk -F'|'`.
- The peer-count script used `calicoctl get nodes -o jsonpath`, but official `calicoctl get` output formats do not include `jsonpath`. Replaced it with the documented `go-template` output format.
- The route validation commands only searched for `proto bird`, while current Calico troubleshooting examples show BGP routes as `proto 80`. Updated the route checks to match either `proto bird` or `proto 80`.
- The route validation text overclaimed that next-hop counts prove routes were received from all peers. Adjusted the wording and warning to account for route reflectors, encapsulation, and peers that may not advertise pod routes.
- The connectivity test selected and deleted pods with the generic `run` label, which could include unrelated pods in the namespace. Added a dedicated `app=calico-connectivity-test` label and used it consistently for wait, get, and cleanup.
- The `kubectl run --overrides` example omitted `apiVersion`, while the official generated reference shows overrides with an `apiVersion`. Added `apiVersion: v1` to the inline override.

## Review Notes
The guide is accurate for BGP-backed Calico deployments. In VXLAN-only or policy-only Calico deployments, `calicoctl node status` may not show BGP peers and the route-exchange checks may not apply.
