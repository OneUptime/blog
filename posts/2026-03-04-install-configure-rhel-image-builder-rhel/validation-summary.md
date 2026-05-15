# Validation Summary: How to Install and Configure RHEL Image Builder on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL Image Builder
- osbuild-composer
- composer-cli
- cockpit-composer
- systemd sockets
- firewalld
- TOML blueprints

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing RHEL image builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/installing-composer_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Creating system images by using RHEL image builder CLI: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: RHEL image builder description and output formats: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/composer-description_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Creating system images by using RHEL image builder web console interface: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-web-console-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Installing and enabling the web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/getting-started-with-the-rhel-9-web-console_system-management-using-the-rhel-9-web-console

## Issues Found
- The sample `composer-cli compose types` output used image type names that do not match the current RHEL 9 Image Builder output format documentation, such as `azure-image`, `guest-image`, `iso`, and `vsphere`. Updated the text to clarify that available image types vary by RHEL release and architecture, and replaced the example with current documented CLI names such as `ami`, `gce`, `image-installer`, `ova`, `qcow2`, `tar`, `vhd`, `vmdk`, `vagrant-libvirt`, and `wsl`.

## Review Notes
The install command, `osbuild-composer.socket` activation, `weldr` group access, `composer-cli` verification commands, Cockpit socket and firewall commands, and TOML blueprint package syntax were consistent with Red Hat documentation. The post does not mention RHEL subscription, BaseOS/AppStream repository, architecture, or release-specific prerequisites; those are useful future additions but not required to correct the existing commands.
