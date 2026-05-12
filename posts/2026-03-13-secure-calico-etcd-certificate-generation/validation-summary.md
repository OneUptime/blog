# Validation Summary: Secure Calico etcd Certificate Generation

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- Calico
- Kubernetes
- etcd
- TLS / PKI
- OpenSSL
- HashiCorp Vault (PKI Secrets Engine)
- Kubernetes EncryptionConfiguration (encryption at rest)
- Certificate Revocation Lists (CRL)

## Sources Consulted
- etcd configuration flag reference: https://etcd.io/docs/v3.7/op-guide/configuration/
- etcd CRL support (issue/history): https://github.com/etcd-io/etcd/issues/4034
- HashiCorp Vault PKI secrets engine documentation (vault write pki/roles, key_type, key_bits, ext_key_usage, allow_bare_domains, allowed_domains, no_store, max_ttl)
- OpenSSL genrsa/ecparam/ca man pages (genrsa -aes256 -passout, ecparam -name secp384r1/prime256v1, ca -revoke / -gencrl)
- Kubernetes EncryptionConfiguration reference (apiserver.config.k8s.io/v1, aescbc provider)

## Issues Found
- **etcd CRL flag was incorrect.** The post used `--crl-file=...` on the etcd command, which is not a valid etcd flag. etcd exposes `--client-crl-file` (for client-facing TLS) and `--peer-crl-file` (for peer TLS); there is no unified `--crl-file`. Since the surrounding example pairs the flag with `--trusted-ca-file` (the client-facing trusted CA), the correct flag here is `--client-crl-file`. Updated the example accordingly.

## Review Notes
- The `aescbc` provider in the EncryptionConfiguration example is still supported, but `aesgcm` (or KMS providers) are generally recommended for new deployments. The example as written is technically valid and not incorrect, so it was left alone per the "only fix technical errors" rule.
- `openssl ecparam -genkey` produces an unencrypted EC private key on disk. Practice 2 only claims to generate keys (Practice 1 handles encryption), so this is accurate, but readers may want to additionally encrypt EC keys via `openssl ec -aes256 -in key -out key.enc` in production.
- The Vault PKI configuration uses `key_type=ec` with `key_bits=256`, which corresponds to P-256 and matches Vault's accepted values.
- The OpenSSL `-aes256` flag on `genrsa` is the modern equivalent of `-des3`/`-aes128` and is supported across current OpenSSL 1.1.x and 3.x releases.
- `apiserver.config.k8s.io/v1` is the correct stable API for `EncryptionConfiguration` on supported Kubernetes releases.
