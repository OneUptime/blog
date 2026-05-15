# Validation Summary: How to Create a Kickstart File for Automated RHEL Installations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Kickstart
- Anaconda installer
- pykickstart, ksvalidator, and ksverdiff
- Linux shell scripting
- DNF, systemd, OpenSSH, and Red Hat Subscription Manager

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Automatically installing RHEL - Creating Kickstart files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index#creating-kickstart-files_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Kickstart commands and options reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/kickstart-commands-and-options-reference_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Kickstart script file format reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index#kickstart-script-file-format-reference_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Starting Kickstart installations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/starting-kickstart-installations_rhel-installer
- Pykickstart documentation: Kickstart sections and package selection: https://pykickstart.readthedocs.io/en/latest/sections.html
- Red Hat Enterprise Linux 6 documentation: pykickstart utilities and ksverdiff syntax: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/migration_planning_guide/sect-migration_guide-installation-graphical_installer-kickstart-pykickstart

## Issues Found
- The complete Kickstart example omitted the required `bootloader` directive. Added `bootloader --location=mbr --boot-drive=sda` to match the example's single-disk `sda` layout.
- The `%post` comment said `systemctl enable chronyd` would enable and start the service. Updated the comment to say it enables `chronyd` for first boot, which matches what the command does in a Kickstart post-install context.
- The SSH hardening `sed` commands only matched commented directives. Updated them to match either commented or uncommented `PermitRootLogin` and `PasswordAuthentication` lines.
- The `ksvalidator` command did not specify a RHEL syntax version. Updated it to `ksvalidator -v RHEL9 ks.cfg`, matching Red Hat's RHEL 9 guidance.
- The validation section implied `ksvalidator` fully checks the file. Added the official limitation that it checks syntax but does not prove `%pre`, `%post`, and `%packages` contents will succeed at install time.
- The `ksverdiff` comment was missing the target version in prose. Corrected it to say RHEL 8 to RHEL 9.

## Review Notes
The examples intentionally use placeholder IP addresses, hostnames, credentials, and password hashes. The disk examples assume a single target disk named `sda`; production Kickstart files should prefer persistent disk identifiers where hardware enumeration can vary.
