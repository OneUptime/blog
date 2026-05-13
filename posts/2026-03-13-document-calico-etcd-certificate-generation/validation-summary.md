# Validation Summary: Document Calico etcd Certificate Generation for Operators

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- etcd
- TLS and X.509 certificates
- OpenSSL
- cert-manager
- HashiCorp Vault

## Sources Consulted
- Calico documentation: Configure encryption and authentication to secure Calico components, https://docs.tigera.io/calico/latest/network-policy/comms/crypto-auth
- Calico documentation: Generating certificates for etcd RBAC, https://docs.tigera.io/calico/latest/reference/etcd-rbac/certificate-generation
- Calico documentation: Segmenting etcd on Kubernetes, https://docs.tigera.io/calico/latest/reference/etcd-rbac/kubernetes
- Calico documentation: Customizing your installation, https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Calico documentation: Configure calicoctl to connect to an etcd datastore, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Kubernetes kubectl get reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes JSONPath reference, https://kubernetes.io/docs/reference/kubectl/jsonpath/
- OpenSSL req manual, https://docs.openssl.org/3.4/man1/openssl-req/
- OpenSSL x509 manual, https://docs.openssl.org/3.3/man1/openssl-x509/
- cert-manager Certificate resource documentation, https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The post scope could be misread as applying to Calico operator-based installations. Official Calico documentation states that operator-based installations do not require direct communication to etcd, so I changed the description and prerequisite wording to scope the guide to deployments that use the etcd datastore.
- The emergency runbook used `calico-etcd-certs`, while Calico's documented self-managed Kubernetes manifest uses the Secret name `calico-etcd-secrets` with `etcd-key`, `etcd-cert`, and `etcd-ca` fields. I updated the example expiry check to use `calico-etcd-secrets`.

## Review Notes
The OpenSSL commands use valid current flags for generating an EC key, creating a CSR, signing a CSR with a CA, verifying the resulting certificate, and printing the certificate expiration date. The example remains intentionally generic; production runbooks should also document the exact etcd username and role mapping required for each certificate common name.
