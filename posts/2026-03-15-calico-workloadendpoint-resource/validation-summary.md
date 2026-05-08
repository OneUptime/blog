# Validation Summary: How to Use the Calico WorkloadEndpoint Resource in Real Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico WorkloadEndpoint resources
- Calico `calicoctl`
- Kubernetes pods and node debugging
- Calico profiles, IPAM, and network policy concepts

## Sources Consulted
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico `calicoctl get` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico Profile resource reference: https://docs.tigera.io/calico/latest/reference/resources/profile
- Calico `calicoctl ipam show` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes `kubectl debug` node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The introduction said a WorkloadEndpoint is created each time a pod is scheduled and that it tracks the network namespace. Updated this to say the resource is created when Calico networking is set up for the pod and to list fields that are present in the official WorkloadEndpoint schema, such as pod name, assigned IP CIDRs, host-side interface name, and profiles.
- The post described WorkloadEndpoints as a direct view into Calico's data plane state. Updated this to endpoint state used by Calico to program policy and networking, which is more accurate for the resource model.
- The "list all WorkloadEndpoints across all namespaces" command omitted `--all-namespaces`. Added the flag because `calicoctl get` defaults to the default namespace for namespaced resources.
- The label filtering example used `calicoctl get -l`, but the official `calicoctl get` reference does not document a label selector flag. Replaced it with a YAML-output filtering example using Calico's automatic namespace label.
- The logs example assumed Calico is always installed in `calico-system`. Added the `kube-system` variant for manifest-based installs.
- The profile explanation said profiles correspond to Kubernetes namespace and service account policies. Updated this to explain that WorkloadEndpoints list assigned Calico profiles, and that profile policy rules are historical/deprecated in favor of NetworkPolicy and GlobalNetworkPolicy.
- The verification section said WorkloadEndpoint count should closely match all running pods. Added the caveat that this applies to pods using Calico networking, and that host-network pods do not have a normal Calico pod interface.

## Review Notes
The remaining shell examples are operational troubleshooting snippets and depend on cluster installation details, RBAC, and available tools inside debug images. The corrected post now calls out the main installation-dependent namespace caveat.
