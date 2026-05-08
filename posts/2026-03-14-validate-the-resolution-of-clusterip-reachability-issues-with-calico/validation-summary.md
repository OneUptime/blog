# Validation Summary: Validating the Resolution of ClusterIP Reachability Errors in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services and ClusterIP networking
- kube-proxy
- kubectl
- Calico Open Source
- calicoctl
- Kubernetes RBAC
- Kubernetes CRDs

## Sources Consulted
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes Pod conditions documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-condition/
- Calico Kubernetes services documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/get-started/about-kubernetes-services
- Calico IPVS kube-proxy documentation: https://docs.tigera.io/calico/latest/networking/configuring/use-ipvs
- Calico system requirements and supported kube-proxy modes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico IPAM command reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The warning-events command claimed to check for zero error events in the last 10 minutes, but it only sorted and tailed recent warning events. Updated the comment so it accurately describes the command.
- The test pod commands said they deployed pods on different nodes, but `kubectl run` without placement constraints may schedule both pods on the same node. Added selection of two Ready nodes and `nodeName` overrides so the cross-node test is deterministic.
- The non-running pods check included the kubectl table header as a false positive and matched text across entire rows instead of the STATUS column. Replaced it with an `awk` check against the STATUS column.
- The deployment replica check compared the READY column to the UP-TO-DATE column directly, which is incorrect because READY is formatted as available/desired. Replaced it with an `awk` check that parses READY and compares ready, up-to-date, and available counts to desired replicas.
- The CRD review command printed CRD name and creation timestamp, not installed CRD versions. Replaced it with a `custom-columns` query that displays `.spec.versions[*].name`.
- The RBAC example mixed a specific `can-i` permission check with `--list`, and the text implied it listed all users who have access. Updated it to check whether the current user can create Calico GlobalNetworkPolicy resources.

## Review Notes
The post assumes Calico components run in the `calico-system` namespace, which is accurate for common operator-based installations. Manifest-based or customized installations may use a different namespace such as `kube-system`, so operators should adjust namespace arguments to match their deployment.
