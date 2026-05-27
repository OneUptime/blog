# Validation Summary: How to Use Ansible with 1Password for Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and lookup plugins
- 1Password CLI
- 1Password secret references
- 1Password service accounts
- Linux shell environment variables
- Ansible modules including get_url, unarchive, template, set_fact, setup, package, timezone, hostname, lineinfile, service, uri, cron, and community.general.ufw

## Sources Consulted
- 1Password CLI installation documentation: https://www.1password.dev/cli/get-started
- 1Password CLI server installation documentation: https://www.1password.dev/cli/install-server
- 1Password CLI `op read` command reference: https://www.1password.dev/cli/reference/commands/read
- 1Password CLI secret references documentation: https://www.1password.dev/cli/secret-references
- 1Password CLI service account command reference: https://www.1password.dev/cli/reference/management-commands/service-account
- 1Password CLI environment variables documentation: https://developer.1password.com/docs/cli/environment-variables
- Ansible `ansible.builtin.pipe` lookup documentation: https://docs.ansible.com/ansible/6/collections/ansible/builtin/pipe_lookup.html
- Ansible `ansible.builtin.unarchive` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/unarchive_module.html
- Ansible logging and `no_log` documentation: https://docs.ansible.com/ansible/8/reference_appendices/logging.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The setup snippet installed the 1Password CLI on managed hosts, but Ansible lookup plugins run on the Ansible controller. Updated the installation tasks to run once on `localhost` with delegation, and clarified in the key takeaways that the pipe lookup retrieves secrets on the controller.
- The lookup examples used the short lookup name `pipe`. This works in many installations, but Ansible documentation recommends the FQCN to avoid collection-name conflicts. Updated the examples to use `ansible.builtin.pipe`.
- The post referred to the approach as a "module" in the common-use-case text and comments, but the implementation uses the 1Password CLI and Ansible lookup plugin rather than a dedicated Ansible module. Updated those references to "approach."

## Review Notes
The 1Password CLI download URL pattern, `op read` secret-reference syntax, `OP_SERVICE_ACCOUNT_TOKEN` environment variable, and `no_log` guidance are consistent with the official documentation. The `community.general.ufw` examples require the `community.general` collection and the target host's `ufw` package, as documented by Ansible.
