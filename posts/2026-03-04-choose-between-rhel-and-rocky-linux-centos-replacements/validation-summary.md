# Validation Summary: How to Choose Between RHEL and Rocky Linux for CentOS Replacements

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Rocky Linux
- CentOS Linux migration
- Red Hat Subscription Manager
- Convert2RHEL
- migrate2rocky
- DNF and EPEL repositories

## Sources Consulted
- Red Hat Developer, Red Hat Enterprise Linux access options: https://developers.redhat.com/products/rhel
- Red Hat Customer Portal, Simple Content Access: https://access.redhat.com/articles/simple-content-access
- Red Hat Documentation, Converting from a Linux distribution to RHEL using Convert2RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel
- Red Hat Customer Portal, Production Support Terms of Service: https://access.redhat.com/support/offerings/production/sla
- Rocky Linux official site: https://rockylinux.org/
- Rocky Linux documentation, Migrating to Rocky Linux: https://docs.rockylinux.org/guides/migrate2rocky/
- Red Hat Blog, Installing EPEL on RHEL and CentOS Stream: https://www.redhat.com/en/blog/install-epel-linux

## Issues Found
- The RHEL registration example used `subscription-manager attach --auto`. Red Hat documents that attach commands are obsolete and usually unnecessary under Simple Content Access, so the example now stops after registration and notes that extra repositories can be enabled when needed.
- The RHEL support description said paid RHEL includes 24/7 support and guaranteed security response times. Red Hat's support terms distinguish Standard and Premium support, with 24/7 coverage for Severity 1 and 2 issues under Premium. The wording was updated to match the tiered support model.
- The Convert2RHEL example installed `convert2rhel` directly without first configuring the Red Hat GPG key and Convert2RHEL repository file. The example now includes the documented setup steps for converting to RHEL 8.
- The EPEL example for RHEL omitted enabling CodeReady Linux Builder, which Red Hat documents as the first step before installing EPEL on RHEL 9. The command was added.
- The final RHEL Developer Subscription wording said "under 16 systems." Red Hat describes the no-cost individual entitlement as "up to 16," so the wording was corrected.
- The repository section said Rocky Linux mirrors the RHEL repository structure. This was softened to "follows the RHEL major-version repository layout closely enough" to avoid overstating exact repository identity.

## Review Notes
The Rocky Linux migration example is correct for Rocky Linux 8-style migrations. Rocky's current migration guide notes that version 9 systems should use `migrate2rocky9.sh`; the post's surrounding example uses Rocky/RHEL 9.3 elsewhere, so future revisions could clarify the version-specific script name if the migration section is expanded.
