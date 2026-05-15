# Validation Summary: How to Manage RPM Packages Directly with the rpm Command on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RPM Package Manager
- DNF package management
- RPM package querying, verification, signature checking, installation, upgrade, freshen, and removal
- rpm2cpio and cpio package extraction

## Sources Consulted
- RPM upstream rpm(8) manual: https://rpm.org/docs/4.19.x/man/rpm.8.html
- RPM upstream rpmkeys(8) manual: https://rpm.org/docs/4.19.x/man/rpmkeys.8.html
- RPM upstream signatures and digests documentation: https://rpm-software-management.github.io/rpm/manual/signatures_digests.html
- Red Hat Enterprise Linux 9 Packaging and distributing software documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/packaging_and_distributing_software/index
- Red Hat Enterprise Linux 9 Managing software with the DNF tool documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/index
- Red Hat Customer Portal RPM database backup article: https://access.redhat.com/articles/2581

## Issues Found
- The RPM verify output table described `5` as "MD5 checksum changed." Current RPM documentation describes this as a file digest mismatch, formerly an MD5 sum mismatch. Updated the table entry to "File digest changed" to be accurate for modern RPM/RHEL 9.

## Review Notes
The remaining commands and explanations match the documented rpm behavior for install, upgrade, freshen, query, verify, erase, dependency-check bypassing with `--nodeps`, signature checking, and RPM database rebuilding. The `rpm -Va | grep -v "^$"` example is redundant because `rpm -Va` normally prints discrepancies only, but it is not technically incorrect.
