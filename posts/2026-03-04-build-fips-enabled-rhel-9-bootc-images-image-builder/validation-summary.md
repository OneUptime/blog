# Validation Summary: How to Build FIPS-Enabled RHEL 9 bootc Images with bootc-image-builder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL image mode / bootc
- bootc-image-builder
- Podman
- FIPS mode
- Linux crypto policies
- TOML configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Enabling the FIPS mode while building a bootc image, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_image_mode_for_rhel_to_build_deploy_and_manage_operating_systems/enabling-the-fips-mode-while-building-a-bootc-image
- Red Hat Enterprise Linux 9 documentation: Creating bootc-compatible base disk images by using bootc-image-builder, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_image_mode_for_rhel_to_build_deploy_and_manage_operating_systems/creating-bootc-compatible-base-disk-images-with-bootc-image-builder_using-image-mode-for-rhel-to-build-deploy-and-manage-operating-systems
- Red Hat Enterprise Linux 9 documentation: Introducing image mode for RHEL, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_image_mode_for_rhel_to_build_deploy_and_manage_operating_systems/introducing-image-mode-for-rhel_using-image-mode-for-rhel-to-build-deploy-and-manage-operating-systems
- Red Hat Enterprise Linux 9 documentation: Installing RHEL image builder, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/installing-composer_composing-a-customized-rhel-system-image/

## Issues Found
- The original post claimed to build FIPS-enabled RHEL 9 bootc images, but its commands used classic RHEL Image Builder with `osbuild-composer` and `composer-cli`, which builds package-mode images rather than bootc disk images. Replaced the workflow with `bootc-image-builder`, which is the documented tool for converting bootc container images into disk images.
- The original blueprint did not enable FIPS mode. Added the documented bootc FIPS configuration: `kargs = ["fips=1"]`, copying that file into `/usr/lib/bootc/kargs.d/`, and setting the system-wide crypto policy to `FIPS` in the Containerfile.
- The original prerequisites and installation commands listed `osbuild-composer`, `composer-cli`, and `cockpit-composer`. Replaced them with `container-tools`, `podman login registry.redhat.io`, and pulling `registry.redhat.io/rhel9/bootc-image-builder:latest`.
- The original compose commands used `composer-cli compose start/status/image`, which do not apply to bootc-image-builder builds. Replaced them with the documented `podman run --privileged ... registry.redhat.io/rhel9/bootc-image-builder:latest --local --type qcow2 ...` flow and output directory handling.
- The original post described Cockpit Image Builder usage, which is not the documented workflow for bootc-image-builder disk image creation. Replaced that section with FIPS verification commands.

## Review Notes
The example uses a simple plaintext password in `config.toml` to stay close to the Red Hat documentation pattern. For production images, use SSH keys, hashed passwords, secrets handling, or first-boot provisioning appropriate to the deployment environment.
