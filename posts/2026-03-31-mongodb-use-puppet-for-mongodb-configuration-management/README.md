# How to Use Puppet for MongoDB Configuration Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Puppet, Configuration Management

Description: Automate MongoDB installation and configuration across your infrastructure using Puppet manifests, modules, and Hiera data for consistent deployments.

---

## Why Puppet for MongoDB

Puppet enforces desired state across your infrastructure. Once you define how MongoDB should be configured in a manifest, Puppet agents running on each node periodically check and correct any drift. This is especially valuable for replica sets and sharded clusters where configuration consistency is critical.

## Installing the Puppet MongoDB Module

Use the Puppet Forge module maintained by the community:

```bash
puppet module install puppet-mongodb --version 4.2.0
```

## Basic Manifest

Create `site.pp` or a profile class to declare MongoDB:

```puppet
class profile::mongodb (
  String $version      = '7.0',
  String $bind_ip      = '127.0.0.1',
  Integer $port        = 27017,
  String $replset_name = 'rs0',
) {

  class { 'mongodb::globals':
    manage_package_repo => true,
    version             => $version,
  }

  class { 'mongodb::server':
    bind_ip => [$bind_ip],
    port    => $port,
    replset => $replset_name,
    auth           => true,
    service_ensure => 'running',
  }

  class { 'mongodb::client': }
}
```

## Hiera Data

Store environment-specific values in Hiera to keep manifests generic. In `data/production.yaml`:

```yaml
profile::mongodb::version: '7.0'
profile::mongodb::bind_ip: '0.0.0.0'
profile::mongodb::port: 27017
profile::mongodb::replset_name: 'rs0'
```

For staging in `data/staging.yaml`:

```yaml
profile::mongodb::version: '7.0'
profile::mongodb::bind_ip: '127.0.0.1'
profile::mongodb::port: 27017
profile::mongodb::replset_name: 'staging-rs0'
```

## Managing MongoDB Users with Puppet

Declare database users declaratively:

```puppet
mongodb_user { 'admin':
  ensure        => present,
  password_hash => mongodb_password('admin', 'strongpassword'),
  database      => 'admin',
  roles         => ['userAdminAnyDatabase', 'dbAdminAnyDatabase', 'clusterAdmin'],
  require       => Class['mongodb::server'],
}

mongodb_user { 'appuser':
  ensure        => present,
  password_hash => mongodb_password('appuser', 'apppassword'),
  database      => 'myapp',
  roles         => ['readWrite'],
  require       => Mongodb_user['admin'],
}
```

## Creating Databases

```puppet
mongodb_database { 'myapp':
  ensure  => present,
  require => Mongodb_user['admin'],
}
```

## Replica Set Initialization

For replica set initialization on the primary, use an exec resource with an unless guard:

```puppet
exec { 'initialize_replica_set':
  command => '/usr/bin/mongosh --eval "rs.initiate({_id: \'rs0\', members: [{_id: 0, host: \'localhost:27017\'}]})"',
  unless  => '/usr/bin/mongosh --quiet --eval "quit(rs.status().ok === 1 ? 0 : 1)"',
  require => Class['mongodb::server'],
}
```

## Applying the Configuration

On the Puppet primary, trigger a catalog compile and agent run:

```bash
# Test in noop mode first
puppet agent --test --noop

# Apply changes
puppet agent --test

# Force an immediate run on a specific node
puppet job run --nodes db-node-01.example.com
```

Check drift reports in the Puppet console or via PuppetDB to confirm all nodes converged.

## Summary

Puppet brings infrastructure-as-code discipline to MongoDB management. Using the community Forge module combined with Hiera for environment-specific data separation, you can manage MongoDB versions, users, databases, and replica sets across hundreds of nodes from a single manifest. Noop mode lets you preview changes safely before applying them, reducing the risk of unplanned downtime.
