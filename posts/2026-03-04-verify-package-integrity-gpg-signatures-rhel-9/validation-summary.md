# Validation Summary: How to Verify Package Integrity and GPG Signatures on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RPM package manager
- DNF repository configuration
- GnuPG / OpenPGP keys
- RPM package signing and verification

## Sources Consulted
- Red Hat Enterprise Linux 9 Packaging and distributing software: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/packaging_and_distributing_software/rpm-packaging-tools_introduction-to-rpm
- Red Hat Enterprise Linux 9 Security hardening, RPM package signature verification: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/verifying-rpm-packages-with-post-quantum-signatures_security-hardening
- Red Hat Enterprise Linux 9 Considerations in adopting RHEL 9, RPM changes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_software-management_considerations-in-adopting-rhel-9
- DNF Configuration Reference: https://dnf.readthedocs.io/en/stable/conf_ref.html
- RPM rpmkeys manual: https://rpm.org/docs/6.0.x/man/rpmkeys.8
- RPM verification output reference: https://ftp.rpm.org/max-rpm/s1-rpm-verify-output.html

## Issues Found
- The package signing overview said RPM checks signatures during installation without qualifying that GPG checking must be enabled. Updated the wording to make the condition explicit.
- The signing flow used `rpm --addsign` but did not mention that RHEL provides this option through the `rpm-sign` package. Added that prerequisite.
- The flowchart labelled a valid signature as "Safe to Install", which overstates what package signatures prove. Changed it to "Signature OK" because a valid signature verifies integrity and trusted origin, not whether the software is free of vulnerabilities or malicious upstream behavior.
- The RHEL key wording implied the key itself is always imported as a pre-installed RPM key. Adjusted the text to say RHEL ships Red Hat GPG key files and normally has required Red Hat keys available for package verification.

## Review Notes
- The `rpm --checksig`, `rpm -Kv`, `rpm -V`, `rpm -Va`, `rpm -qf`, `rpm --import`, `gpg --show-keys --with-fingerprint`, `gpg --export -a`, `gpgcheck`, `repo_gpgcheck`, `gpgkey`, and `localpkg_gpgcheck` examples were consistent with the RPM, DNF, GnuPG, and Red Hat documentation reviewed.
- `repo_gpgcheck=1` is technically correct where repository metadata signatures are published, but some third-party repositories do not provide signed metadata and need repository-specific handling.
