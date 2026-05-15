# Validation Summary: How to Create Custom RHEL Blueprints with Packages and Customizations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL Image Builder / osbuild-composer
- Image Builder blueprints
- TOML
- composer-cli
- systemd services
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation, "Composing a customized RHEL system image": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/composing_a_customized_rhel_system_image/index
- Red Hat Enterprise Linux 8 documentation, "Creating system images by using RHEL image builder CLI": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Image Builder blueprint reference: https://osbuild.org/docs/user-guide/blueprint-reference/
- Lorax composer-cli documentation: https://weldr.io/lorax/f30-branch/composer-cli.html

## Issues Found
- The package group example used the display name `Development Tools`. Image Builder blueprints require the package group ID, so it was changed to `development`.
- The filesystem examples used `size`. Current Red Hat Image Builder documentation uses `minsize` for `[[customizations.filesystem]]`, so all filesystem entries were updated.
- The services example disabled `bluetooth` and `cups`, which can fail if those systemd units are not present in the image. The disabled list was changed to an empty list.
- The sample password hash was a placeholder rather than a usable SHA-512 crypt hash. It was replaced with a complete SHA-512 crypt hash for the example user.
- The post described the blueprint as containing all customization types. Image Builder supports more customization types than the example shows, so the wording was narrowed to "several common customization types."
- The freezing section implied that `composer-cli blueprints freeze` itself locks package versions. The wording and commands were adjusted to distinguish showing resolved versions from saving a frozen blueprint.

## Review Notes
- The corrected blueprint TOML parses successfully with Python's `tomllib`.
- Filesystem customization support and allowed mount points vary by RHEL and osbuild-composer version and by image type. The post's example mount points are valid in supported RHEL Image Builder versions, but future posts should call out version and image-type constraints when covering filesystem layouts in more depth.
