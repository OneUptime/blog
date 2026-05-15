# Validation Summary: How to Install and Configure MicroShift on RHEL 9 for Edge Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL for Edge
- Red Hat Image Builder
- composer-cli
- rpm-ostree
- Greenboot
- Podman
- Red Hat build of MicroShift
- Kubernetes

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Composing a RHEL for Edge image using Image Builder command-line - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/composing-a-rhel-for-edge-image-using-image-builder-command-line_composing-installing-managing-rhel-for-edge-images
- Red Hat build of MicroShift 4.20 documentation: Getting ready to install MicroShift - https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.20/html/getting_ready_to_install_microshift/microshift-install-get-ready
- Red Hat build of MicroShift 4.20 documentation: Installing from an RPM package - https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.20/html/installing_with_an_rpm_package/microshift-install-rpm
- Red Hat build of MicroShift 4.20 documentation: Stopping and starting MicroShift - https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.20/html/installing_with_an_rpm_package/stopping-and-starting-microshift
- Red Hat Enterprise Linux 9 documentation: Managing RHEL for Edge images and Greenboot checks - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/managing-rhel-for-edge-images_composing-installing-managing-rhel-for-edge-images

## Issues Found
- The MicroShift prerequisites only listed CPU and RAM. Updated them to include the need for a supported RHEL 9 minor version, 10 GB storage, and an active MicroShift subscription, matching Red Hat's MicroShift requirements.
- The RHEL for Edge installer compose command used `composer-cli compose start ... edge-installer`, but Red Hat's CLI flow for a RHEL 9 edge installer uses `composer-cli compose start-ostree` with an OSTree ref and repository URL. Updated the command accordingly.
- The USB write example used `edge-installer.iso`, but Image Builder downloads RHEL for Edge installer images as `<UUID>-boot.iso` by default. Updated the example filename to match the documented output.
- The Greenboot section described automatic OS updates too broadly. Changed it to describe rpm-ostree updates with Greenboot health checks and clarified that rollback happens after failed retries when a previous deployment is available.
- The MicroShift installation block installed and started the package without enabling required repositories, locking the supported RHEL release, adding the OpenShift pull secret, or configuring required firewall rules. Added those required setup commands before enabling the service.

## Review Notes
The example uses MicroShift 4.20 repository names and the Red Hat-documented RHEL 9.6 release lock. Future updates should revise those values when targeting a different MicroShift release or a different supported RHEL 9 minor version.
