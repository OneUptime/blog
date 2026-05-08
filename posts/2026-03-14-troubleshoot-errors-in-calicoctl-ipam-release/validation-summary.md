# Validation Summary: Troubleshooting Errors in calicoctl ipam release

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
- Kubernetes CustomResourceDefinitions

## Sources Consulted
- Calico documentation: calicoctl ipam release - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Kubernetes datastore setup - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico documentation: calico/node RBAC and IPAM CRD resource names - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico documentation: IPAM configuration resource - https://docs.tigera.io/calico/latest/reference/resources/ipamconfig

## Issues Found
- The RBAC example used `ipamconfigurations` as the Kubernetes CRD resource name. Calico's Kubernetes CRD resource name is `ipamconfigs`, so the ClusterRole, CRD checklist, and diagnostic script were updated accordingly.
- The RBAC example only defined a ClusterRole. A ClusterRole alone does not grant permissions until it is bound, so a ClusterRoleBinding example was added with a placeholder subject to replace for the user, group, or service account running `calicoctl`.
- The invalid input section described CIDR values as valid for `calicoctl ipam show --ip`. Official `calicoctl ipam show` help documents `--ip=<IP>` for a specific IP address, so the CIDR example and table wording were corrected.

## Review Notes
The post is generally accurate for Calico Open Source 3.32-era `calicoctl` behavior. In practice, `calicoctl ipam release` should only be used for addresses from endpoints that were not cleanly removed, because the command releases the address from Calico IPAM but does not remove it from any endpoint still using it.
