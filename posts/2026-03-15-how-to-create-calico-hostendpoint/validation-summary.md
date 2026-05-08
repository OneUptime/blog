# Validation Summary: How to Create the Calico HostEndpoint Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico HostEndpoint resources
- Calico GlobalNetworkPolicy
- Calico KubeControllersConfiguration
- Calico FelixConfiguration failsafe ports
- Kubernetes nodes and host interfaces
- `calicoctl` and `kubectl`

## Sources Consulted
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host endpoint objects guide: https://docs.tigera.io/calico/latest/reference/host-endpoints/objects
- Calico Kubernetes controllers configuration reference: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico Protect Kubernetes nodes guide: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico host endpoint forwarded traffic reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico failsafe rules reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/failsafe
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The automatic HostEndpoint example used `autoCreate: true`, but the current Calico `KubeControllersConfiguration` schema expects `autoCreate: Enabled` or `Disabled`. Updated the YAML snippet to use `Enabled`.
- The SSH policy was described as allowing SSH only from the management subnet. Calico's default inbound failsafe ports include TCP port 22, so other SSH sources can still be allowed regardless of policy until the failsafe configuration is narrowed or replaced. Updated the wording, added a caveat after the policy example, and clarified the unauthorized-source verification step.
- The conclusion suggested adding custom labels to auto-created HostEndpoints. Calico-managed automatic HostEndpoints are synchronized from node labels, so targeted policy should use Kubernetes node labels or configured HostEndpoint templates. Updated the conclusion to say to label Kubernetes nodes.

## Review Notes
The HostEndpoint and GlobalNetworkPolicy examples use current `projectcalico.org/v3` resources and valid fields. The policy example intentionally uses `applyOnForward: false`, which is appropriate for local host traffic such as SSH; forwarded traffic would require `applyOnForward: true`.
