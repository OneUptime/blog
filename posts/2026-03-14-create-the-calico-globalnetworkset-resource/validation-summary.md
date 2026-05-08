# Validation Summary: Creating the Calico GlobalNetworkSet Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkSet
- Calico `projectcalico.org/v3` resources
- Kubernetes custom resources
- `kubectl`
- `calicoctl`
- Calico IPAM, Felix, Typha, and calico-node diagnostics

## Sources Consulted
- Calico GlobalNetworkSet resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico resource definitions reference: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico API server and `kubectl` support: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico native `projectcalico.org/v3` CRDs: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl validate` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico `calicoctl node` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The prerequisites implied `kubectl` could always manage `projectcalico.org/v3` resources. Added the requirement for the Calico API server or native `projectcalico.org/v3` CRDs when using `kubectl`, matching Calico's documented access model.
- The manifest text described example values as defaults. Changed this to "sensible example value" because the CIDRs and labels are examples, not defaulted fields.
- The `calicoctl apply` section claimed validation behavior too broadly. Added `calicoctl validate -f globalnetworkset.yaml` and described its documented offline structural and Calico-specific validation.
- The `kubectl describe` command said it described the specific resource but omitted the resource name. Added `trusted-external-networks`.
- The troubleshooting check for missing resources pointed to a broad pod listing as a Calico API server check. Replaced it with `kubectl api-resources | grep '\sprojectcalico.org'`, which directly verifies that the Calico API group is available to `kubectl`.
- The labels example labeled Kubernetes nodes, which does not demonstrate selecting a GlobalNetworkSet in policy. Changed it to label the GlobalNetworkSet resource itself and verify those labels.
- The calico-node log command assumed the operator namespace without context. Added a note that `calico-system` applies to operator installs and should be adjusted for other installations.

## Review Notes
- The GlobalNetworkSet manifest uses the documented `apiVersion`, `kind`, `metadata.labels`, and `spec.nets` fields, and the CIDR examples are syntactically valid documentation ranges.
- The post does not show a GlobalNetworkPolicy that consumes the GlobalNetworkSet labels. The creation flow is still technically correct, but a future improvement could show the policy selector that makes the network set operationally useful.
