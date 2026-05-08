# Validation Summary: Securing Calicoctl etcd Configuration

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- Calico Open Source and calicoctl
- etcd v3 datastore
- etcd TLS and role-based access control
- OpenSSL certificate generation and verification
- HashiCorp Vault KV secrets engine
- Bash scripting

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to an etcd datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: Generating certificates for etcd RBAC - https://docs.tigera.io/calico/latest/reference/etcd-rbac/certificate-generation
- Calico documentation: Segmenting etcd on Kubernetes - https://docs.tigera.io/calico/latest/reference/etcd-rbac/kubernetes
- Calico documentation: calicoctl get command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- etcd documentation: Role-based access control - https://etcd.io/docs/v3.6/op-guide/authentication/rbac/
- HashiCorp Vault documentation: KV command and mount flag syntax - https://developer.hashicorp.com/vault/docs/commands/kv
- HashiCorp Vault documentation: kv get command - https://developer.hashicorp.com/vault/docs/commands/kv/get
- HashiCorp Vault documentation: write command file value syntax - https://developer.hashicorp.com/vault/docs/commands/write
- OpenSSL local CLI: `openssl version`

## Issues Found
- The description referenced audit logging best practices, but the post does not cover audit logging. Removed that claim from the description.
- The example calicoctl config path used `/etc/calicoctl/calicoctl.cfg`, but the documented default config path is `/etc/calico/calicoctl.cfg`. Updated the path comment.
- The client certificate CN was `calicoctl` while the etcd RBAC user was `calico-operator`. etcd TLS Common Name authentication uses the client certificate CN as the etcd user. Updated the CN to `calico-operator` and added a short note explaining the requirement.
- The etcd RBAC example created `calico-operator` as a password user but did not configure calicoctl with an etcd username/password. Updated the user creation to `--no-password` so it matches TLS Common Name authentication.
- The `role grant-permission` command used a non-canonical placement of `--prefix`. Updated it to the documented `--prefix=true readwrite /calico/` form.
- The certificate rotation script wrote a predictable CSR path in `/tmp` and reused the old CN. Updated it to use `mktemp`, add restrictive `umask 077`, and keep the CN aligned with the etcd RBAC user.
- The rotation diagram said rotation occurred every 365 days, which can be too late for a 365-day certificate. Changed it to rotate before expiry.
- The Vault retrieval example wrote predictable certificate files under `/tmp` and then changed permissions after creation. Updated it to use `mktemp -d`, `umask 077`, the documented Vault `-mount=secret` syntax, and environment variables pointing at the temporary directory.
- The troubleshooting section suggested `--insecure-skip-tls-verify` for expired certificate diagnostics in a calicoctl context, but that is not a documented calicoctl etcd configuration option. Replaced it with certificate-chain verification guidance using OpenSSL.

## Review Notes
The remaining commands are environment-dependent and assume an etcd cluster already configured for client TLS authentication with the referenced CA, certificates, and endpoints. The post now aligns with current Calico and etcd documentation for calicoctl etcd configuration and etcd TLS Common Name RBAC.
