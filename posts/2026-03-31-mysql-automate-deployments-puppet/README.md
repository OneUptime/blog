# How to Automate MySQL Deployments with Puppet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Puppet, Automation, Configuration Management, DevOps

Description: Use Puppet to automate MySQL installation, configuration management, and database provisioning across your infrastructure.

---

## Puppet for MySQL Automation

Puppet is a configuration management tool that enforces the desired state of your infrastructure. For MySQL, Puppet ensures that every server has the correct version installed, the right configuration applied, and the expected databases and users present - automatically correcting drift whenever the Puppet agent runs.

## Setting Up the Puppet MySQL Module

The Puppet Forge provides a well-maintained MySQL module from Puppet Inc:

```bash
# Install the MySQL module
puppet module install puppetlabs-mysql

# Verify installation
puppet module list | grep mysql
```

## Basic MySQL Installation

Create a Puppet class to install and configure MySQL:

```puppet
# modules/profile/manifests/mysql/server.pp
class profile::mysql::server (
  String $root_password,
  Integer $max_connections      = 300,
  String $innodb_buffer_pool_size = '2G',
  String $bind_address          = '127.0.0.1',
) {

  class { '::mysql::server':
    root_password           => $root_password,
    remove_default_accounts => true,
    restart                 => true,
    override_options        => {
      'mysqld' => {
        'bind-address'              => $bind_address,
        'max_connections'           => $max_connections,
        'innodb_buffer_pool_size'   => $innodb_buffer_pool_size,
        'slow_query_log'            => 'ON',
        'slow_query_log_file'       => '/var/log/mysql/slow.log',
        'long_query_time'           => '1',
        'log_error'                 => '/var/log/mysql/error.log',
      },
    },
  }
}
```

## Managing Databases and Users

```puppet
# modules/profile/manifests/mysql/app_database.pp
class profile::mysql::app_database (
  String $db_name,
  String $app_user,
  String $app_password,
  String $allowed_host = '10.0.0.%',
) {

  mysql::db { $db_name:
    user     => $app_user,
    password => $app_password,
    host     => $allowed_host,
    grant    => ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
    charset  => 'utf8mb4',
    collate  => 'utf8mb4_unicode_ci',
  }

  # Create a read-only user for reporting
  mysql_user { "${app_user}_ro@${allowed_host}":
    ensure        => present,
    password_hash => mysql::password($app_password),
  }

  mysql_grant { "${app_user}_ro@${allowed_host}/${db_name}.*":
    ensure     => present,
    privileges => ['SELECT'],
    table      => "${db_name}.*",
    user       => "${app_user}_ro@${allowed_host}",
  }
}
```

## Applying Schema Migrations

```puppet
# Apply an SQL script with Puppet exec resource
exec { 'apply_schema_v2':
  command => "/usr/bin/mysql -u root -p${root_password} ${db_name} < /opt/migrations/v2_add_indexes.sql",
  unless  => "/usr/bin/mysql -u root -p${root_password} -e \"SELECT 1 FROM schema_migrations WHERE version='v2'\" ${db_name} | grep -q 1",
  require => Mysql::Db[$db_name],
}
```

## Node Classification

Apply the classes to your database nodes using Hiera:

```yaml
# hieradata/nodes/db-primary.prod.example.com.yaml
classes:
  - profile::mysql::server
  - profile::mysql::app_database

profile::mysql::server::root_password: "%{lookup('vault_mysql_root')}"
profile::mysql::server::max_connections: 500
profile::mysql::server::innodb_buffer_pool_size: '8G'
profile::mysql::server::bind_address: '0.0.0.0'

profile::mysql::app_database::db_name: 'myapp'
profile::mysql::app_database::app_user: 'app_user'
profile::mysql::app_database::app_password: "%{lookup('vault_app_db_password')}"
```

## Testing Puppet Code

```bash
# Validate Puppet syntax
puppet parser validate modules/profile/manifests/mysql/server.pp

# Run in dry-run (noop) mode
puppet agent --test --noop

# Apply the catalog
puppet agent --test
```

## Summary

Puppet automates MySQL deployments by declaring the desired state of your database servers using the `puppetlabs-mysql` module. Classes for server configuration, database creation, and user management are organized in a profile module and applied through Hiera node classification. Puppet's idempotent enforcement ensures configuration drift is automatically corrected on every agent run.
