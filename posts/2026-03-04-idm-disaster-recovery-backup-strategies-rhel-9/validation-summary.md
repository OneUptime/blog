# Validation Summary: How to Plan IdM Disaster Recovery and Backup Strategies on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management (IdM)
- FreeIPA backup and restore tools (`ipa-backup`, `ipa-restore`)
- IdM replica recovery and topology management
- IdM CA renewal server and CRL generation
- Cron, rsync, and scp for backup automation and transfer

## Sources Consulted
- Red Hat Enterprise Linux 9: Backing up and restoring IdM: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/planning_identity_management/backing-up-and-restoring-idm_planning-identity-management
- Red Hat Enterprise Linux 9: Performing disaster recovery with Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/performing_disaster_recovery_with_identity_management/performing_disaster_recovery_with_identity_management
- Red Hat Enterprise Linux 9: Recovering a single server with replication: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/performing_disaster_recovery_with_identity_management/recovering-a-single-server-with-replication_performing-disaster-recovery
- Red Hat Enterprise Linux 9: Using IdM CA renewal server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_certificates_in_idm/ipa-ca-renewal_managing-certificates-in-idm
- Red Hat Enterprise Linux 9: Generating CRL on the IdM CA server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_certificates_in_idm/generating-crl-on-the-idm-ca-server_managing-certificates-in-idm
- FreeIPA `ipa-backup` command reference: https://www.mankier.com/1/ipa-backup
- FreeIPA `ipa-restore` command reference: https://manpages.debian.org/experimental/freeipa-server/ipa-restore.1.en.html

## Issues Found
- The post stated that `ipa-backup --data` keeps services running. Red Hat documents that online data-only backups require both `--data` and `--online`; `--data` alone creates an offline data-only backup. Updated the data-only backup examples, automation script, and overview diagram to use `ipa-backup --data --online`.
- The post stated that backups are GPG-encrypted by default. Red Hat and FreeIPA documentation show encryption is optional and requires `ipa-backup --gpg`. Updated the text to describe the default backup directory and optional GPG encryption accurately.
- The full-restore section did not mention Red Hat's restore constraints. Added that a full restore must use a host with the same hostname, IP address, and IdM software version as the backed-up server.
- The complete infrastructure loss example told readers to reinitialize replicas after all IdM servers were lost. In that scenario, new replicas must be built from the restored master. Updated the example to install a new replica from the restored master.

## Review Notes
The remaining commands and claims are technically consistent with RHEL 9 IdM documentation. In production, replica installation examples should be adapted to the deployment's actual CA, KRA, DNS, forwarder, and topology requirements.
