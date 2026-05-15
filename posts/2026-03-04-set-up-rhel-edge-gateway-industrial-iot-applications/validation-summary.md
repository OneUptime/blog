# Validation Summary: How to Set Up a RHEL Edge Gateway for Industrial IoT Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL for Edge
- RHEL Image Builder and composer-cli
- rpm-ostree / OSTree
- Greenboot
- Podman
- Red Hat build of MicroShift
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Composing, installing, and managing RHEL for Edge images: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/
- Red Hat Enterprise Linux 9 documentation: Composing a RHEL for Edge image using image builder command-line: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/composing-a-rhel-for-edge-image-using-image-builder-command-line_composing-installing-managing-rhel-for-edge-images
- Red Hat build of MicroShift 4.19 documentation: Getting ready to install MicroShift: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.19/html/getting_ready_to_install_microshift/
- Red Hat build of MicroShift 4.19 documentation: Installing with an RPM package: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.19/html-single/installing_with_an_rpm_package/
- Red Hat build of MicroShift documentation: The greenboot health check framework: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.14/html/installing/microshift-greenboot
- Podman run documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html

## Issues Found
- The RHEL for Edge installer image command used `composer-cli compose start my-edge-blueprint edge-installer`. Red Hat's RHEL 9 documentation uses `composer-cli compose start-ostree --ref ... --url ... blueprint-name edge-installer` for RHEL for Edge installer images that embed an OSTree commit, so the command was updated.
- The USB write example used `edge-installer.iso`, but Image Builder downloads the installer as `<UUID>-boot.iso` by default. The example was updated to use the documented filename pattern.
- The Greenboot explanation implied immediate automatic rollback for any failed health check. Red Hat documents retries and rollback only when a previous deployment is available, so the wording was corrected.
- The update section described Greenboot as configuring automatic OS updates. Greenboot validates boots and can trigger rollback; it is not itself the update delivery mechanism. The section wording was corrected to focus on health checks for updates.
- The MicroShift installation snippet installed and started MicroShift without enabling the required repositories, locking the supported RHEL release, or configuring the pull secret. The snippet was updated to include those steps before starting MicroShift.

## Review Notes
- The post remains a high-level setup guide. A production-ready RHEL for Edge deployment would usually include blueprint creation, `composer-cli compose status`, `composer-cli compose image <UUID>`, OSTree repository hosting, firewall configuration for MicroShift, and workload-specific Greenboot checks.
