# Validation Summary: How to Install an IdM Replica for High Availability on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux (RHEL)
- Red Hat Identity Management (IdM) / FreeIPA
- 389 Directory Server (LDAP backend)
- MIT Kerberos KDC
- Dogtag Certificate System (CA)
- BIND DNS
- firewalld
- dnf module streams (idm:DL1)

## Sources Consulted
- Red Hat documentation: Installing Identity Management — "Installing an IdM replica" (https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_identity_management/installing-an-ipa-replica_installing-identity-management)
- `ipa-replica-install(1)` man page
- `ipa-client-install(1)` man page
- `ipa-replica-manage(1)` man page
- Red Hat documentation: "Managing replication topology" — `ipa topologysegment-find` syntax
- FreeIPA project documentation (https://www.freeipa.org/page/Documentation)
- `ipa-healthcheck` documentation (https://github.com/freeipa/freeipa-healthcheck) — `ipahealthcheck.ds.replication` source
- firewalld services list for FreeIPA (freeipa-ldap, freeipa-ldaps, dns, kerberos, kpasswd, http, https)

## Issues Found
1. **Incorrect host context for `ipa-replica-install`**: The original post said "On the first IdM server, get a Kerberos ticket" before running `ipa-replica-install`. This is wrong — `ipa-replica-install` must be executed on the replica host, not on the existing IdM server. Updated the comments to clarify that `kinit admin` and `ipa-replica-install` are run on the replica host.

2. **Incorrect `ipa topologysegment-find` argument syntax**: The original used `ipa topologysegment-find suffix-name=domain` and `ipa topologysegment-find suffix-name=ca`. The correct CLI syntax takes the suffix name as a positional argument: `ipa topologysegment-find domain` and `ipa topologysegment-find ca`. The later use of `ipa topologysegment-find domain` in the Monitoring section was already correct, so the fix also makes the post internally consistent.

3. **Misleading package install comment**: The comment "Install IdM client packages first" preceded a `dnf install ipa-server ipa-server-dns` command, which installs server packages (correct — a replica is a full server). Updated the comment to "Install IdM server packages (a replica is a full IdM server)" to match what the command actually does.

## Review Notes
- The `dnf module enable idm:DL1` step is valid on RHEL 8 and still works on RHEL 9 where the `idm` module stream is retained for compatibility. Future RHEL versions may move away from module streams for IdM packages.
- `kinit -S idm2.example.com admin` uses `-S` to request a service ticket for a specific principal. As written it requests a ticket whose service principal is literally `idm2.example.com`, which is non-standard (typical service principals are formatted `service/host@REALM`, e.g. `host/idm2.example.com`). It will still exercise the replica's KDC for the AS-REQ, which is the author's intent (verifying the replica can issue tickets), so the command is functionally adequate for a smoke test but is not idiomatic.
- The firewalld brace-expansion form `--add-service={freeipa-ldap,...}` relies on bash brace expansion to emit multiple `--add-service` flags; this works in bash but would not work in shells without brace expansion (e.g., dash). For a RHEL system using bash this is fine.
- `ipa-replica-manage` is still supported but for RHEL 8/9 the recommended tooling for topology management is the `ipa topologysegment-*` family of commands. The post uses both, which is acceptable.
- The post does not mention time synchronization (chrony/NTP), which is a hard requirement for Kerberos to function across the replica. Worth adding in a future revision but not a correctness issue with the commands shown.
