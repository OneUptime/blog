# Validation Summary: How to Configure Puppet Bolt for Ubuntu Task Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Puppet Bolt
- Ubuntu
- SSH and WinRM transports
- Bolt projects and inventory files
- Bolt tasks and plans
- Bash
- Python
- YAML
- HashiCorp Vault plugin configuration

## Sources Consulted
- Puppet Bolt install and upgrade documentation: https://help.puppet.com/bolt/current/topics/bolt_installing.htm
- Puppet Bolt project configuration reference: https://help.puppet.com/bolt/current/topics/bolt_project_reference.htm
- Puppet Bolt inventory file reference: https://help.puppet.com/bolt/current/topics/bolt_inventory_reference.htm
- Puppet Bolt transport configuration reference: https://help.puppet.com/bolt/current/topics/bolt_transports_reference.htm
- Puppet Bolt writing tasks documentation: https://help.puppet.com/bolt/current/topics/writing_tasks.htm
- Puppet Bolt writing Puppet language plans documentation: https://help.puppet.com/bolt/current/topics/writing_plans.htm
- Puppet Bolt writing YAML plans documentation: https://help.puppet.com/bolt/current/topics/writing_yaml_plans.htm
- Puppet Bolt module installation documentation: https://help.puppet.com/bolt/current/topics/bolt_installing_modules.htm
- Puppet Bolt plugin configuration documentation: https://www.puppet.com/docs/bolt/latest/configuring_bolt.html

## Issues Found
- The Ubuntu installation commands used the older unauthenticated `apt.puppet.com/puppet-tools-release` repository package. Updated the commands to use the current Puppet 8 repository package from `apt-puppetcore.puppet.com` and noted that Puppet Core or Puppet Enterprise credentials must be configured before `apt-get update`.
- The `bolt-project.yaml` example placed SSH transport settings under a top-level `config` key. Current Bolt project configuration does not use that key for target transport settings, so the example now keeps `bolt-project.yaml` to project metadata and module dependencies.
- The inventory example used `host` as a target object field and scalar `alias` values. Updated targets to use documented `uri` fields and alias arrays, and moved shared SSH defaults into the inventory's top-level `config` block.
- The Vault plugin example used a template-style `{{env.VAULT_TOKEN}}` token reference. Updated it to use Bolt plugin configuration with `auth`, `method: token`, and the `env_var` plugin.

## Review Notes
Bolt was not installed in the local environment, so CLI behavior was verified against the current official Puppet Bolt documentation rather than local `bolt --help` output.
