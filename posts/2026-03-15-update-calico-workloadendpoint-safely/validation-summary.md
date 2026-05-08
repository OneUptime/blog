# Validation Summary: How to Update the Calico WorkloadEndpoint Resource Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico WorkloadEndpoint resources
- Calico Profiles
- Calico IPPools
- calicoctl
- Kubernetes kubectl
- Kubernetes networking

## Sources Consulted
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico resource definitions overview: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Kubernetes controllers configuration: https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration
- Calico Profile resource reference: https://docs.tigera.io/calico/latest/reference/resources/profile
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction implied manual WorkloadEndpoint updates are broadly appropriate in Kubernetes environments. Calico documentation says WorkloadEndpoint lifecycle is generally handled by orchestrator-specific plugins and recommends using `calicoctl` only to view this resource type. I clarified that Kubernetes pod WorkloadEndpoints are automatically managed and that manual updates apply to endpoints outside the Kubernetes pod lifecycle.
- The Profiles section described profiles as controlling default policy rules without caveat. Current Calico documentation says profiles primarily group endpoints for inherited labels and that profile ingress/egress rules are deprecated in favor of NetworkPolicy and GlobalNetworkPolicy. I changed the wording to mention shared labels and legacy profile rules.
- The conclusion said profile changes modify default security rules. I updated it to say profile changes modify inherited labels and any legacy profile rules, matching current Calico documentation.

## Review Notes
The WorkloadEndpoint YAML fields, API version, resource kind, calicoctl resource aliases, namespace flag usage, IPPool verification command, and kubectl exec resource syntax were consistent with current official documentation. The guide still uses shell `grep` checks for policy selectors and labels; those commands are syntactically valid but provide only a coarse operational check.
