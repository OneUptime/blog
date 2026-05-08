# Validation Summary: Using the Calico BGPFilter Resource in Production Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- Calico BGPFilter
- Calico BGPPeer
- Calico Felix
- Calico Typha
- calicoctl
- kubectl

## Sources Consulted
- Calico BGPFilter resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico BGPPeer resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node status documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Felix configuration documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- BGPFilter resources do not have node selectors. The post said to use node selectors in the BGPFilter manifest; I changed this to explain that node labels are selected by BGPPeer `nodeSelector` and BGPFilters are attached through BGPPeer `filters`.
- The small-cluster verification command inspected Kubernetes node YAML for Calico annotations, which does not show BGPFilter attachment. I changed it to inspect BGPPeer resources, where BGPFilter references are configured.
- The post recommended increasing reconciliation intervals and later troubleshooting aggressive reconciliation intervals, but BGPFilter does not expose such a resource field. I changed the guidance to focus on reducing frequent or overly broad BGPFilter updates.
- The kubectl resource alias for watching BGPFilters used the singular `bgpfilter.projectcalico.org`. Calico documents the kubectl alias as `bgpfilters.projectcalico.org`, so I corrected the command.
- The Felix health endpoint text tied liveness and readiness checks to Prometheus metrics. I changed it to refer to the Felix health port instead.
- The RBAC check used `kubectl auth can-i` with both a specific verb/resource and `--list`, which is not valid syntax. I changed it to a direct permission check for creating BGPFilter resources.
- The CRD version review command printed the first two columns of the default CRD table rather than the served CRD versions. I changed it to use kubectl custom columns for `.spec.versions[*].name`.

## Review Notes
The post is technically relevant and mostly operational guidance rather than a full configuration tutorial. Future improvements could include a minimal BGPPeer example showing `nodeSelector` plus `filters`, but I did not add one because the task requested only technical corrections without restructuring or adding new sections.
