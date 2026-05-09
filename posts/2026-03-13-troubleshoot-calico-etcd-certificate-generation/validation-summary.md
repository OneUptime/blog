# Validation Summary: Troubleshoot Calico etcd Certificate Generation

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- etcd
- TLS and X.509 certificates
- OpenSSL
- cert-manager

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to an etcd datastore: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: Segmenting etcd on Kubernetes: https://docs.tigera.io/calico/latest/reference/etcd-rbac/kubernetes
- Calico documentation: Setting up etcd certificates for RBAC: https://docs.tigera.io/calico/latest/reference/etcd-rbac/overview
- Calico documentation: Generating certificates: https://docs.tigera.io/calico/latest/reference/etcd-rbac/certificate-generation
- Kubernetes kubectl reference for `create secret generic`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- etcd transport security model: https://etcd.io/docs/v3.3/op-guide/security/
- etcd configuration options: https://etcd.io/docs/v3.7/op-guide/configuration
- cert-manager cmctl documentation: https://cert-manager.io/docs/reference/cmctl/
- Local OpenSSL CLI help for `openssl x509`, `openssl pkey`, and `openssl sha256`.

## Issues Found
- The Kubernetes Secret name used for Calico etcd TLS material was `calico-etcd-certs`, but the Calico manifest documentation uses `calico-etcd-secrets` with `etcd-key`, `etcd-cert`, and `etcd-ca` fields. Updated the diagnosis and replacement secret commands to use `calico-etcd-secrets`.
- The server SAN mismatch resolution only wrote an OpenSSL extension file and did not show a command that applies it to the regenerated server certificate. Added the `openssl x509 -req` command with `-extfile etcd-san.conf -extensions v3_req`.
- The CA verification note stated that the client certificate issuer must match the subject of the CA etcd trusts. That is too narrow for intermediate CA chains. Changed it to say the issuer must chain to a CA certificate trusted by etcd.
- The certificate/key mismatch command used RSA modulus comparison, which only works for RSA keys. Replaced it with public-key SHA-256 comparison using `openssl pkey`, which works across common key types.
- The cert-manager force renewal command used an annotation update that is not the documented manual renewal mechanism. Replaced it with `cmctl renew calico-felix-etcd-cert -n kube-system`.

## Review Notes
The post assumes a Calico manifest-based etcd datastore deployment rather than an operator installation. That matches the Calico etcd TLS references consulted, but readers using operator-managed Calico or nonstandard secret names may need to adapt the object names.
