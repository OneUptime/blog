# Validation Summary: How to Manage Edge Devices at Scale Using Red Hat Device Edge

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux for Edge
- Red Hat Device Edge
- RHEL Image Builder
- composer-cli
- rpm-ostree
- Greenboot
- Podman
- Red Hat build of MicroShift

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Composing a RHEL for Edge image using image builder command-line - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/composing-a-rhel-for-edge-image-using-image-builder-command-line_composing-installing-managing-rhel-for-edge-images
- Red Hat Enterprise Linux 9 documentation: Setting up RHEL image builder - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/setting-up-image-builder_composing-installing-managing-rhel-for-edge-images
- Red Hat build of MicroShift 4.20 documentation: Getting ready to install MicroShift - https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.20/pdf/getting_ready_to_install_microshift/Red_Hat_build_of_MicroShift-4.20-Getting_ready_to_install_MicroShift-en-US.pdf
- Red Hat build of MicroShift 4.20 documentation: Installing with an RPM package - https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.20/pdf/installing_with_an_rpm_package/Red_Hat_build_of_MicroShift-4.20-Installing_with_an_RPM_package-en-US.pdf
- Red Hat build of MicroShift 4.20 documentation: Understanding MicroShift - https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.20/html-single/understanding_microshift/index

## Issues Found
- The `edge-installer` compose command used `composer-cli compose start` without the OSTree ref and repository URL required by the RHEL for Edge installer workflow. Updated it to use `composer-cli compose start-ostree --ref ... --url ...`.
- The Greenboot section described rollback as happening when any script fails. Updated the wording to clarify that required health checks are retried and rollback occurs if failures continue after retries.
- The MicroShift installation text implied that `dnf install microshift` alone was complete. Updated the text to note that required repositories and the pull secret must be configured first.

## Review Notes
The post remains a high-level guide. A production-ready version should include the full Image Builder setup, compose status/download steps, MicroShift repository setup, pull-secret placement, firewall configuration, and version compatibility details.
