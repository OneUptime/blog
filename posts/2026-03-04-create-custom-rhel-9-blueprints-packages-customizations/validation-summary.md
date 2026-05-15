# Validation Summary: How to Create Custom RHEL 9 Blueprints with Packages and Customizations

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
- TOML blueprints

## Sources Consulted
- Red Hat Documentation: Composing a customized RHEL system image, RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/composing_a_customized_rhel_system_image/index

## Issues Found
- The prerequisites said "Root or sudo access", but Red Hat documents that non-root `composer-cli` users must be members of the `weldr` group. Updated the prerequisite to reflect root access or `weldr` group membership for `composer-cli` commands.
- The installation step installed `cockpit-composer` and the post later directed readers to the Cockpit web console at port 9090, but it did not enable and start `cockpit.socket`. Added `sudo systemctl enable --now cockpit.socket`, matching Red Hat's Image Builder installation procedure.

## Review Notes
- The blueprint TOML structure, package declarations, `[[customizations.user]]` usage, `composer-cli blueprints push`, `composer-cli compose types`, `composer-cli compose start`, `composer-cli compose status`, and `composer-cli compose image` commands match Red Hat's RHEL 9 Image Builder documentation.
- The example user does not define a password hash or SSH key. Red Hat documents those fields as optional except for `name`, so the blueprint is valid, but readers may need to add a password hash, SSH key, or cloud-init configuration before logging into some resulting images.
