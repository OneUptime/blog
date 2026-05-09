# Validation Summary: Troubleshoot Calico etcd RBAC

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- etcd v3
- etcd RBAC
- TLS client certificate authentication
- kubectl
- etcdctl

## Sources Consulted
- Calico Open Source documentation: Calico key and path prefixes, https://docs.tigera.io/calico/latest/reference/etcd-rbac/calico-etcdv3-paths
- Calico Open Source documentation: Segmenting etcd on Kubernetes, https://docs.tigera.io/calico/latest/reference/etcd-rbac/kubernetes
- Calico Open Source documentation: Generating certificates, https://docs.tigera.io/calico/latest/reference/etcd-rbac/certificate-generation
- Calico Open Source documentation: Configure calicoctl to connect to an etcd datastore, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- etcd documentation: Role-based access control, https://etcd.io/docs/v3.7/op-guide/authentication/rbac/
- etcd documentation: v3 API reference, https://etcd.io/docs/v3.6/dev-guide/api_reference_v3/

## Issues Found
- The introduction said Calico etcd RBAC issues could make "the API server" unresponsive. Calico components use the etcd datastore directly in this deployment mode, while the Kubernetes API server is only directly involved when it is itself configured to use the shared etcd datastore. Changed this to "Calico API queries may fail" to avoid implying that Calico component RBAC normally breaks kube-apiserver availability.
- The Felix policy troubleshooting section used `/calico/v1/policy/`, which does not match current Calico etcdv3 RBAC path documentation. Updated the diagnosis and grant command to use `/calico/resources/v3/projectcalico.org/`, the documented resource prefix Felix needs to read.
- The CNI IPAM resolution used `/calico/v1/ipam/`, which does not match current Calico etcdv3 RBAC path documentation. Updated it to `/calico/ipam/v2/`, the documented IPAM prefix for the CNI plugin.
- The direct etcd credential test used `/calico/v1/config/`, which does not match current Calico etcdv3 resource paths. Updated it to query `/calico/resources/v3/projectcalico.org/` with `--prefix`.

## Review Notes
The examples use `etcdctl ...` as a placeholder for endpoint, TLS, and root authentication flags. That is acceptable for a short troubleshooting post, but a future revision could define the placeholder once to reduce ambiguity.
