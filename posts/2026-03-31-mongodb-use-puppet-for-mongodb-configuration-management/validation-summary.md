# Validation Summary: How to Use Puppet for MongoDB Configuration Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- Puppet (configuration management)
- puppet-mongodb Forge module (puppet/mongodb v4.2.0)
- Hiera (Puppet data layer)
- Puppet Enterprise Orchestrator (`puppet job run`)

## Sources Consulted
- puppet/mongodb module source (GitHub: voxpupuli/puppet-mongodb) — parameter definitions in `mongodb::server`, `mongodb::globals`, resource types `mongodb_user`, `mongodb_database`, and function `mongodb_password`
- Puppet Forge module page: https://forge.puppet.com/modules/puppet/mongodb
- MongoDB documentation for built-in roles (`userAdminAnyDatabase`, `dbAdminAnyDatabase`, `clusterAdmin`, `readWrite`)
- MongoDB `rs.initiate()` and `rs.status()` shell command documentation

## Issues Found
1. **`ensure => running` on `mongodb::server` class** — The `ensure` parameter on `mongodb::server` controls package state and accepts `'present'` or `'absent'`, not `'running'`. The correct parameter for controlling the MongoDB service state is `service_ensure`. Changed `ensure => running` to `service_ensure => 'running'`.

## Review Notes
- `service_ensure` defaults to `'running'` in the module, so the line is technically optional, but including it explicitly is good practice for a tutorial.
- The production Hiera example binds MongoDB to `0.0.0.0` (all interfaces). This is valid when `auth => true` is set, but readers should ensure proper firewall rules are in place.
- The `puppet job run` command is specific to Puppet Enterprise; open-source Puppet users would use `puppet agent --test` on each node instead.
- The `mongodb_password()` function stores credentials in the manifest. In production, sensitive data should be managed via Hiera with encrypted backends (e.g., hiera-eyaml) rather than hardcoded in manifests.
