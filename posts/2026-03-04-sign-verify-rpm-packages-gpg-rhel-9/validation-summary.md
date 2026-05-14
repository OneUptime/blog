# Validation Summary: How to Sign and Verify RPM Packages with GPG on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RPM and rpmsign
- GnuPG / GPG
- DNF repository configuration
- RPM package signature verification

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Packaging and distributing software": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/packaging_and_distributing_software/packaging_and_distributing_software
- rpm.org / man7.org rpmsign(8) manual: https://man7.org/linux/man-pages/man8/rpmsign.8.html
- rpm.org rpmkeys(8) manual: https://rpm.org/docs/4.19.x/man/rpmkeys.8.html
- rpm.org rpm(8) manual: https://rpm.org/docs/4.20.x/man/rpm.8
- DNF configuration reference: https://dnf.readthedocs.io/en/stable/conf_ref.html
- GnuPG manual, passphrase and pinentry behavior: https://www.gnupg.org/documentation/manuals/gnupg/

## Issues Found
- The RPM macro example overrode the low-level `%__gpg_sign_cmd` command with an invalid duplicated `gpg` token and legacy signing flags. Replaced it with the RHEL 9 documented `%_gpg_name` configuration, which is the required macro for selecting the signing key.
- The non-interactive signing example implied that piping a passphrase into `rpm --addsign` would unlock the signing key. RPM invokes GPG/pinentry for signing, so stdin piping is not reliable. Updated the example to pass loopback pinentry options through `_gpg_sign_cmd_extra_args` and read the passphrase from a secured file.
- The "Verify All Installed Packages" subsection described `rpm -Va --nofiles --nodigest` as signature verification. `rpm -V` verifies installed files against RPM database metadata, not package-file signatures, and `--nofiles` disables file verification. Renamed the subsection and corrected the command to `rpm -Va`.
- The CI/CD signing script defined `GPG_NAME` but did not use it. Updated the `rpm --addsign` command to define `_gpg_name` from that variable.

## Review Notes
- The package-file signing and checking commands (`rpm --addsign`, `rpm --resign`, `rpm --checksig`, and `rpm -K --verbose`) match RHEL/RPM documentation.
- The DNF repository settings using `gpgcheck=1` and `gpgkey=file:///...` are valid for package signature enforcement. Repository metadata signing would additionally require `repo_gpgcheck=1` and signed repository metadata, but that is outside the post's stated package-signing workflow.
