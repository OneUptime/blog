# Validation Summary: How to Build Custom RHEL Images with the Cockpit Web Console

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL Image Builder
- Cockpit web console
- osbuild-composer
- composer-cli
- image-builder CLI
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing RHEL image builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/installing-composer_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: RHEL image builder output formats and CLI usage: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/composer-description_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Creating system images by using RHEL image builder web console interface: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-web-console-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 10 documentation: Installing RHEL image builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/composing_a_customized_rhel_system_image/index
- Red Hat Enterprise Linux 10 documentation: Creating system images by using RHEL image builder web console interface: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/composing_a_customized_rhel_system_image/creating-system-images-with-gui

## Issues Found
- The setup command used only the RHEL 8/9 package names and backend (`osbuild-composer`, `composer-cli`, `cockpit-composer`). RHEL 10 documentation now uses `image-builder` and `cockpit-image-builder`, with only `cockpit.socket` enabled for web console access. I split the installation commands by RHEL version.
- The CLI automation example used only `composer-cli compose start`, which is correct for RHEL 8/9 but not the RHEL 10 Image Builder CLI. I added the RHEL 10 `image-builder build qcow2 --blueprint my-blueprint` equivalent.
- The access instructions implied any RHEL system credential was enough. Red Hat's web console Image Builder documentation requires root access, and related image-builder workflows use root or `weldr` privileges. I updated the login sentence to mention root or required Image Builder privileges.
- The blueprint creation steps referred to a packages tab before saving. Current Red Hat web console documentation presents package selection as part of the Create Blueprint wizard, followed by optional customization pages and review. I adjusted the wording to match that flow.
- The download instruction referred to a download icon. Red Hat's current web console documentation uses the node options menu and "Download image", so I updated that step.
- The comparison section said both methods produce identical images. That is too absolute because the output depends on the selected blueprint, output type, release, and architecture. I changed it to state that the same blueprint and output type use the same image-building service.
- The final backend statement said both approaches always use `osbuild-composer`. That is accurate for RHEL 8/9 but not for RHEL 10, so I made the version distinction explicit.

## Review Notes
The listed output types are broadly correct, but Image Builder support varies by RHEL release, architecture, and cloud upload workflow. Future updates could include a short note telling readers to run `composer-cli compose types` on RHEL 8/9 or `image-builder list` on RHEL 10 to see the exact output types supported by their host.
