# Validation Summary: Creating the Calico IPReservation Resource in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico IPAM
- Calico `IPReservation` resources
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico IP reservation resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico `calicoctl` user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico API server and kubectl management documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico native v3 CRDs documentation: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico v3.32 native CRD manifest for `ipreservations.projectcalico.org`: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/v3_projectcalico_org.yaml

## Issues Found
- The post implied `kubectl` can always manage `projectcalico.org/v3` resources. I clarified that `kubectl` requires either the Calico API server or native v3 CRDs.
- The example CIDRs were described as "sensible defaults." Calico does not provide defaults for `reservedCIDRs`; I changed this to state that they are examples that must match the user's IP pools.
- The verification command used the singular resource name for listing and omitted the resource name in the describe command. I changed the list command to `kubectl get ipreservations.projectcalico.org -o wide` and made the describe command target `reserved-ips`.
- The troubleshooting step said to check the Calico API server in `calico-system`. I corrected this to use `kubectl get tigerastatus apiserver` for operator installs or `kubectl get pods -n calico-apiserver` for manifest installs, and noted that native v3 CRDs do not require the aggregated API server.
- The troubleshooting advice suggested restarting `calico-node` when components do not pick up an IPReservation. IPReservation affects automatic IPAM allocation and does not release already allocated addresses, so I replaced this with guidance that matches Calico's documented behavior.
- The labels section implied `IPReservation` could be targeted with node labels. I clarified that `IPReservation` applies cluster-wide and used IP pools as the example of a resource that supports node-based targeting.
- The field description and validation notes implied only CIDR ranges were valid and mentioned irrelevant integer types. I updated them to match the Calico schema, which accepts valid IPv4 or IPv6 addresses and CIDRs as strings.
- The GitOps note referred only to Calico CRDs. I broadened it to Calico APIs or CRDs so it applies to both API-server-backed and native-CRD installations.

## Review Notes
The main manifest is syntactically valid for Calico `projectcalico.org/v3` `IPReservation`, and `reservedCIDRs` is the documented field. Calico documentation notes that IP reservations are intended for small numbers of addresses or CIDRs and can slow allocation if a significant portion of a pool is reserved; this could be added in a future editorial pass.
