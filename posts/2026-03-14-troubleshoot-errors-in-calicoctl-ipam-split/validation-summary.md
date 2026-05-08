# Validation Summary: Troubleshooting Errors in calicoctl ipam split

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico IPAM
- Kubernetes
- Kubernetes RBAC

## Sources Consulted
- Calico Open Source `calicoctl ipam split` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/split
- Calico `calicoctl ipam show` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico `calicoctl` installation and API group notes: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico Kubernetes datastore configuration for `calicoctl`: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico Kubernetes hard-way RBAC example for IPAM resources: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico IPAM configuration resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipamconfig

## Issues Found
- The post did not mention that `calicoctl ipam split` availability is version-dependent. Updated the prerequisite to require a Calico IPAM version that supports `calicoctl ipam split`.
- The verification command used `calicoctl ipam split 10.244.0.0/24 --cidr-size=26`, but official syntax is `calicoctl ipam split <NUMBER> --cidr=<CIDR>` or `--name=<POOL_NAME>`. Replaced it with `calicoctl ipam split --cidr=10.244.0.0/24 4`.
- The post omitted the required datastore lock and unlock around `ipam split`. Added `calicoctl datastore migrate lock` and `calicoctl datastore migrate unlock` to the verification workflow and prerequisite list.
- The RBAC snippet used `ipamconfigurations` in the internal `crd.projectcalico.org` API group, but Calico's internal CRD plural is `ipamconfigs`. Updated the RBAC snippet, CRD check, and diagnostic script accordingly.
- The RBAC instructions created a ClusterRole without binding it to the identity running `calicoctl`. Added a matching `kubectl create clusterrolebinding` example.
- The invalid input examples used `calicoctl ipam show --ip=192.168.0.0/16`, but `--ip` accepts a single IP address, not a CIDR. Updated the CIDR example to use `calicoctl ipam split --cidr=192.168.0.0/16 2`.
- The CRD verification command only grepped for `ipam`, so it would miss `blockaffinities` and `ippools`. Updated it to include those CRDs.

## Review Notes
The Calico documentation warns not to modify resources in the `crd.projectcalico.org` API group directly because they are internal backing resources. The post only uses these resources for RBAC and existence checks, which is acceptable for troubleshooting, but future revisions could prefer `calicoctl` and documented `projectcalico.org/v3` APIs for resource management examples. Current Calico Open Source 3.32 documentation includes `calicoctl ipam split`; older versions may not.
