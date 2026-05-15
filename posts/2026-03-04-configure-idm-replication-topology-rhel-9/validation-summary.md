# Validation Summary: How to Configure IdM Replication Topology on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management (IdM)
- FreeIPA replication topology
- 389 Directory Server replication
- IdM CLI tools (`ipa`, `ipa-replica-install`, `ipa-replica-manage`)
- Directory Server CLI tools (`dsconf`)

## Sources Consulted
- Red Hat Enterprise Linux 9: Installing Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_identity_management/installing_identity_management
- Red Hat Enterprise Linux 9: Planning Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/planning_identity_management/index
- Red Hat Enterprise Linux 9: Managing certificates in IdM: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_certificates_in_idm/ipa-ca-renewal_managing-certificates-in-idm
- Red Hat Enterprise Linux 9: Managing certificates in IdM, decommissioning CA renewal/CRL publisher roles: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/managing_certificates_in_idm/Red_Hat_Enterprise_Linux-9-Managing_certificates_in_IdM-en-US.pdf
- Red Hat Directory Server 13: Configuring and managing replication: https://docs.redhat.com/en/documentation/red_hat_directory_server/13/html-single/configuring_and_managing_replication/index
- Red Hat Directory Server 13: Solving common replication problems: https://docs.redhat.com/en/documentation/red_hat_directory_server/13/html/configuring_and_managing_replication/solving-common-replication-problems
- FreeIPA API documentation for `topologysuffix_verify`: https://freeipa.readthedocs.io/en/ipa-4-11/api/topologysuffix_verify.html
- FreeIPA managed topology release notes: https://www.freeipa.org/page/Releases/4.3.0

## Issues Found
- The package installation command included `ipa-server-ca`. Red Hat's RHEL 9 IdM installation documentation lists `ipa-server` for IdM server installation and `ipa-server ipa-server-dns` for installation with integrated DNS. I removed `ipa-server-ca` from the package install command.
- The replication conflict examples used raw `ldapsearch` and `ldapdelete`. Current Red Hat Directory Server documentation documents `dsconf repl-conflict list` and `dsconf repl-conflict delete` for identifying and resolving naming conflicts. I updated the commands to use `dsconf`.
- The CRL generator check used `ipa config-show | grep "CRL"`, but Red Hat documents `ipa-crlgen-manage status` as the way to determine whether the local CA server generates CRLs. I replaced the command.
- The server-removal command comment said to move any special roles while showing only the CA renewal master command. I narrowed the comment to identify it as an example for the CA renewal master role.

## Review Notes
The post is technically valid after the fixes. In a future revision, it could add a short prerequisite note that `--setup-ca` is appropriate when the deployment uses an integrated CA and the new replica should host the CA role.
