# Validation Summary: How to Install an IdM Server with an External CA on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Identity Management (IdM)
- FreeIPA
- External certificate authorities
- firewalld
- PKI certificate renewal

## Sources Consulted
- Red Hat Enterprise Linux 9: Installing Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_identity_management/index
- Red Hat Enterprise Linux 8: Installing Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/installing_identity_management/installing_identity_management
- Red Hat Enterprise Linux 9: Managing certificates in IdM: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_certificates_in_idm/index
- Red Hat Customer Portal: Which network ports are used by Identity Management (IdM)?: https://access.redhat.com/solutions/357673
- FreeIPA Quick Start Guide: https://www.freeipa.org/page/Quick_Start_Guide

## Issues Found
- The prerequisite package commands mixed RHEL 8 module enablement with a direct package install. RHEL 8 documentation uses the `idm:DL1/dns` module profile for an IdM server with DNS, while RHEL 9 installs `ipa-server` and `ipa-server-dns` directly from the standard repositories. Updated the commands to show the correct RHEL 9 command and the separate RHEL 8 module-profile flow.
- The second `ipa-server-install` command resumed a non-interactive installation without repeating the required unattended inputs. Red Hat's non-interactive external CA example includes the certificate files along with required options such as realm, Directory Manager password, admin password, and unattended mode. Added those options to the resume command.
- The firewalld command used older service names such as `freeipa-ldap` and `freeipa-ldaps` plus individual protocol services. Current Red Hat documentation recommends the `freeipa-4` service, with `dns` added when integrated DNS is configured. Updated the command to `--add-service={freeipa-4,dns}`.
- The renewal section said to run `ipa-certupdate` on all clients only. Red Hat documentation instructs administrators to update all IdM servers and clients after renewing an externally signed IdM CA certificate. Updated the comment accordingly.

## Review Notes
- The external CA installation flow, `/root/ipa.csr` path, repeated `--external-cert-file` usage, `/var/lib/ipa/ca.csr` renewal CSR path, `ipa-cacert-manage renew --external-ca`, and `openssl x509 -issuer -subject` verification are technically consistent with Red Hat documentation.
- For Microsoft AD CS environments, Red Hat documents optional `--external-ca-type=ms-cs` and `--external-ca-profile` options. The post's generic CA flow is still valid without those options.
