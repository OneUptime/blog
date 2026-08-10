# Validation Summary: Why cloud-controller-manager Sets the Wrong `InternalIP` or `ExternalIP` on a Node

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes Nodes, `NodeStatus`, Node addresses, and ProviderID
- External cloud-controller-manager node and node-lifecycle controllers
- Kubernetes Lease-based leader election and cloud-provider migration
- Kubelet node registration and `--node-ip`, including dual-stack behavior
- `kubectl`, jq, Kubernetes field selectors, and the Node proxy API
- Linux networking diagnostics, systemd, and journald

## Sources Consulted

- [Kubernetes: Cloud Controller Manager node controller](https://kubernetes.io/docs/concepts/architecture/cloud-controller/#node-controller)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Node Status and addresses](https://kubernetes.io/docs/reference/node/node-status/#addresses)
- [Kubernetes API: Node and NodeStatus](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/#NodeStatus)
- [Kubernetes: Nodes, Node name uniqueness, and kubelet self-registration](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [Kubernetes: kubelet command-line reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/)
- [Kubernetes: IPv4/IPv6 dual-stack](https://kubernetes.io/docs/concepts/services-networking/dual-stack/)
- [Kubernetes: Server-Side Apply field management](https://kubernetes.io/docs/reference/using-api/server-side-apply/#field-management)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) and [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) references
- [Kubernetes: Field Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes: Kubelet authentication and authorization](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/)
- [Kubernetes: Communication between Nodes and the control plane](https://kubernetes.io/docs/concepts/architecture/control-plane-node-communication/)
- [Kubernetes: Leases and leader election](https://kubernetes.io/docs/concepts/architecture/leases/#leader-election)
- [Kubernetes: Controller-manager leader migration](https://kubernetes.io/docs/tasks/administer-cluster/controller-manager-leader-migration/)
- [Kubernetes: Completing cloud-provider migration](https://kubernetes.io/blog/2024/05/20/completing-cloud-provider-migration/)
- [Kubernetes cloud-provider v0.36.0: cloud node controller](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/node/node_controller.go), [node-address helper](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/node/helpers/address.go), and [provider interfaces](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/cloud.go)
- [Kubernetes v1.36.0: Node update validation](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/apis/core/validation/validation.go#L7384-L7387) and [kubelet Node-status setters](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/kubelet/nodestatus/setters.go)
- [jq 1.8 Manual](https://jqlang.org/manual/)

## Issues Found

- The evidence command attempted to iterate over `.metadata.managedFields`, but `kubectl get` omits managed fields from JSON and YAML output by default. Added `--show-managed-fields` and used jq's optional iterator so the command both exposes the data and remains safe if the optional field is absent.
- `CCM_LEADER_POD` was an undefined literal in the log command. Clarified that it must be set from the provider's leader-election information and changed the command to expand and quote the shell variable.
- The post treated every empty ProviderID as an error. Qualified this because upstream retains a Node-name fallback for providers that do not implement ProviderID discovery.
- The post did not explain that a non-empty `.spec.providerID` is immutable. Added the required delete-and-recreate lifecycle guidance, changed stale Node wording from “temporarily contain” to “retain,” and updated the repair list so it does not imply an in-place ProviderID edit.
- The competing-writer examples were too broad. Qualified the in-tree case as applying to pre-v1.31 clusters and clarified that separate external CCM installations compete only when they can both become active, such as when they use different leader-election locks or disable leader election.
- Removed “cloned machine IDs” as a generic CCM matching cause because upstream cloud-node matching does not use the guest machine ID as a portable join key. Provider- or provisioning-tool-specific identity behavior still needs to be checked in that tool's documentation.
- Updated the redirected Node API reference to its current canonical `/core/node-v1/` URL.

## Review Notes

- The post is provider-neutral and was reviewed against the current Kubernetes v1.36 documentation and upstream source. Provider-specific address ordering, network filters, permissions, and flags still need to be checked against the exact CCM release in use.
- Managed fields can identify relevant managers and status-subresource activity, but they are not a substitute for audit records and component logs when establishing which request last changed a particular address.
- The Node proxy health check uses the address selected by the API server's kubelet address preferences; it does not independently prove that every advertised `InternalIP` and `ExternalIP` is reachable. The post correctly calls for additional CNI, health-probe, and NodePort path testing.
