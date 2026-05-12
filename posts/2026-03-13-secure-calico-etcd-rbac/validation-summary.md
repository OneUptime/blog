# Validation Summary: Secure Calico etcd RBAC

## Status
validated

## Post Type
Guide / Hardening Tutorial

## Technologies Covered
- Calico (projectcalico.org/v3)
- etcd v3.x with RBAC and TLS
- Kubernetes
- OpenSSL (PKI / certificate generation)
- cert-manager (cert-manager.io/v1)
- Calico GlobalNetworkPolicy

## Sources Consulted
- Calico etcd RBAC and etcdv3 key paths reference — https://docs.tigera.io/calico/latest/reference/etcd-rbac/calico-etcdv3-paths
- Calico etcd RBAC operations docs — https://docs.tigera.io/calico/latest/operations/clusters/etcd/etcd-rbac
- Calico GlobalNetworkPolicy reference — https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- cert-manager Certificate resource docs — https://cert-manager.io/docs/usage/certificate/
- OpenSSL `req`/`x509`/`genrsa` manual pages
- etcd v3 RBAC documentation — https://etcd.io/docs/v3.5/op-guide/authentication/

## Issues Found
- **Outdated etcd key paths in the mermaid diagram (Hardening Practice 2).** The original diagram used Calico v1/v2 (etcdv2) paths such as `/calico/v1/host/`, `/calico/v1/policy/`, `/calico/v1/config/`, and `/calico/v1/ipam/`. These paths do not exist in modern Calico v3 with the etcdv3 datastore, which the post explicitly references in its prerequisites ("etcd v3.x with RBAC and TLS enabled"). I replaced them with the correct Calico v3 paths per the official reference:
  - Felix RW: `/calico/resources/v3/projectcalico.org/workloadendpoints/`, `/calico/felix/v1/`
  - Felix RO: `/calico/resources/v3/projectcalico.org/networkpolicies/`, `/calico/resources/v3/projectcalico.org/clusterinformations/`
  - calico-cni RW: `/calico/ipam/v2/`, `/calico/resources/v3/projectcalico.org/workloadendpoints/`
  - calico-cni RO: `/calico/resources/v3/projectcalico.org/ippools/`

  Note that `/calico/felix/v1/` retains the `v1` prefix even under Calico v3 — this is correct, as it is the Felix-internal state subtree.

## Review Notes
- The OpenSSL commands are syntactically valid. For a strict production CA, you may want to add `-addext "basicConstraints=critical,CA:TRUE,pathlen:0"` to the CA cert generation and `-addext "extendedKeyUsage=clientAuth"` to the leaf cert signing — some clients require these. This is a hardening refinement, not a correctness issue.
- The cert-manager `Certificate` resource is correct against `cert-manager.io/v1` (GA). For client certs, cert-manager docs recommend setting `usages: ["client auth"]` explicitly and migrating from `commonName` to `dnsNames` (or `subject` only). Not strictly required but a future-proofing improvement.
- The Calico `GlobalNetworkPolicy` example is valid v3 API. For it to apply to host traffic (etcd on control-plane nodes), there must be matching `HostEndpoint` resources defined with the `node-role` label. The post hints at this ("host endpoint policies"), but it would benefit from an explicit pointer that `GlobalNetworkPolicy` only acts on hosts that have `HostEndpoint` objects configured.
- The conceptual security guidance (cert-based auth, least privilege, short-lived certs with rotation, dedicated etcd cluster, network restrictions) is sound and aligned with general Kubernetes/etcd hardening best practices.
