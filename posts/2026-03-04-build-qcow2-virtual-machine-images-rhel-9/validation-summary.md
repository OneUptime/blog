# Validation Summary: How to Build QCOW2 Virtual Machine Images for RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL Image Builder
- osbuild-composer
- composer-cli
- Cockpit web console
- QCOW2 images
- KVM and OpenStack

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Installing RHEL image builder": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/installing-composer_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation, "Creating system images by using RHEL image builder CLI": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation, "RHEL image builder output formats": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/composing_a_customized_rhel_system_image/index

## Issues Found
- The installation step installed `cockpit-composer` but did not start `cockpit.socket`, which Red Hat documents as required when using Image Builder through the web console. Added `sudo systemctl enable --now cockpit.socket`.
- The deployment step implied the generated QCOW2 image could be deployed directly to AWS, Azure, and VMware. Red Hat documents separate output types for those platforms, including `ami`, `vhd`, `vmdk`, and `ova`. Updated the sentence to scope QCOW2 deployment to KVM/OpenStack and direct readers to build the appropriate image type for other platforms.

## Review Notes
The `composer-cli` commands, `[[packages]]` blueprint entries, package version wildcard, and `[[customizations.user]]` structure match the RHEL 9 Image Builder documentation. The sample user has no password or SSH key, so it creates an account but does not provide a login method; this is valid because only `name` is mandatory, but a real deployable image should normally include a password hash or SSH key.
