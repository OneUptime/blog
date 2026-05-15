# Validation Summary: How to Create VMDK Images for VMware from RHEL Image Builder

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
- VMware vSphere VMDK images

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Composing a customized RHEL system image - RHEL Image Builder description and output formats: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/
- Red Hat Enterprise Linux 9 documentation: Creating system images by using RHEL Image Builder CLI: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Installing RHEL Image Builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/composing_a_customized_rhel_system_image/Red_Hat_Enterprise_Linux-9-Composing_a_customized_RHEL_system_image-en-US.pdf

## Issues Found
- The compose example used `qcow2`, which creates a QEMU/KVM image rather than a VMware VMDK image. Changed the command to `composer-cli compose start my-custom-image vmdk`.
- The post described creating VMware images but did not mention that RHEL 9 VMDK output is supported for `x86_64`. Updated the prerequisite to specify a RHEL 9 x86_64 system.
- The Cockpit section told readers to use the web console, but the install step did not enable `cockpit.socket`. Added `sudo systemctl enable --now cockpit.socket`, which Red Hat documents as required when using Image Builder in the web console.
- The deploy step referred to multiple target platforms even though the tutorial is specifically about VMDK images for VMware. Updated it to deploy the VMDK image to VMware.

## Review Notes
The blueprint TOML structure, package customizations, `composer-cli blueprints push`, `composer-cli compose types`, `composer-cli compose status`, and `composer-cli compose image <compose-uuid>` commands match the RHEL 9 Image Builder CLI workflow documented by Red Hat.
