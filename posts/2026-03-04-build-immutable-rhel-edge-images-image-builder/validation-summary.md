# Validation Summary: How to Build Immutable RHEL Edge Images with Image Builder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL Image Builder
- RHEL for Edge
- rpm-ostree
- Greenboot
- Podman
- MicroShift

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Composing a RHEL for Edge image using Image Builder command-line: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/composing-a-rhel-for-edge-image-using-image-builder-command-line_composing-installing-managing-rhel-for-edge-images
- Red Hat Enterprise Linux 9 documentation: Setting up RHEL Image Builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/setting-up-image-builder_composing-installing-managing-rhel-for-edge-images
- Red Hat Enterprise Linux 9 documentation: Deploying a RHEL for Edge image in a non-network-based environment: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/assembly_deploying-a-non-network-rhel-for-edge-image_composing-installing-managing-rhel-for-edge-images
- Red Hat Enterprise Linux 9 documentation: Managing RHEL for Edge images: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/managing-rhel-for-edge-images_composing-installing-managing-rhel-for-edge-images
- Red Hat build of MicroShift documentation: Getting ready to install MicroShift: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.19/html/getting_ready_to_install_microshift/microshift-install-get-ready
- Red Hat build of MicroShift documentation: The greenboot health check framework: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.14/html/installing/microshift-greenboot

## Issues Found
- The Image Builder prerequisite only said "a RHEL 9 system" and omitted Red Hat's documented minimum Image Builder host requirements. Added the minimum 2 CPU cores, 4 GiB RAM, and 20 GiB disk space.
- The `edge-installer` compose command used `composer-cli compose start`, but Red Hat documents installer image creation with `composer-cli compose start-ostree --ref ... --url ... blueprint-name edge-installer` so the installer can embed the OSTree commit. Updated the command accordingly.
- The USB write example used `edge-installer.iso`, but Image Builder downloads compose artifacts by UUID and Red Hat's installer artifact name is represented as the downloaded boot ISO. Updated the example to use `<UUID>-boot.iso`.
- The automatic update section implied Greenboot performs automatic OS updates. Greenboot performs boot health checks and rollback; automatic staging is configured with `rpm-ostreed-automatic`. Updated the prose and command snippet to show `AutomaticUpdatePolicy=stage` and `rpm-ostreed-automatic.timer`.
- The MicroShift install sentence omitted the required repository and pull secret setup. Added a short prerequisite phrase before the install commands.

## Review Notes
The post remains a high-level guide. A future expansion could show complete blueprint creation, compose status checks, artifact download commands, and the exact MicroShift repository enablement steps for a selected MicroShift/RHEL compatibility pair.
