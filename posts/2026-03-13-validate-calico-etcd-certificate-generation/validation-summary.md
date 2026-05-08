# Validation Summary: Validate Calico etcd Certificate Generation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes Secrets
- etcd
- TLS and mutual TLS
- X.509 certificates
- OpenSSL
- etcdctl
- kubectl

## Sources Consulted
- OpenSSL x509 manual: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSL pkey manual: https://docs.openssl.org/3.1/man1/openssl-pkey/
- etcd transport security model: https://etcd.io/docs/v3.6/op-guide/security/
- Calico certificate generation documentation: https://docs.tigera.io/calico/latest/reference/etcd-rbac/certificate-generation
- Calico Kubernetes etcd RBAC documentation: https://docs.tigera.io/calico/latest/reference/etcd-rbac/kubernetes
- Calico etcd datastore configuration documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes PKI certificates and requirements: https://kubernetes.io/docs/setup/best-practices/certificates/

## Issues Found
- The OpenSSL certificate inspection command used `openssl x509 ... -extensions`, which is not a certificate printing option. Replaced it with `-ext subjectAltName,keyUsage,extendedKeyUsage`, which is the documented way to print selected X.509 extensions.
- The certificate/key match check used RSA modulus extraction with `openssl x509 -modulus` and `openssl rsa -modulus`. This fails for non-RSA keys, while Calico's documented certificate generation example uses ECDSA keys. Replaced it with a public-key SHA-256 fingerprint comparison using `openssl x509 -pubkey` and `openssl pkey`, which works across key types supported by OpenSSL.
- The TLS handshake test verified certificate chain trust but did not check the etcd server hostname against the certificate SAN. Added `-verify_hostname etcd` to make the OpenSSL probe validate the endpoint identity as well as the CA chain.
- The Kubernetes Secret example used `calico-etcd-certs`; Calico's documented hosted manifest guidance uses the Secret name `calico-etcd-secrets` with `etcd-ca`, `etcd-cert`, and `etcd-key` entries. Updated the command to use `calico-etcd-secrets`.

## Review Notes
The examples assume a manifest-based Calico installation using an etcd datastore. Tigera's current Calico certificate-generation page notes that its etcd RBAC certificate guidance does not apply to operator installations. The `etcd` hostname in the OpenSSL and etcdctl commands should match a DNS SAN in the etcd server certificate, or be replaced with the actual endpoint hostname used by the deployment.
