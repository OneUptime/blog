# Validation Summary: How to Deploy Containerized Workloads at the Edge Using MicroShift on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL for Edge
- MicroShift
- Image Builder / composer-cli
- rpm-ostree
- Greenboot
- Podman
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Composing, installing, and managing RHEL for Edge images: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/composing_installing_and_managing_rhel_for_edge_images/index
- Red Hat build of MicroShift 4.20 documentation: Getting ready to install MicroShift: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.20/html-single/getting_ready_to_install_microshift/index
- Red Hat build of MicroShift 4.20 documentation: Installing with an RPM package: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.20/html-single/installing_with_an_rpm_package/index
- Red Hat build of MicroShift 4.20 documentation: Embedding in a RHEL for Edge image: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.20/html-single/embedding_in_a_rhel_for_edge_image/index
- Red Hat Enterprise Linux 9 documentation: Composing a customized RHEL system image: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Podman run reference: https://docs.podman.io/en/v5.3.0/markdown/podman-run.1.html
- Local GNU coreutils `dd --help` output
- Local `systemctl --help` output

## Issues Found
- The MicroShift prerequisite listed CPU and RAM only. Red Hat's baseline MicroShift requirements also include 10 GB of storage, so the prerequisite was updated to include storage.
- The RHEL for Edge installer compose example used `composer-cli compose start my-edge-blueprint edge-installer`. Red Hat's RHEL 9 docs show `edge-installer` creation with `composer-cli compose start-ostree` plus `--ref` and `--url` to the OSTree repository, so the command was corrected.
- The post showed only a package-based `dnf install` path for MicroShift. That is valid for package-based RHEL, but RHEL for Edge images should have MicroShift embedded through the Image Builder blueprint and the service enabled in the blueprint. A minimal blueprint snippet was added.

## Review Notes
The remaining commands and claims are broadly consistent with the official documentation. The MicroShift RPM installation snippet is still intentionally abbreviated; a production package-based installation also requires enabling the correct Red Hat repositories, adding the pull secret, and configuring firewall and storage prerequisites.
