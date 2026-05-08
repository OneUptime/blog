# Validation Summary: How to Use the Calico CalicoNodeStatus Resource in Real Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- CalicoNodeStatus
- Kubernetes
- kubectl
- calicoctl
- BGP
- Bash

## Sources Consulted
- Calico Open Source CalicoNodeStatus resource documentation: https://docs.tigera.io/calico/latest/reference/resources/caliconodestatus
- Calico Open Source BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico API resource management documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post recommended creating CalicoNodeStatus resources for every node. Calico documentation warns that CalicoNodeStatus is designed for a small number of nodes, with fewer than 10 recommended, and should be used for nodes being investigated. Updated the setup, verification, and conclusion to use targeted node monitoring.
- Several examples used `calicoctl get ... -o jsonpath`, but the documented `calicoctl get` output formats do not include JSONPath. Replaced those examples with `kubectl get ... -o jsonpath`, which is supported by kubectl.
- The patch examples used `calicoctl patch` and did not specify a merge patch type. Updated them to `kubectl patch ... --type=merge`, because Kubernetes strategic merge patch is not supported for custom resources.
- The BGP health checks grepped all YAML `state:` fields, which can include agent state such as `Ready` and produce false failures. Updated the commands to inspect only `.status.bgp.peersV4` and `.status.bgp.peersV6`.
- The route counting example searched for `dest:`, but CalicoNodeStatus route entries use the `destination` field. Updated the grep pattern to `destination:`.
- The stale resource cleanup example parsed `spec.node` with grep and awk. Updated it to use kubectl JSONPath for the exact field.
- The troubleshooting command used the `kube-system` namespace for calico-node pods. Updated it to `calico-system`, which matches current operator-based Calico installations.
- Clarified that `calicoctl node status` is a node-local check and showed it with `sudo`, matching the Calico reference.

## Review Notes
The guide now assumes Calico API resources are available through kubectl, which is consistent with current Calico documentation for native v3 CRDs or the Calico API server. Environments installed from older manifests may still place calico-node pods in `kube-system`, so readers may need to adjust the namespace for that one troubleshooting command.
