# Validation Summary: How to Create the Calico KubeControllersConfiguration Resource

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- KubeControllersConfiguration
- calico-kube-controllers
- Kubernetes
- calicoctl
- HostEndpoint
- Kubernetes NetworkPolicy

## Sources Consulted
- Calico KubeControllersConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico Kubernetes controllers configuration reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration
- Calico guide for protecting Kubernetes nodes with automatic host endpoints: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- calicoctl apply command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl resource alias reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- The introduction described service account token management and workload endpoint garbage collection. Updated this to service account change synchronization and workload endpoint label synchronization, matching the Calico controller documentation.
- The post claimed to cover all available controller settings but omitted current options such as the load balancer controller. Changed the wording to common controller settings and added the `loadbalancer` controller to the broader examples.
- The controller descriptions did not distinguish etcd datastore-only controllers from controllers that are valid with the Kubernetes datastore. Added datastore caveats for policy, workload endpoint, namespace, and service account controllers.
- The automatic host endpoint section said Calico creates a HostEndpoint for each interface on every node. Updated this to a wildcard HostEndpoint for each node, which matches current Calico documentation.
- The host endpoint troubleshooting note referenced calico-node reporting node status. Updated it to check that Calico node names match Kubernetes node names, which is the relevant requirement for automatic host endpoint creation.

## Review Notes
The YAML examples use the current `projectcalico.org/v3` API and valid field names and values for Calico Open Source 3.32 documentation. The verification commands are valid, though clusters installed without the Tigera operator may use a different namespace than `calico-system` for calico-kube-controllers.
