# Validation Summary: Troubleshoot Calico Host Endpoint Security

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico host endpoints
- Calico GlobalNetworkPolicy
- Calico Felix configuration and failsafe ports
- Kubernetes kubelet networking
- kubectl, calicoctl, iptables, curl

## Sources Consulted
- Calico HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host endpoint failsafe rules: https://docs.tigera.io/calico/latest/reference/host-endpoints/failsafe
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico FelixConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl delete command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Kubernetes Ports and Protocols reference: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes kubelet authentication/authorization reference: https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz

## Issues Found
- The post said Felix may drop all traffic after creating a HostEndpoint without sufficient allow policy. Calico documents that traffic is denied except for traffic allowed by failsafe rules, so the wording was corrected to include that exception.
- The kubelet health-check diagram described a blocked HostEndpoint policy as "Connection Refused." A policy drop commonly causes blocked or timed-out connectivity rather than a TCP refusal, so the label was changed to "Connection Blocked."
- The GlobalNetworkPolicy example allowed kubelet ports 10250 and 10255. Kubernetes documents 10250 as the kubelet API port, while 10255 is the unauthenticated read-only kubelet port and is deprecated/configuration-dependent. The example was narrowed to 10250.
- The failsafe command comment said it displayed current failsafe inbound ports. The JSONPath reads configured `FelixConfiguration` overrides; if the field is unset, Calico still applies documented defaults. The comment was corrected to "configured failsafe inbound port overrides."

## Review Notes
The post is version-neutral. Calico and Kubernetes defaults can vary by installation and kubelet configuration, especially around disabled or overridden failsafe and read-only kubelet ports, so production runbooks should confirm the effective configuration for the target cluster.
