# Validation Summary: How to Install and Configure RHEL Image Builder on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL Image Builder
- osbuild-composer
- composer-cli
- cockpit-composer and the RHEL web console
- TOML blueprints

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing RHEL image builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/installing-composer_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Creating system images by using RHEL image builder CLI: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Creating system images by using RHEL image builder web console interface: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-web-console-interface_composing-a-customized-rhel-system-image

## Issues Found
- The installation step installed `cockpit-composer` and later directed readers to use the Cockpit web console, but did not enable and start `cockpit.socket`. Added `sudo systemctl enable --now cockpit.socket`, matching Red Hat's RHEL 9 Image Builder installation procedure.

## Review Notes
The `composer-cli` compose commands, TOML blueprint package syntax, user customization syntax, image type examples, status check, and image download command match the RHEL 9 Image Builder documentation. The example admin user has no password or SSH key, so it is useful for demonstrating blueprint syntax but would need authentication details for interactive login in a real deployment.
