# Validation Summary: How to Manage Redis with Puppet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Puppet (configuration management)
- puppet/redis module (Vox Pupuli, Puppet Forge)
- puppetlabs-firewall module
- puppetlabs-stdlib (file_line resource)
- Hiera (Puppet data layer)
- ERB templating

## Sources Consulted
- puppet/redis module on Puppet Forge: https://forge.puppet.com/modules/puppet/redis
- puppet/redis module reference: https://forge.puppet.com/modules/puppet/redis/reference
- arioch/redis (deprecated) on Puppet Forge: https://forge.puppet.com/modules/arioch/redis
- voxpupuli/puppet-redis on GitHub: https://github.com/voxpupuli/puppet-redis
- Puppet lookup documentation: https://www.puppet.com/docs/puppet/7/hiera_automatic.html
- Puppet facts and built-in variables: https://www.puppet.com/docs/puppet/7/lang_facts_builtin_variables.html
- file_line resource type (puppetlabs-stdlib): https://www.puppetmodule.info/modules/puppetlabs-stdlib/9.5.0/puppet_types/file_line
- Puppet agent man page: https://www.puppet.com/docs/puppet/5.5/man/agent.html
- puppetlabs-firewall module: https://github.com/puppetlabs/puppetlabs-firewall

## Issues Found

1. **Deprecated module name**: `puppet module install arioch-redis` used the old module name deprecated since March 2019. Changed to `puppet module install puppet-redis` (the current Vox Pupuli maintained module).

2. **Incorrect parameter name `save`**: The puppet/redis module does not have a `save` parameter taking an array of strings. Changed to `save_db_to_disk_interval` with a Hash format (`{ '900' => '1', '300' => '10', '60' => '10000' }`), which is the correct parameter name and type.

3. **Incorrect parameter name `loglevel`**: The puppet/redis module uses `log_level` (with underscore), not `loglevel`. Fixed.

4. **Incorrect parameter name `logfile`**: The puppet/redis module uses `log_file` (with underscore), not `logfile`. Fixed.

5. **Undefined variable `${profile::redis::primary_host}`**: The cluster manifest referenced a variable that was never defined in any class or Hiera data. This would cause a Puppet compilation error.

6. **Hiera data referenced undefined class parameters**: The Hiera data included `profile::redis::cluster_enabled` and `profile::redis::replicaof`, but neither parameter was defined in the `profile::redis` class. Removed `cluster_enabled` (unused anywhere) and added `$replicaof` as an `Optional[String]` parameter to the class.

7. **`file_line` on template-managed file breaks idempotency**: The original cluster manifest used `file_line` to modify `/etc/redis/redis.conf`, which is also managed by a `file` resource with ERB template content. On each Puppet run, the `file` resource would overwrite the template (removing replicaof), then `file_line` would re-add it — breaking idempotency and causing unnecessary service restarts. Fixed by incorporating `replicaof` into the ERB template and using Hiera data for node-level differentiation.

8. **Hiera data code fence**: Changed from ` ```puppet ` to ` ```yaml ` since the block contains YAML (Hiera data files), not Puppet DSL.

## Review Notes
- The `action` parameter in the firewall rules (`action => 'accept'`, `action => 'drop'`) is correct for puppetlabs-firewall v2.x but has been deprecated in v3+ in favor of the `jump` parameter. This is acceptable for now since v2.x is still widely deployed, but may need updating in the future.
- The section title "Manage Redis Cluster Nodes" describes a primary-replica setup, not Redis Cluster (which is a distinct feature with hash slots and automatic sharding). This is a naming ambiguity but not a code error.
