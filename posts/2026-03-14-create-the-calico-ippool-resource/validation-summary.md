# Validation Summary: Creating the Calico IPPool Resource in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Calico
- Calico IPPool resources
- kubectl
- calicoctl
- GitOps tools such as Flux and Argo CD

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico multiple IP pools guide: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico overlay networking guide: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl configuration guide: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico API server installation guide: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico native v3 CRDs guide: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The post described `blockSize` as defaulting to 26 without noting that this is the IPv4 default. Updated the field description to include the IPv6 default of 122 from the Calico IPPool reference.
- The sample IPPool set both `ipipMode` and `vxlanMode`. Calico documents that these fields cannot be set at the same time, so the sample now keeps `ipipMode: Always` and omits `vxlanMode`.
- The post said all manifest fields were set to sensible defaults, but `ipipMode: Always` and `natOutgoing: true` are not the documented defaults. Updated the wording to call the manifest a common starting point and added a note not to set both encapsulation modes together.
- The `kubectl apply` guidance did not mention that managing `projectcalico.org/v3` resources with `kubectl` requires the Calico API server or native v3 CRDs. Updated the text to make that prerequisite explicit.
- The calicoctl validation explanation implied that `kubectl` generally lacks equivalent validation. Current Calico docs state that newer Calico API server and native v3 CRD modes provide server-side validation and defaulting, so the wording now distinguishes those cases.
- The verification command comment said it described a specific resource, but the command did not include the IPPool name. Updated it to `kubectl describe ippool.projectcalico.org default-ipv4-pool`.
- The troubleshooting section said to check the Calico API server in the `calico-system` namespace. Current Calico API server installation deploys it in `calico-apiserver`, and native v3 CRD mode may not run the aggregation API server. Updated the check to verify API resources first and, for API server mode, check `calico-apiserver`.

## Review Notes
The post is technically relevant and salvageable. The example uses IP-in-IP encapsulation, which is valid, but production clusters should choose IPIP, VXLAN, or no overlay based on their routing and platform requirements.
