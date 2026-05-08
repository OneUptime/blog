# Validation Summary: How to Secure Calicoctl etcd Configuration

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- Calico
- calicoctl
- etcd v3
- TLS and mutual TLS
- OpenSSL
- Unix file permissions

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to an etcd datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- etcd documentation: Transport security model - https://etcd.io/docs/v3.6/op-guide/security/
- etcd documentation: Role-based access control - https://etcd.io/docs/v3.6/op-guide/authentication/rbac/

## Issues Found
- The etcd RBAC example created a passwordless user named `calicoctl-user` while the generated client certificate used `CN=calicoctl`. etcd TLS Common Name authentication uses the client certificate CN as the etcd user name, so the user and certificate CN must match. Changed the user creation and role assignment commands to use `calicoctl`.
- The `role grant-permission` example placed `--prefix` after the key. Adjusted it to the documented etcdctl form, `--prefix=true`, before the permission type.

## Review Notes
- The calicoctl etcd configuration fields match the current Calico documentation.
- The guide assumes etcd is already configured with TLS, `--client-cert-auth`, a trusted CA, and, for RBAC enforcement, etcd authentication enabled with an administrative user available to create roles and users.
