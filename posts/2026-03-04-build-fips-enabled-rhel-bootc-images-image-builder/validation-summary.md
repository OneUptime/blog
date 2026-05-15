# Validation Summary: How to Build FIPS-Enabled RHEL bootc Images with Image Builder

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- FIPS mode and system-wide cryptographic policies
- bootc / image mode for RHEL
- bootc-image-builder
- Podman
- Containerfile
- OpenSSL

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Enabling the FIPS mode while building a bootc image - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_image_mode_for_rhel_to_build_deploy_and_manage_operating_systems/enabling-the-fips-mode-while-building-a-bootc-image
- Red Hat Enterprise Linux 9 documentation: Switching RHEL to FIPS mode - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- Red Hat Enterprise Linux 9 documentation: Using system-wide cryptographic policies - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 documentation: Enabling FIPS mode with RHEL image builder - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/enabling-fips-mode-with-rhel-image-builder_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Creating and booting a RHEL for Edge image in FIPS mode - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/building-and-provisioning-simplified-installer-images_composing-installing-managing-rhel-for-edge-images#creating-and-booting-a-rhel-for-edge-image-in-fips-mode_building-and-provisioning-simplified-installer-images
- osbuild Image Builder blueprint reference: FIPS and kernel customizations - https://osbuild.org/docs/user-guide/blueprint-reference/

## Issues Found
- The original blueprint used `[customizations.fips] enabled = true`, which is the hosted Image Builder API shape, not the on-premises TOML blueprint shape. For on-premises blueprints the FIPS field is `[customizations] fips = true`, and the FIPS blueprint customization is not supported for bootc images. I replaced this with the supported bootc configuration using `01-fips.toml` under `/usr/lib/bootc/kargs.d/`.
- The original `composer-cli compose start fips-bootc edge-commit` workflow described a RHEL for Edge compose, not a bootc image build. I replaced it with a `podman build` and `bootc-image-builder` ISO workflow from Red Hat's image mode documentation.
- The original Containerfile installed `dracut-fips`, ran `grubby`, and regenerated initramfs inside the container. Red Hat documents that the FIPS dracut module is built into the RHEL bootc base image and recommends copying a bootc kargs file plus setting the FIPS crypto policy with `crypto-policies-scripts`. I updated the Containerfile accordingly.
- The original `podman build` command omitted the build context. I added `.` so the command is syntactically complete.
- The OpenSSL provider check did not actually prove that FIPS mode was enabled. I replaced it with `fips-mode-setup --check`, matching Red Hat's RHEL 9 verification guidance.
- The MD5 rejection example was too specific and not the documented RHEL crypto-policy example. I changed the negative test to check that ChaCha20 is not offered by OpenSSL ciphers under the FIPS crypto policy, while leaving the SHA-256 positive test.
- The description and introductory wording overstated "FIPS 140-compliant" and "required" claims. I softened those statements to describe FIPS enablement and common regulated-environment use without implying that a container image alone guarantees compliance.

## Review Notes
- The corrected workflow targets RHEL 9 bootc/image mode. RHEL 10 has related but not identical FIPS behavior, including removal of `fips-mode-setup`, so future RHEL 10-specific coverage should use the RHEL 10 procedures.
- For Anaconda-based installations, Red Hat requires adding `fips=1` when booting the installer in addition to enabling the FIPS crypto policy in the Containerfile.
