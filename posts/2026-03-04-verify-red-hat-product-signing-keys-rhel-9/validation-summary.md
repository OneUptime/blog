# Validation Summary: How to Verify Red Hat Product Signing Keys on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RPM package signing and verification
- DNF repository configuration
- GnuPG/OpenPGP keys
- Red Hat product signing keys
- EPEL repository signing keys

## Sources Consulted
- Red Hat Product Signing Keys: https://access.redhat.com/security/team/key
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/index
- Red Hat Customer Portal solution for repo_gpgcheck support: https://access.redhat.com/solutions/2850911
- DNF Configuration Reference: https://dnf.readthedocs.io/en/stable/conf_ref.html
- DNF config-manager plugin documentation: https://dnf-plugins-core.readthedocs.io/en/stable/config_manager.html
- RPM query format documentation: https://rpm.org/docs/latest/man/rpm-queryformat.7
- RPM keys documentation: https://rpm-software-management.github.io/rpm/man/rpmkeys.8
- GnuPG command documentation: https://gnupg.org/documentation/manuals/gnupg/Operational-GPG-Commands.html

## Issues Found
- The post described the FD431D51 fingerprint as the single current RHEL 9 release key fingerprint. Red Hat now also documents release key 4 for newer RHEL 9.7+ RPM signing, so the text was updated to identify release key 2 accurately and to mention the newer release key 4 fingerprint.
- The list of typical RHEL key files omitted the newer post-quantum Red Hat release key file used on newer RHEL 9 systems. Added `RPM-GPG-KEY-PQC-redhat-release`.
- The command for finding packages without recorded PGP signature metadata searched for lines not containing `key id`, which is fragile because RPM's `:pgpsig` formatter can display signature fingerprints and timestamps rather than that exact phrase. Updated it to detect RPM's `(none)` placeholder.
- The sample verification script claimed to verify all package signatures, but it only audits key files, repository settings, and installed package signature metadata. Updated the comment to avoid overstating what the script does.
- The bad `rpm --checksig` example described the output as applying to unsigned packages as well as bad signatures. RPM reports class-level digest and signature status, and missing keys can appear separately as `NOKEY`; the wording was tightened to "bad or untrusted signature."

## Review Notes
The commands and configuration examples are otherwise consistent with RHEL/RPM/DNF documentation. The `dnf config-manager` example assumes the `dnf-plugins-core` config-manager plugin is installed, which is a normal prerequisite for that command.
