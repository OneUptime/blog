# Validation Summary: How to Configure RHEL for Edge with Automatic OS Updates (Greenboot)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux for Edge
- RHEL Image Builder and composer-cli
- rpm-ostree and OSTree deployments
- Greenboot health checks and rollback
- Podman
- Red Hat build of MicroShift
- systemd services and timers

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Composing, installing, and managing RHEL for Edge images - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/composing_installing_and_managing_rhel_for_edge_images/index
- Red Hat Enterprise Linux 9 documentation: Creating a RHEL for Edge Installer image for non-network-based deployments - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/assembly_deploying-a-non-network-rhel-for-edge-image_composing-installing-managing-rhel-for-edge-images
- Red Hat Enterprise Linux 9 documentation: Managing RHEL for Edge images, Greenboot checks and rollback - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/managing-rhel-for-edge-images_composing-installing-managing-rhel-for-edge-images
- Red Hat build of MicroShift 4.19 documentation: Getting ready to install MicroShift - https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.19/html-single/getting_ready_to_install_microshift/
- Red Hat build of MicroShift 4.19 documentation: Installing with an RPM package - https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.19/html-single/installing_with_an_rpm_package/index

## Issues Found
- The `edge-installer` Image Builder command used plain `composer-cli compose start`, but Red Hat's RHEL 9 Edge installer workflow uses `composer-cli compose start-ostree` with an OSTree ref and repository URL. Updated the command to include `start-ostree`, `--ref`, and `--url`.
- The automatic update section did not actually configure automatic rpm-ostree updates. Added the required `/etc/rpm-ostreed.conf` settings for `AutomaticUpdatePolicy=stage` and `IdleExitTimeout=60`, plus the `systemctl reload rpm-ostreed` and `systemctl enable --now rpm-ostreed-automatic.timer` commands.
- The Greenboot rollback comment implied that any failed script immediately rolls back the system. Red Hat documents that required checks retry by default before rollback. Updated the comment to say rollback occurs if required checks keep failing after the configured retries.
- The MicroShift install wording omitted required preparation. Updated the sentence to state that the repositories must be enabled and the pull secret configured before installing MicroShift.

## Review Notes
- The post remains a high-level guide. A future improvement would be to show a complete blueprint, OSTree repository serving workflow, and version-specific MicroShift repository commands, but the current snippets are now technically aligned with the referenced Red Hat documentation.
