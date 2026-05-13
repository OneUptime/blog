# Validation Summary: Configure Calico Host Endpoint Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico host endpoints
- Calico GlobalNetworkPolicy
- Calico KubeControllersConfiguration
- Kubernetes nodes and labels
- calicoctl and kubectl

## Sources Consulted
- Calico documentation: Protect Kubernetes nodes - https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico documentation: Host endpoint resource - https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico documentation: Creating host endpoint objects - https://docs.tigera.io/calico/latest/reference/host-endpoints/objects
- Calico documentation: Creating policy for basic connectivity - https://docs.tigera.io/calico/latest/reference/host-endpoints/connectivity
- Calico documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Failsafe rules - https://docs.tigera.io/calico/latest/reference/host-endpoints/failsafe
- Calico documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The automatic host endpoint setup used `FelixConfiguration.spec.interfacePrefix`, which only identifies workload endpoint interface prefixes and does not enable automatic host endpoint creation. Replaced it with the documented `calicoctl patch kubecontrollersconfiguration default` command that sets `spec.controllers.node.hostEndpoint.autoCreate` to `Enabled`.
- The post suggested patching the Calico `Installation` resource with `nonPrivilegedNetwork: false` to enable host endpoint management. That field does not enable automatic host endpoints, so it was replaced with a node-labeling command used by Calico's documented automatic host endpoint workflow.
- The default-deny explanation did not account for automatically created host endpoints, which include Calico's `projectcalico-default-allow` profile. Clarified that default-deny applies to host endpoints without an allow-all profile, and that automatic host endpoints need explicit policy before they provide enforcement.
- The policy selector used `has(node)`, but automatic host endpoints inherit Kubernetes node labels and do not necessarily have a `node` label. Added a `kubernetes-host=true` node label and updated the manual HostEndpoint example and policies to select `has(kubernetes-host)`.
- The allow-list policy allowed all egress traffic, which made the later deny-all egress policy ineffective. Replaced the broad egress allow with explicit TCP and UDP port allowances for common Kubernetes and Calico host connectivity.
- The example preserved kubelet read-only port `10255`, which is disabled by default in modern Kubernetes clusters. Removed it from the allow-list.
- The default deny policy was shown without the command to apply it. Added the corresponding `calicoctl apply` command.

## Review Notes
The port allow-list remains an example and should be adjusted for each cluster's Kubernetes topology, CNI mode, encapsulation mode, API server location, etcd topology, and operational access requirements before production use.
