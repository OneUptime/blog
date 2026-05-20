# Validation Summary: How to Detach and Reattach Ubuntu Pro Tokens

## Status
validated

## Post Type
Tutorial / administration guide

## Technologies Covered
- Ubuntu Pro Client (`pro`)
- Ubuntu Pro subscriptions and tokens
- ESM and Livepatch
- cloud-init Ubuntu Pro module
- Ansible
- Packer
- APT proxy configuration

## Sources Consulted
- Ubuntu Pro Client CLI reference: https://documentation.ubuntu.com/pro-client/en/latest/references/commands/
- Ubuntu Pro Client proxy configuration guide: https://documentation.ubuntu.com/pro-client/en/docs/howtoguides/configure_proxies/
- Ubuntu Pro active machine count documentation: https://documentation.ubuntu.com/pro/active-machines/
- Ubuntu Pro token and machine usage documentation: https://documentation.ubuntu.com/pro-client/en/v35/explanations/pro_token_and_machine_usage/
- cloud-init Ubuntu Pro module reference: https://docs.cloud-init.io/en/latest/reference/modules.html#ubuntu-pro
- Ubuntu Pro pricing and free personal subscription limits: https://ubuntu.com/pricing/ubuntu-pro

## Issues Found
- The post described the Ubuntu Pro token as a machine identifier. Updated it to describe the token as a subscription credential, matching Canonical's token and machine usage documentation.
- The post used `pro accounts`, which is not listed in the current Ubuntu Pro CLI reference. Replaced it with `pro status --format json`, which exposes account and contract information in supported machine-readable output.
- The detach description implied an immediate dashboard update. Updated it to note that the active machine count can take up to 24 hours to decrease.
- The cloud-init example used the deprecated `ubuntu_advantage` key and listed `esm-apps` directly. Updated it to the current `ubuntu_pro` key and the documented `esm` service alias with `livepatch`.
- The Ansible example installed `ubuntu-advantage-tools`. Updated it to install the current `ubuntu-pro-client` package.
- The Packer example used `${UBUNTU_PRO_TOKEN}` inside an HCL string, which can be interpreted as Packer interpolation rather than a shell variable. Updated it to `$UBUNTU_PRO_TOKEN`.
- The proxy section showed manual JSON edits to `uaclient.conf`. Replaced it with the documented `pro config set` commands for Pro and Pro APT proxy settings.
- The token limit section stated that unreachable machines can be removed manually from the portal. Updated it to align with Canonical's active-machine-count behavior for detached or destroyed machines.
- The best-practices section said to always detach before destroying a machine. Updated it to recommend detaching when practical, since Canonical documents that destroyed VMs stop counting after they stop checking in.

## Review Notes
The remaining commands and examples are broadly correct for current Ubuntu Pro Client usage. Future improvements could include making the Ansible task more idempotent by checking service status before running `pro enable`, but the current example is technically valid.
