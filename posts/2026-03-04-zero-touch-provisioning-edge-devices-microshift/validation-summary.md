# Validation Summary: How to Set Up Zero-Touch Provisioning for Edge Devices with MicroShift

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux for Edge
- RHEL Image Builder
- rpm-ostree
- Greenboot
- Podman
- Red Hat build of MicroShift 4.20
- Kickstart

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Composing, installing, and managing RHEL for Edge images: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/
- Red Hat Enterprise Linux 9 documentation: Automatically installing RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/
- Red Hat build of MicroShift 4.20 documentation: Getting ready to install MicroShift: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.20/html-single/getting_ready_to_install_microshift/
- Red Hat build of MicroShift 4.20 documentation: Installing with an RPM package: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.20/html-single/installing_with_an_rpm_package/installing_with_an_rpm_package

## Issues Found
- The post described the target as generic RHEL 9 while the MicroShift 4.20 documentation supports MicroShift 4.20 on RHEL 9.6. Updated the description, overview, and builder prerequisite to specify RHEL 9.6.
- The USB write command used `UUID-installer.iso`, but RHEL Image Builder downloads an `edge-installer` image as `UUID-boot.iso`. Updated the command to use `UUID-boot.iso`.
- The MicroShift 4.20 RPM install snippet omitted the EUS repositories and `subscription-manager release --set=9.6` release lock documented for this supported RHEL/MicroShift pairing. Added those commands.
- The MicroShift install snippet omitted the mandatory `firewalld` trusted-source rules needed when a firewall is enabled. Added the documented `firewall-cmd` commands behind a `firewalld` activity check so the snippet remains copyable on hosts without an active firewall service.

## Review Notes
The post remains a concise overview rather than a complete production zero-touch provisioning runbook. A future revision could include a Kickstart example and explicitly show how the OSTree repository is served before creating the installer ISO.
