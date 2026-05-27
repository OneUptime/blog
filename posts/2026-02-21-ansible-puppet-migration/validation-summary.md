# Validation Summary: How to Use Ansible with Puppet for Migration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible playbooks, roles, handlers, facts, and cron automation
- Ansible `ansible-pull`
- Puppet manifests, classes, modules, and agent configuration paths
- Configuration management migration patterns

## Sources Consulted
- Ansible `ansible.builtin.pip` module docs: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Ansible `ansible-pull` CLI docs: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-pull.html
- Ansible `ansible.builtin.cron` module docs: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.hostname` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `community.general.timezone` module docs: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module docs: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Puppet class definition docs: https://help.puppet.com/core/current/Content/PuppetCore/lang_class_define.htm
- Puppet class declaration docs: https://help.puppet.com/core/current/Content/PuppetCore/lang_class_declare.htm
- Puppet configuration directory docs: https://help.puppet.com/core/current/Content/PuppetCore/dirs_confdir.htm
- Puppet `puppet.conf` docs: https://help.puppet.com/core/current/Content/PuppetCore/config_file_main.htm

## Issues Found
- The Puppet disable example edited `/etc/puppet/puppet.conf` as if Puppet classes were configured there. Updated it to remove `include` declarations from a modern Puppet environment `site.pp`, because Puppet classes are declared in manifests or assigned through an ENC rather than in `puppet.conf`.
- The same example used a YAML double-quoted regex containing `\s`, which is not a valid YAML escape. Changed it to single quotes so the regex parses correctly.
- The Puppet removal example omitted modern Puppet Labs paths. Added `/etc/puppetlabs` and `/var/log/puppetlabs` alongside the existing legacy paths.
- The infrastructure example used `ansible.builtin.timezone`, but the current documented module is `community.general.timezone`. Updated the FQCN.
- The SSH restart handler hard-coded `sshd`, which is wrong for Debian-family systems that commonly use the `ssh` service name. Updated the handler to choose `ssh` on Debian-family hosts and `sshd` elsewhere.
- The fallback task in the error-handling example would stop the play if the fallback command failed, preventing the later explicit failure task from running. Added `failed_when: false` to the fallback task.
- The scheduled scan example copied a script into `/opt/scripts` without creating the directory first. Added a directory creation task.
- The scheduled scan cron job used `user: ansible` without creating or requiring that user. Changed it to `root`, which matches the play's privileged setup.

## Review Notes
The corrected YAML examples parse successfully. The migration strategy is directionally accurate, but real Puppet-to-Ansible migrations still need environment-specific handling for ENC-managed classes, Hiera data, exported resources, PuppetDB dependencies, and OS-specific package/service names.
