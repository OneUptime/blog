# Validation Summary: How to Rotate etcd Client and Peer Certificates Without Losing Quorum

## Status
validated

## Post Type
Guide with operational commands and TLS configuration examples.

## Technologies Covered
- etcd 3.6 and 3.7, etcdctl, Raft voting quorum, and RBAC
- TLS, X.509 certificates, certificate authorities, SANs, and extended key usages
- OpenSSL certificate inspection and verification
- Linux systemd services and journal logs

## Sources Consulted
- etcd transport security: https://etcd.io/docs/v3.7/op-guide/security/
- etcd configuration options: https://etcd.io/docs/v3.6/op-guide/configuration/
- etcd runtime reconfiguration: https://etcd.io/docs/v3.7/op-guide/runtime-configuration/
- etcd cluster status checks: https://etcd.io/docs/v3.6/tasks/operator/how-to-check-cluster-status/
- Official etcdctl 3.6 command reference: https://raw.githubusercontent.com/etcd-io/etcd/release-3.6/etcdctl/README.md
- OpenSSL verify: https://docs.openssl.org/3.0/man1/openssl-verify/
- OpenSSL x509: https://docs.openssl.org/3.0/man1/openssl-x509/
- OpenSSL pkey: https://docs.openssl.org/3.0/man1/openssl-pkey/
- OpenSSL dgst: https://docs.openssl.org/3.0/man1/openssl-dgst/
- OpenSSL s_client: https://docs.openssl.org/3.0/man1/openssl-s_client/
- Official systemctl manual source: https://raw.githubusercontent.com/systemd/systemd/main/man/systemctl.xml
- Official journalctl manual source: https://raw.githubusercontent.com/systemd/systemd/main/man/journalctl.xml

## Issues Found
1. The etcdctl examples did not configure TLS credentials or all voting endpoints. Added the required environment-variable setup prerequisite so the health and status commands target all three HTTPS endpoints with existing administrative credentials instead of relying on the default local endpoint.
2. The service restart example allowed changing certificate paths in unit files but omitted reloading systemd's unit definitions. Added `systemctl daemon-reload` with a comment identifying when it is needed, so modified units and drop-ins take effect before startup.
3. The fresh TLS test did not explain how to send an intermediate chain for the operator certificate. Added the conditional `-cert_chain operator-intermediates.pem` option; the earlier `-untrusted` guidance applies to `openssl verify`, not `s_client`.

## Review Notes
- Confirmed the listed etcd TLS options, peer identity checks, CN-based client identity behavior, and documented certificate reload behavior. Restarting to apply trust changes avoids depending on immediate trust-pool reloads.
- Confirmed that sequential maintenance with two functioning voters retains a majority in a three-voter cluster. Recovery checks before advancing and potential request retries remain necessary.
- Confirmed OpenSSL inspection flags, server/client purpose verification, hostname checking, DER public-key digest comparison, and fresh-connection verification options against OpenSSL 3.0 documentation.
- The referenced etcd 3.6 and 3.7 documentation URLs resolve to the intended resources. The systemd rendered manual pages were unavailable through the browser tool, so their official upstream manual sources were consulted instead.
- Reviewed the commands against documentation and checked Bash syntax. No live etcd cluster, deployment PKI, or Linux service was supplied, so certificate rotation, quorum recovery, and application access were not tested end to end.
- Installation paths, intermediate chains, application reconnection, and rollback remain deployment-specific as stated in the post. No deprecated command options were identified in the examples reviewed.
