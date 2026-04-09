# Validation Summary: How to Deploy Ceph Using Puppet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage)
- Puppet (configuration management)
- puppet-ceph module (openstack-ceph on Puppet Forge)
- r10k / Puppet Code Manager
- BlueStore (Ceph OSD backend)
- cephx (Ceph authentication)

## Sources Consulted
- Puppet Forge page for openstack-ceph: https://forge.puppet.com/modules/openstack/ceph
- puppet-ceph source repository on OpenDev: https://opendev.org/openstack/puppet-ceph
- puppet-ceph GitHub mirror: https://github.com/openstack/puppet-ceph
- puppet-ceph manifests: `init.pp` (ceph class), `mon.pp` (ceph::mon), `osd.pp` (ceph::osd), `key.pp` (ceph::key), `pool.pp` (ceph::pool)

## Issues Found

### 1. Non-existent `conf` hash parameter on `ceph` class (HIGH severity)
**What was wrong:** The "Configuring ceph.conf" section used a `conf =>` hash parameter on the `ceph` class to pass arbitrary configuration sections. This parameter does not exist in the puppet-ceph module. The class uses individual named parameters (`osd_pool_default_size`, `public_network`, `cluster_network`, etc.) and the `ceph_config` resource type for additional settings.

**What was changed:** Replaced the `conf` hash with the correct individual class parameters (`osd_pool_default_size`, `osd_pool_default_min_size`, `osd_journal_size`, `public_network`, `cluster_network`). Added a separate example showing `ceph_config` for settings not exposed as class parameters. Also removed the `filestore_xattr_use_omap` setting which is FileStore-specific and misleading in a post that uses BlueStore for OSDs.

**Why:** Using `conf =>` would cause a Puppet catalog compilation error (unknown parameter). The corrected code uses the actual module API.

### 2. Incorrect `tag` parameter on `ceph::pool` (HIGH severity)
**What was wrong:** The pool creation example used `tag => 'rbd'`. The correct parameter name is `application`, not `tag`.

**What was changed:** Changed `tag => 'rbd'` to `application => 'rbd'`.

**Why:** Using `tag =>` would cause a Puppet catalog compilation error (unknown parameter). The `application` parameter maps to the `ceph osd pool application enable` command.

## Review Notes
- Version 3.0.0 of openstack-ceph is a real and valid version, but the latest available is 8.0.0. The post does not claim 3.0.0 is the latest, so this is not an error, but readers should be aware newer versions exist with additional features and compatibility.
- The module has additional dependencies beyond `puppetlabs-stdlib` and `puppetlabs-concat` (including `puppetlabs-apt`, `puppetlabs-inifile`, `openstack-openstacklib`). The blog only lists the two most common ones in the Puppetfile example; r10k would resolve transitive dependencies automatically, so this is not a blocking issue.
- The `ceph::key` resource type also supports a `cap_mgr` parameter (for Ceph Manager daemon capabilities) which is not mentioned in the post. This is an omission rather than an error.
- The `puppet job run --nodes` command requires Puppet Enterprise; open-source Puppet users would need alternative orchestration. This could be noted but is not incorrect.
