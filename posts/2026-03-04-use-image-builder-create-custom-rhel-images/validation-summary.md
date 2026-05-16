# Validation Summary: How to Use Image Builder to Create Custom RHEL Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL Image Builder
- osbuild-composer
- composer-cli
- TOML blueprints
- systemd services
- firewalld
- KVM/libvirt and virt-install
- Cloud and virtualization image formats: qcow2, raw, vmdk, vhd, image-installer

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Composing a customized RHEL system image - RHEL image builder description and output formats: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/
- Red Hat Enterprise Linux 9 documentation: Creating system images by using RHEL image builder CLI: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Installing RHEL image builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/composing_a_customized_rhel_system_image/composing-a-customized-rhel-system-image.pdf
- Red Hat Enterprise Linux 9 documentation: Preparing and uploading cloud images by using RHEL image builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-cloud-images-with-composer_composing-a-customized-rhel-system-image

## Issues Found
- The AWS example used `composer-cli compose start app-server ami` as a simple two-argument compose. Red Hat's current RHEL 9 docs document the simple downloadable AWS output format as `raw`, while direct AMI upload with the `ami` image type requires additional arguments and a cloud provider configuration file. Changed the example to `composer-cli compose start app-server raw`.

## Review Notes
- The blueprint syntax for packages, users, enabled services, firewall ports, and timezone matches the documented RHEL Image Builder TOML schema.
- The `composer-cli` commands for pushing blueprints, depsolving, listing compose types, starting composes, checking status, viewing info/logs, downloading images, and deleting composes/blueprints match Red Hat's documented CLI workflow.
- `composer-cli` was not installed in the local review environment, so command behavior was verified against official Red Hat documentation rather than local `--help` output.
