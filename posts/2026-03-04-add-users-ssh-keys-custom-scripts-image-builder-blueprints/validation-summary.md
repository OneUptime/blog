# Validation Summary: How to Add Users, SSH Keys, and Custom Scripts to Image Builder Blueprints

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL Image Builder
- osbuild-composer
- composer-cli
- Cockpit web console
- TOML blueprints
- SSH keys

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing RHEL image builder, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/installing-composer_composing-a-customized-rhel-system-image/
- Red Hat Enterprise Linux 8 documentation: Creating system images by using RHEL image builder CLI, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- osbuild Image Builder Blueprint Reference, https://osbuild.org/docs/user-guide/blueprint-reference/

## Issues Found
- The blueprint example did not actually add an SSH key, even though the title and overview claimed the post covered SSH keys. Added the supported `key` field to the `[[customizations.user]]` block and a note to replace `PUBLIC-SSH-KEY` with the full public key contents.
- The blueprint example did not include any custom script content, even though the title and overview claimed the post covered custom scripts. Added a supported `[[customizations.files]]` entry under `/etc/profile.d/`, which is allowed by Image Builder file customizations and creates a small shell script in the image.
- The Cockpit web console section referenced `https://your-host:9090`, but the installation commands only enabled `osbuild-composer.socket`. Added `sudo systemctl enable --now cockpit.socket`, which Red Hat documents as required when using the web console.

## Review Notes
The `composer-cli` workflow, blueprint push command, compose type listing, compose start command, compose status command, and compose image download command match Red Hat Image Builder CLI documentation. The local review environment did not have `composer-cli` installed, so command behavior was verified against official documentation rather than local `--help` output.
