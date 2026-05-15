# Validation Summary: How to Deploy RHEL for Edge with rpm-ostree on IoT Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux for Edge
- rpm-ostree
- RHEL Image Builder and composer-cli
- Greenboot
- rpm-ostreed automatic updates
- Podman
- Red Hat build of MicroShift

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Composing a RHEL for Edge image using image builder command-line - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/composing_installing_and_managing_rhel_for_edge_images/composing-a-rhel-for-edge-image-using-image-builder-command-line_composing-installing-managing-rhel-for-edge-images
- Red Hat Enterprise Linux 8 documentation: Deploying RHEL for Edge automatic image updates and rollbacks - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/epub/composing_installing_and_managing_rhel_for_edge_images/deploying-an-os-with-a-rhel-for-edge-container-commit-for-non-network-based-deployments_assembly_deploying-a-non-network-rhel-for-edge-image
- Red Hat Enterprise Linux 9 documentation: Greenboot checks and rollback behavior - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/composing_installing_and_managing_rhel_for_edge_images/index
- Red Hat build of MicroShift 4.15 documentation: Installing from an RPM package and system requirements - https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.15/html/installing/microshift-install-rpm
- Podman official documentation: podman-run - https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The `edge-installer` Image Builder command used `composer-cli compose start`, but Red Hat documents installer images as `composer-cli compose start-ostree` with an OSTree ref and repository URL. Updated the command accordingly.
- The Greenboot rollback description implied an immediate rollback after any health check failure. Updated it to note that Greenboot retries boots and rolls back only after required health checks keep failing and a previous deployment is available.
- The automatic updates section described Greenboot as the update mechanism. Updated it to show `rpm-ostreed.conf`, `rpm-ostreed-automatic.timer`, and Greenboot as the validation/rollback layer.
- The MicroShift prerequisites were incomplete for a deployable RHEL for Edge setup. Added supported RHEL/MicroShift pairing, active subscriptions/repositories, and pull secret requirements while keeping the existing CPU and RAM requirement.

## Review Notes
- The Podman example is syntactically valid, but production edge deployments should normally use a systemd unit or Quadlet configuration so containers restart predictably after reboots.
- The MicroShift install commands are only a minimal summary. Red Hat's documented install flow also includes repository enablement, pull secret placement, storage preparation for persistent volumes, and firewall configuration when needed.
