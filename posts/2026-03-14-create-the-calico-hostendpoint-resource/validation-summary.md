# Validation Summary: Creating the Calico HostEndpoint Resource in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico HostEndpoint resources
- Kubernetes custom resources
- kubectl
- calicoctl
- Kubernetes labels

## Sources Consulted
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host endpoint object guide: https://docs.tigera.io/calico/latest/reference/host-endpoints/objects
- Calico resource definitions reference: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico API server installation and kubectl API availability reference: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes labels and selectors reference: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The manifest values were described as "sensible defaults", but the Calico HostEndpoint fields in the example are environment-specific values, not defaults. Changed the wording to describe them as concrete example values.
- The post claimed `calicoctl` catches schema errors that `kubectl` would miss. Official Calico docs describe `calicoctl apply` as the native apply command for Calico resources, but do not support that stronger comparison. Reworded this to avoid overstating the validation behavior.
- The verification command for describing the specific HostEndpoint omitted the resource name. Added `worker1-eth0` so it describes the resource created by the example.
- The troubleshooting section described `expectedIPs` as valid CIDRs, but Calico documents `expectedIPs` as a list of valid IPv4 or IPv6 addresses. Updated the wording accordingly.
- The troubleshooting section suggested checking for the Calico API server with a generic pod listing in `calico-system`. Replaced it with `kubectl api-resources | grep projectcalico.org`, which directly checks whether the Calico APIs are available to `kubectl`.
- The label example used Kubernetes node labels while describing labels on Calico resources. Changed the example to label the HostEndpoint resource itself and verify HostEndpoint labels.
- The naming guidance said only lowercase letters, numbers, and hyphens are allowed. Calico resource docs allow alphanumeric characters with optional dots, underscores, and hyphens. Updated the guidance.

## Review Notes
The HostEndpoint manifest structure, `apiVersion`, `kind`, `node`, `interfaceName`, and `expectedIPs` fields align with the current Calico HostEndpoint resource reference. The warning about traffic being denied without suitable policy or profiles is consistent with Calico's documented default behavior for host endpoints, with failsafe rules still applying.
