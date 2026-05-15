# Validation Summary: How to Build and Deploy Air-Gapped RHEL Edge Systems

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux for Edge
- RHEL Image Builder and composer-cli
- rpm-ostree and OSTree commits
- Greenboot
- Podman
- Red Hat build of MicroShift

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Composing a RHEL for Edge image using image builder command-line - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/composing-a-rhel-for-edge-image-using-image-builder-command-line_composing-installing-managing-rhel-for-edge-images
- Red Hat Enterprise Linux 9 documentation: Deploying a RHEL for Edge image in a non-network-based environment - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/assembly_deploying-a-non-network-rhel-for-edge-image_composing-installing-managing-rhel-for-edge-images
- Red Hat Enterprise Linux 8 documentation: Managing RHEL for Edge images and Greenboot rollback behavior - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/composing_installing_and_managing_rhel_for_edge_images/managing-rhel-for-edge-images_composing-installing-managing-rhel-for-edge-images
- Red Hat build of MicroShift 4.20 documentation: Embedding in a RHEL for Edge image for offline use - https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.20/html/embedding_in_a_rhel_for_edge_image/microshift-embed-in-rpm-ostree-for-offline-use

## Issues Found
- The `edge-installer` Image Builder command used `composer-cli compose start my-edge-blueprint edge-installer`, but current Red Hat RHEL for Edge documentation creates installer images with `composer-cli compose start-ostree` plus an OSTree ref and repository URL. Updated the command accordingly.
- The Greenboot section described automatic OS updates, but Greenboot is specifically responsible for health-check-driven rollback behavior after failed boot attempts. Updated the section title and explanation to avoid implying Greenboot performs the update itself.
- The MicroShift section used `dnf install` and `systemctl enable --now` commands, which are the RPM installation workflow for regular RHEL hosts rather than the documented RHEL for Edge offline image workflow. Replaced them with the Image Builder blueprint pattern that embeds the `microshift` package, enables the service, and includes MicroShift container image references for disconnected use.

## Review Notes
- The post remains a high-level guide. A future revision could add the full disconnected workflow for mirroring RHEL repositories, serving OSTree commits, and mirroring MicroShift container images.
