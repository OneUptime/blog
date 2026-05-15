# Validation Summary: How to Automate RHEL 9 Image Builds with Ansible and composer-cli

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
- Red Hat Enterprise Linux 9 documentation: Installing RHEL image builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/installing-composer_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Creating system images by using RHEL image builder CLI: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image

## Issues Found
- The post title, tags, description, overview, and summary claimed to use Ansible, but the article only uses `composer-cli` and includes no Ansible playbook or Ansible command examples. Removed the Ansible references from the post content to match the actual implementation shown.
- The prerequisites said root or sudo access was enough for the shown `composer-cli` commands. Red Hat documents that non-root users must be in the `weldr` group. Updated the prerequisite to state root access or a user in the `weldr` group for `composer-cli`.
- The Cockpit section said the web console could be used at port 9090, but the installation commands did not enable `cockpit.socket`. Updated the service enable command to include `cockpit.socket` and clarified the Cockpit note.
- The summary claimed a consistent workflow across all deployment targets, which was broader than the official documentation supports. Changed it to "many deployment targets."

## Review Notes
The main `composer-cli` workflow is accurate for RHEL 9: installing `osbuild-composer`, `composer-cli`, and `cockpit-composer`; enabling `osbuild-composer.socket`; creating and pushing a TOML blueprint; listing compose types; starting a `qcow2` compose; checking compose status; and downloading the image by UUID. The example user customization is syntactically valid, although in a production image the user would typically also need a password hash or SSH key.
