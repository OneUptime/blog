# Validation Summary: How to Perform an Unattended RHEL Installation Using Kickstart

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Kickstart
- Anaconda installer
- pykickstart / ksvalidator
- systemd services
- OpenSSL password hashing
- Apache httpd and firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Automatically installing RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Red Hat Enterprise Linux 9 documentation: Kickstart commands and options reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/kickstart-commands-and-options-reference_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Boot options for RHEL Installer: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/boot_options_for_rhel_installer/index
- Anaconda upstream boot options documentation: https://anaconda-installer.readthedocs.io/en/latest/user-guide/boot-options.html
- pykickstart ksvalidator help output from a temporary local install
- Local OpenSSL `passwd -help` output

## Issues Found
- The boot parameters table used `inst.vnc.password=pass`, but the documented RHEL boot option is `inst.vncpassword=pass`. Updated the parameter name.
- The common `url` Kickstart example pointed at `/rhel9/BaseOS/`. RHEL installation sources should point at an installable tree that contains the installer metadata, so the example now points at `/rhel9/`.
- The `%pre` example comment said it wrote the selected disk to a file for partitioning, but the snippet only logged the selected disk. Updated the comment to match the code.

## Review Notes
- The primary Kickstart example and the combined Kickstart plus `%post` and `%pre` snippets validate successfully with `ksvalidator -v RHEL9` from a temporary pykickstart install.
- Red Hat notes that `ksvalidator` checks syntax and deprecated options, but does not guarantee that `%pre`, `%post`, or `%packages` contents will succeed in every environment.
- The examples use `sda` and interface name `ens192`, which are valid examples but should be adjusted for real hardware. Red Hat recommends persistent device names where stable disk targeting is required.
