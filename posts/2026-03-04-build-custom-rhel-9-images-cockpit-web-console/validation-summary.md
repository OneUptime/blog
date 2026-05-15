# Validation Summary: How to Build Custom RHEL 9 Images with the Cockpit Web Console

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL image builder
- Cockpit web console
- osbuild-composer
- composer-cli
- TOML blueprints

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing RHEL image builder - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/installing-composer_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Creating system images by using RHEL image builder CLI - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Creating system images by using RHEL image builder web console interface - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-web-console-interface_composing-a-customized-rhel-system-image

## Issues Found
- The installation step installed `cockpit-composer` but did not enable and start `cockpit.socket`. Red Hat's RHEL 9 Image Builder installation procedure includes `systemctl enable --now cockpit.socket` when using Image Builder in the web console. Added that command so the Cockpit URL in the post is reachable.

## Review Notes
The `composer-cli` commands, compose workflow, package entries, and `[[customizations.user]]` blueprint syntax match Red Hat's RHEL 9 Image Builder documentation. The sample user is syntactically valid, but a real deployment would usually add a password hash or SSH key so the account can be used to log in.
