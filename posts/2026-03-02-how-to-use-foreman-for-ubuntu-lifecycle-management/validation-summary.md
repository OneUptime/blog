# Validation Summary: How to Use Foreman for Ubuntu Lifecycle Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Foreman 3.9
- Ubuntu 22.04 LTS (Jammy)
- Puppet 7 (transitive dependency of Foreman)
- Katello (Foreman content management plugin)
- Hammer CLI (Foreman command-line tool)
- Ansible (theforeman.foreman collection / foreman-plugin-ansible)
- PXE / DHCP / TFTP smart proxy
- APT repository management

## Sources Consulted
- [Foreman Debian/Ubuntu Quickstart Guide](https://docs.theforeman.org/3.13/Quickstart/index-foreman-deb.html)
- [Foreman 3.11 Quickstart](https://theforeman.org/manuals/3.11/quickstart_guide.html)
- [Foreman Ansible Modules / theforeman.foreman collection](https://galaxy.ansible.com/theforeman/foreman)
- [foreman-ansible-modules GitHub](https://github.com/theforeman/foreman-ansible-modules)
- [hammer-cli-foreman host_create.md](https://github.com/theforeman/hammer-cli-foreman/blob/master/doc/host_create.md)
- [Foreman community discussions on apt key updates](https://community.theforeman.org/t/it-looks-like-theforeman-deb-apt-key-is-about-to-expire/34268)
- Foreman/Katello product documentation for `foreman-installer --scenario katello`

## Issues Found
1. **Deprecated `apt-key add` usage and wrong GPG key URL.** The post used `wget -q https://deb.theforeman.org/pubkey.gpg -O- | sudo apt-key add -`. `apt-key` is deprecated since Ubuntu 22.04, and the current Foreman key is published at `https://deb.theforeman.org/foreman.asc`. Replaced with `sudo wget -q https://deb.theforeman.org/foreman.asc -O /etc/apt/trusted.gpg.d/foreman.asc`, which is what the official Foreman Debian/Ubuntu install guide uses.

2. **Missing Puppet 7 release prerequisite.** Foreman 3.9 depends on Puppet 7, which is not in the default Ubuntu 22.04 archive. Without the `puppet7-release-jammy.deb` package being installed first, `apt install foreman-installer` will fail to satisfy dependencies. Added the step to install `puppet7-release-jammy.deb` before adding the Foreman repository, matching the official quickstart.

3. **`pip3 install foreman-ansible-modules` on managed hosts is wrong on multiple counts.** (a) `foreman-ansible-modules` is not a PyPI package - it is the `theforeman.foreman` Ansible Galaxy Collection. (b) It is for managing Foreman *from* Ansible (e.g., creating hosts/products via API), not for hosts that Foreman manages. (c) Managed Ubuntu hosts need no agent installation for Ansible - Foreman drives Ansible over SSH and only requires Python on the target. Replaced with `ansible-galaxy collection install theforeman.foreman` on a control node, with a clarifying note about its purpose.

4. **`hammer host create --environment` flag.** In Foreman 3.x, the Puppet environment flag is `--puppet-environment` (or `--puppet-environment-id`); the generic `--environment` flag no longer exists for this purpose. Updated both the `hammer host create` and `hammer hostgroup create` examples to use `--puppet-environment`.

## Review Notes
- The post does not explicitly mention that `apt update` may complain about the Puppet repository's signing key in modern Ubuntu releases; the puppet-release package handles this internally so the current commands are still correct.
- The description "This script installs the foreman-agent" in the registration section is imprecise - the global registration script actually installs subscription-manager (when Katello is in use) and configures Puppet/Ansible per the host's settings. Left as-is because it does not affect what a reader would type or run, and `foreman-agent` is a reasonable colloquial reference to the bundle of agents the script installs.
- The hammer config file path (`~/.hammer/cli_config.yml`) and the embedded `:foreman:` section will work, though hammer's preferred layout is to split foreman-specific settings into `~/.hammer/cli.modules.d/foreman.yml`. The single-file approach in the post is still valid.
- The `--puppet-classes "nginx,common"` flag accepts a comma-separated list; users running into known intermittent issues with multi-class lookups may prefer `--puppet-class-ids` instead, but the post's syntax is documented as supported.
- The Katello repository creation example uses currently valid `--deb-releases` / `--deb-components` / `--deb-architectures` flags.
- Foreman 3.9 is an older Foreman release (the current series is in the 3.13+ range as of 2026). If this post is kept long-term, the version number should be bumped, but the structure and commands remain accurate for 3.9 itself.
