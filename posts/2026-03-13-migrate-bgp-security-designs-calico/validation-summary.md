# Validation Summary: How to Migrate to BGP Security Designs in Calico Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- Calico BGPPeer
- Calico BGPFilter
- Kubernetes Secrets and RBAC

## Sources Consulted
- Calico Open Source BGP peer resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Open Source BGP filter resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico Open Source secure BGP sessions documentation: https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- Calico Open Source configure BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- RFC 2385, Protection of BGP Sessions via the TCP MD5 Signature Option: https://www.rfc-editor.org/rfc/rfc2385
- RFC 7454, BGP Operations and Security: https://www.rfc-editor.org/rfc/rfc7454.html

## Issues Found
- The BGPFilter prefix-length rules set `cidr` without `matchOperator`. Current Calico validation requires `cidr` and `matchOperator` to be set together, so I added `matchOperator: In` to both prefix-length reject rules.
- The BGP password example created a Secret but did not grant `calico-node` RBAC access to read it. Calico documentation requires the `calico-node` ServiceAccount to have `get`, `list`, and `watch` permissions on the referenced Secret, so I added the Role and RoleBinding example.
- The Secret example assumed `calico-system` without noting that the Secret must be in the same namespace as the `calico-node` pod. I added a namespace caveat.
- The prerequisite only mentioned `calicoctl v3.26+`, while the examples use Kubernetes-style resources and `kubectl`. I clarified that either `calicoctl v3.26+` or `kubectl` access to `projectcalico.org/v3` resources is needed.
- The introduction and diagram implied AS path filtering was part of the Calico controls shown in the post. Calico BGPFilter supports route import/export filtering and selected route operations, but the reviewed example does not configure AS path filtering. I changed that wording to place AS path filtering and RPKI on external routers and updated the diagram label to "External Route Policy."

## Review Notes
The `kubectl` binary was not installed in this workspace, so the command syntax was checked against the official Kubernetes generated reference instead of local `kubectl --help` output. The corrected YAML snippets were manually reviewed against the Calico resource documentation.
