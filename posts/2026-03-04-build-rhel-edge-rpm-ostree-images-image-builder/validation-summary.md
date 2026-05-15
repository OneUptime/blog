# Validation Summary: How to Build RHEL for Edge (rpm-ostree) Images Using Image Builder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL Image Builder
- osbuild-composer
- composer-cli
- Cockpit web console
- RHEL for Edge
- rpm-ostree and OSTree commits

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing RHEL image builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/installing-composer_composing-a-customized-rhel-system-image/
- Red Hat Enterprise Linux 9 documentation: Setting up RHEL image builder for RHEL for Edge: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/setting-up-image-builder_composing-installing-managing-rhel-for-edge-images
- Red Hat Enterprise Linux 9 documentation: Composing a RHEL for Edge image using image builder command-line: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/composing-a-rhel-for-edge-image-using-image-builder-command-line_composing-installing-managing-rhel-for-edge-images
- Red Hat Enterprise Linux 9 documentation: RHEL image builder blueprint format and supported customizations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Composing RHEL for Edge images in the RHEL web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/composing-rhel-for-edge-images-using-image-builder-in-rhel-web-console_composing-installing-managing-rhel-for-edge-images

## Issues Found
- The compose example used `qcow2` and described `ami` and `vhd`, which are generic Image Builder image types and do not build the RHEL for Edge rpm-ostree image described by the title. Changed the example to use `edge-commit`, the documented RHEL for Edge Commit image type for network-based deployments.
- The deployment step described generic KVM, AWS, Azure, and VMware deployment. Changed it to describe serving the RHEL for Edge commit and installing with Anaconda and Kickstart, with a note that non-network deployments use `edge-container` followed by `edge-installer`.
- The installation steps installed `cockpit-composer` but did not start `cockpit.socket`, which is required for the Cockpit web console workflow later in the post. Updated the command to enable `cockpit.socket`.
- The web console flow requires cockpit firewall access on systems using `firewalld`. Added `firewalld`, enabled it, and added the cockpit service to the firewall configuration.
- The prerequisites did not mention the BaseOS and AppStream repositories required to install Image Builder packages. Added that prerequisite.
- The summary used lowercase product names and implied all deployment targets used the same output type. Adjusted it to refer specifically to RHEL for Edge images and supported deployment targets.

## Review Notes
The blueprint syntax for packages and `customizations.user` is valid for RHEL Image Builder. The example creates an admin user without a password or SSH key; this is syntactically valid because only `name` is required, but a real deployment should add a password hash or SSH key if that account is intended for login.
