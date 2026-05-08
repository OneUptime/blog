# Validation Summary: Creating the Calico IPAMConfiguration Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico IPAMConfiguration
- Kubernetes custom resources
- kubectl
- calicoctl
- Calico IPAM

## Sources Consulted
- Calico IPAMConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico resource definitions overview: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico API server / kubectl management documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico native v3 CRDs documentation: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico calicoctl overview: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl IPAM command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico IPAM concepts documentation: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses

## Issues Found
- Corrected the `strictAffinity` explanation. Official Calico docs describe this as preventing IP address borrowing when enabled, not simply assigning only from local blocks in all cases.
- Corrected the statement that both manifest values were defaults. `strictAffinity: false` is the default, but `maxBlocksPerHost` defaults to `20`; the example uses `4`.
- Clarified `calicoctl` versus `kubectl` validation. Official docs state that `calicoctl` provides validation/defaulting, while newer installations can rely on the Calico API server or native v3 CRDs for server-side validation.
- Made the `kubectl describe` example target the singleton resource name `default`.
- Replaced the generic Calico API server troubleshooting command with checks that match current Calico docs: `kubectl get tigerastatus apiserver` for aggregated API server installs and `kubectl api-resources` for native v3 CRDs.
- Corrected validation-error guidance to mention the actual IPAMConfiguration field types instead of unrelated CIDR values.
- Clarified that IPAMConfiguration is global and cannot be targeted by labels; node labels are relevant to other resources such as IPPools.
- Clarified that naming conventions apply to other Calico resources, because IPAMConfiguration must be named `default`.
- Replaced `calicoctl ipam check`, which is not listed in the current Calico Open Source IPAM command reference, with `calicoctl ipam show`.
- Updated the node status command to reflect the official guidance that `calicoctl node status` is run on a Calico node, commonly with `sudo`.
- Replaced an invalid HTTP health check against `kubernetes.default.svc` with a BusyBox `nslookup` command for cluster DNS and service-name resolution.
- Clarified the GitOps ordering guidance to require Calico API resources to be available, which covers both aggregated API server and native v3 CRD deployments.

## Review Notes
The core IPAMConfiguration manifest is valid for `projectcalico.org/v3`. The post still includes some broad operational sections that are only loosely related to creating the singleton IPAMConfiguration resource, but the technical claims and commands were corrected without restructuring the article.
