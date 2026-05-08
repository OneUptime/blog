# Validation Summary: How to Troubleshoot Calicoctl etcd Configuration

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- etcd / etcdctl
- TLS certificates and mutual TLS
- OpenSSL
- curl
- Bash shell commands

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to an etcd datastore: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl node checksystem: https://docs.tigera.io/calico/latest/reference/calicoctl/node/checksystem
- Calico documentation: Calico key and path prefixes: https://docs.tigera.io/calico/latest/reference/etcd-rbac/calico-etcdv3-paths
- Calico documentation: Generating certificates for etcd RBAC: https://docs.tigera.io/calico/latest/reference/etcd-rbac/certificate-generation
- etcd documentation: How to check cluster status: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcd documentation: How to get keys by prefix: https://etcd.io/docs/v3.5/tutorials/how-to-get-key-by-prefix/
- etcd documentation: Transport security model: https://etcd.io/docs/v3.6/op-guide/security/
- etcd documentation: Configuration options: https://etcd.io/docs/v3.5/op-guide/configuration/

## Issues Found
- The post said all listed environment variables were required. Calico documents `DATASTORE_TYPE` as required for etcdv3 when using environment variables, while the TLS certificate variables are optional unless TLS or client certificate authentication is in use. Updated the wording to reflect this.
- The endpoint parsing command used `cut -d:` and would fail for bracketed IPv6 endpoints, which Calico documents as supported for `ETCD_ENDPOINTS`. Updated the Bash parsing to handle bracketed IPv6 addresses.
- The TLS chain verification section used `openssl verify` only against the client certificate, but the `x509: certificate signed by unknown authority` error commonly concerns the etcd server certificate chain. Clarified the client certificate check and added an `openssl s_client` server certificate verification command using the configured CA.
- The `calicoctl` debug command placed `--log-level` after the subcommand. Calico documents `--log-level` as a top-level option, so the command was changed to `calicoctl --log-level=debug get nodes`.
- The `tls: bad certificate` troubleshooting command only printed the certificate subject. Updated it to check the client certificate subject, expiration, and whether the private key matches the certificate public key. This better matches etcd's TLS client certificate authentication behavior.

## Review Notes
The post is technically relevant and the reviewed command set is broadly current for Calico Open Source 3.25+ and current Calico documentation. Future improvements could include examples for `ETCD_USERNAME` / `ETCD_PASSWORD` when etcd RBAC uses password authentication instead of client certificate identity.
