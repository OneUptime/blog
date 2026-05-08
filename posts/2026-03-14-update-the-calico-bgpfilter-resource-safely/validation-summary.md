# Validation Summary: Safely Updating the Calico BGPFilter Resource in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico BGPFilter and BGPPeer resources
- Kubernetes
- kubectl
- calicoctl
- BGP

## Sources Consulted
- Calico BGPFilter resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico v3.26 BGPFilter resource documentation: https://docs.tigera.io/calico/3.26/reference/resources/bgpfilter
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico component architecture documentation: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico IPAM documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes API concepts, field validation: https://kubernetes.io/docs/reference/using-api/api-concepts/

## Issues Found
- The backup and diff commands exported all BGPFilter resources without `--export`, which can include cluster-specific metadata and make rollback/diff output noisier. Changed the commands to use `calicoctl get bgpfilter <filter-name> -o yaml --export`.
- The review checklist asked whether a change required a Felix or BGP restart. BGPFilter affects BGP route filtering rather than Felix configuration, so the wording now asks about BGP session restarts.
- The log monitoring step referred to Felix configuration reloads. Calico documentation identifies BIRD and confd as the components involved in BGP configuration reloads, so the command and text now check BGP-related messages.
- The troubleshooting section referred to Felix crashlooping and Felix logs. Updated this to calico-node, which is the pod/container users are actually checking.
- The post said unknown fields are silently ignored by kubectl. Modern Kubernetes supports server-side field validation that warns or rejects unknown fields, so the note now reflects version-dependent behavior.
- The RBAC example mixed `kubectl auth can-i --list` with a specific verb/resource query and described it as checking "who" has permissions. Updated it to a valid current-user permission check and a separate `--list` example filtered for Calico resources.

## Review Notes
The post assumes Calico components run in the `calico-system` namespace, which is correct for common operator installations and Calico's current troubleshooting documentation. Clusters installed with older manifests may use `kube-system`, so operators should adjust the namespace if their installation differs.
