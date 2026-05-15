# Validation Summary: How to Migrate Identity Management from RHEL 8 to RHEL

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Red Hat Enterprise Linux 8 and 9
- Red Hat Identity Management (IdM)
- FreeIPA
- Kerberos
- 389 Directory Server replication
- IdM integrated DNS and certificate authority services
- SSSD

## Sources Consulted
- Red Hat Enterprise Linux 9: Migrating your IdM environment from RHEL 8 servers to RHEL 9 servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/migrating_to_identity_management_on_rhel_9/assembly_migrating-your-idm-environment-from-rhel-8-servers-to-rhel-9-servers_migrating-to-idm-on-rhel-9
- Red Hat Enterprise Linux 9: Preparing the system for IdM server installation, including package repositories and port requirements: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_identity_management/preparing-the-system-for-ipa-server-installation_installing-identity-management
- Red Hat Enterprise Linux 9: Installing an IdM replica: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_identity_management/installing-an-ipa-replica_installing-identity-management
- Red Hat Enterprise Linux 9: Managing certificates in IdM, CA renewal server and CRL generation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_certificates_in_idm/ipa-ca-renewal_managing-certificates-in-idm
- Red Hat Enterprise Linux 9: Generating CRL on the IdM CA server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_certificates_in_idm/generating-crl-on-the-idm-ca-server_managing-certificates-in-idm
- Red Hat Enterprise Linux 9: Performing disaster recovery with Identity Management, backup and restore procedures: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/performing_disaster_recovery_with_identity_management/performing_disaster_recovery_with_identity_management

## Issues Found
- The target version was repeatedly written as generic "RHEL" instead of "RHEL 9". Updated the title, description, overview, headings, and affected wording so the migration target is explicit.
- The prerequisites referenced the RHEL 8 `idm:DL1` module for the new system. RHEL 9 IdM server packages are installed from BaseOS/AppStream repositories, so the prerequisite was corrected.
- The prerequisite port list omitted port 80 and DNS port 53 for integrated DNS, and the pitfalls section incorrectly implied ports 8080 and 8443 should be opened. Updated the port guidance to match Red Hat's RHEL 9 IdM port requirements.
- The post included a separate `ipa-server-ca` package installation step. Red Hat's RHEL 9 replica flow uses `ipa-server`/`ipa-server-dns` packages and the `--setup-ca` replica installer option, so the separate package command was removed.
- The `ipa-replica-install` example used `--no-forward-policy`, which is not a documented RHEL 9 option. Removed that option and kept the documented `--forwarder` form.
- Replication verification relied on a low-level `dsconf` example that did not match the recommended RHEL 9 migration verification flow. Replaced it with `ipa-healthcheck` replication checks and `ipa-csreplica-manage list --verbose` for CA replication details.
- The CA renewal master migration omitted the certificate updater task changes required when moving the CA renewal role. Added the RHEL 9 enable and RHEL 8 disable steps for `ca.certStatusUpdateInterval`.
- The CRL migration enabled CRL generation on the new replica before disabling it on the old server. Reordered the commands to stop CRL generation on RHEL 8 first, then enable it on RHEL 9 so only one CRL publisher is active.
- Client update guidance only mentioned `/etc/ipa/default.conf`. Added `/etc/sssd/sssd.conf` because Red Hat documents pinned clients in both files.

## Review Notes
The guide is technically relevant and salvageable. For complex or large deployments, Red Hat also recommends recording server roles, replication topology, and DNA ID ranges before decommissioning old servers; the post now mentions Healthcheck but still intentionally keeps the broader planning detail concise.
