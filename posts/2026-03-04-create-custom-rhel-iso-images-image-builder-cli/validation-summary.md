# Validation Summary: How to Create Custom RHEL ISO Images Using Image Builder CLI (composer-cli)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL Image Builder
- osbuild-composer
- composer-cli
- Image Builder blueprints in TOML
- RHEL Installer ISO images
- firewalld
- systemd services

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: RHEL Image Builder description and output formats: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/composer-description_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Creating system images by using RHEL Image Builder CLI: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Creating a boot ISO installer image with RHEL Image Builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-a-boot-iso-installer-image-with-image-builder_composing-a-customized-rhel-system-image
- Image Builder blueprint reference: https://osbuild.org/docs/user-guide/blueprint-reference/

## Issues Found
- The post used `composer-cli compose log <compose-uuid>`, but Red Hat documents the subcommand as `composer-cli compose logs UUID`. Updated the command to `composer-cli compose logs <compose-uuid>`.
- The build section suggested `composer-cli compose start webserver-iso iso` for a live ISO. Current RHEL 9 Image Builder output format documentation lists `image-installer` as the RHEL Installer ISO type, not a generic `iso` compose type. Replaced the example with `composer-cli compose types` so readers verify available image types on their host.
- The firewall example opened only `443:tcp` while the blueprint installs and enables `httpd`. Added `80:tcp` so the example exposes the default HTTP service as well as HTTPS.
- The USB writing command assumed a specific downloaded filename, `<compose-uuid>-image-installer.iso`, which Red Hat's documentation does not guarantee. Changed it to use a placeholder for the actual downloaded ISO file.
- The closing sentence claimed the resulting ISO contains a "fully automated" RHEL installation. Red Hat documents `image-installer` as a bootable Anaconda installer ISO and notes that installation may still require manual completion unless further installer/Kickstart customization is used. Updated the wording to "pre-configured RHEL installer image."

## Review Notes
The blueprint TOML syntax, `distro = "rhel-94"` version selector, package entries, user customization with a SHA-512-style password hash, hostname customization, systemd service customization, firewall port syntax, `composer-cli blueprints push`, `composer-cli blueprints show`, `composer-cli blueprints depsolve`, `composer-cli compose start webserver-iso image-installer`, `composer-cli compose status`, `composer-cli compose image`, `composer-cli compose delete`, and `composer-cli compose list` commands are consistent with the consulted Red Hat and Image Builder documentation.
