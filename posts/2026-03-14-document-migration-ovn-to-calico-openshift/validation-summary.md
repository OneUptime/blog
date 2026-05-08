# Validation Summary: How to Document Migration from OVN to Calico on OpenShift for Your Team

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenShift
- OVN-Kubernetes
- Calico
- Calico GlobalNetworkPolicy
- OpenShift EgressFirewall
- Kubernetes/OpenShift CLI commands
- Mermaid

## Sources Consulted
- Calico documentation: Migrate from OVN-Kubernetes CNI to Calico: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/ovn-to-calico
- Calico documentation: Install an OpenShift 4 cluster with Calico: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/installation
- Calico documentation: Global network policy resource: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Enterprise documentation: DNS policy: https://docs.tigera.io/calico-enterprise/latest/network-policy/domain-based-policy
- Calico documentation: Troubleshooting and diagnostics: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico documentation: calicoctl node status: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Red Hat OpenShift Container Platform Network APIs: EgressFirewall schema: https://docs.redhat.com/en/documentation/openshift_container_platform/4.12/pdf/network_apis/OpenShift_Container_Platform-4.12-Network_APIs-en-US.pdf

## Issues Found
- The ADR listed DNS-based egress policies as a generic Calico feature. Updated it to specify that DNS-based egress policy requires Calico Enterprise or Calico Cloud.
- The translation table mapped OpenShift `EgressFirewall` `dnsName` directly to Calico `destination.domains`. Updated the row to clarify that `destination.domains` applies to Calico Enterprise/Cloud egress Allow rules.
- The translation table mapped namespace-scoped EgressFirewall behavior only to `spec.namespaceSelector`. Added an example using the documented namespace label selector form.
- The key differences list implied `destination.domains` was available in Calico Open Source. Added a caveat that DNS-based egress policy is a Calico Enterprise and Calico Cloud feature.
- The BGP troubleshooting command used `birdcl` inside a `calico-node` pod. Replaced it with the officially documented `calicoctl node status` command.

## Review Notes
- Calico's current OVN-to-Calico migration tutorial states it was tested with OpenShift 4.16-4.18 and warns that the migration causes network disruption. Teams should pin their internal runbook to the exact OpenShift and Calico versions they test.
- Calico Open Source flow logs are documented as a tech preview feature in current Calico documentation, so compliance use cases should verify support and retention requirements for the deployed edition.
