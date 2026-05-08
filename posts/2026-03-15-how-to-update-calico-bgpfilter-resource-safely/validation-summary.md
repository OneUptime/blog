# Validation Summary: How to Update the Calico BGPFilter Resource Safely

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico Open Source
- Calico BGPFilter and BGPPeer resources
- calicoctl
- Kubernetes / kubectl
- BGP route filtering

## Sources Consulted
- Calico BGPFilter resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico API type reference for BGPFilter match operators: https://pkg.go.dev/github.com/tigera/api/pkg/apis/projectcalico/v3

## Issues Found
- The post said adding an Accept rule before a catch-all Reject is non-disruptive. This was too absolute: it expands accepted routes and can still be risky if the CIDR is wrong or overlaps earlier Reject rules. Changed the wording to describe it as lower risk only when the CIDR is intentional and rule ordering is checked.
- The "Removing an Allow Rule" section labeled `calicoctl node status` as checking currently exchanged routes. Official `calicoctl node status` output reports Calico node and BGP peering state, not the full exchanged route set. Updated the comment to say it checks BGP sessions before the change.
- The CIDR narrowing procedure implied that keeping the old wider Accept rule lets you fully verify the narrower rule before removing the wider one. Because first-match behavior means the wider rule can still permit routes outside the narrower CIDR, clarified that operators must also verify that routes in the removed part of the old CIDR are no longer required.
- The patch section did not warn that patching list fields such as `exportV4` requires the complete desired list. Added this note so readers do not accidentally replace a list with a partial list.
- The verification section labeled a log grep as verifying route exchange. Calico logs can help identify BGP or filter-related errors, but they are not a reliable route exchange inventory. Updated the comment accordingly.

## Review Notes
The BGPFilter API group, kind, rule fields (`exportV4`, `importV4`, `action`, `matchOperator`, `cidr`), accepted actions, match operators, BGPPeer `filters` reference, and first-match/default-Accept behavior were verified against current official Calico documentation. The `calicoctl get`, `apply`, `patch`, and `node status` command forms are current in the Calico 3.31 documentation. The `kubectl run ... --rm -it --restart=Never` pattern is documented by Kubernetes.
