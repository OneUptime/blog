# Validation Summary: How to Configure Multus Networking for MicroShift on RHEL Edge Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL for Edge
- Image Builder and composer-cli
- rpm-ostree
- Greenboot
- Podman
- Red Hat build of MicroShift
- Multus CNI
- Kubernetes NetworkAttachmentDefinition

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Composing, installing, and managing RHEL for Edge images: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/
- Red Hat build of MicroShift documentation: Getting ready to install MicroShift: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.18/html-single/getting_ready_to_install_microshift/
- Red Hat build of MicroShift documentation: Installing with an RPM package: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.21/html-single/installing_with_an_rpm_package/
- Red Hat build of MicroShift documentation: Multiple networks: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.21/html/networking/multiple-networks
- Red Hat build of MicroShift documentation: The greenboot health check framework: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.14/html/installing/microshift-greenboot

## Issues Found
- The post title and description said it configured Multus networking, but the body did not include Multus installation, a `NetworkAttachmentDefinition`, or pod annotations. I added the documented `microshift-multus` installation, verification command, bridge secondary network example, and pod annotation example.
- The `edge-installer` Image Builder command used `composer-cli compose start my-edge-blueprint edge-installer`, which is incomplete for a RHEL for Edge installer image. I changed it to the documented `composer-cli compose start-ostree --ref rhel/9/x86_64/edge --url ... my-edge-blueprint edge-installer` form.
- The summary used lowercase product names for Multus and MicroShift. I corrected the capitalization to match the official product and project names.

## Review Notes
- The MicroShift RPM installation in the post is simplified. Red Hat's full installation procedure also includes enabling the correct repositories, setting a supported RHEL release where applicable, and installing the OpenShift pull secret before starting MicroShift.
- The RHEL for Edge installer command uses `http://example.com/repo` as a placeholder for the OSTree repository URL. In a real deployment, replace it with the repository that serves the RHEL for Edge commit.
