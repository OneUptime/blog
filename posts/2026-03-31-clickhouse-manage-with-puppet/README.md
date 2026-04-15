# How to Manage ClickHouse with Puppet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Puppet, Configuration Management, DevOps, Automation

Description: Learn how to install and configure ClickHouse using Puppet manifests with package, file, and service resources for idempotent server management.

---

## Why Puppet for ClickHouse Management

Puppet's declarative model makes it well-suited for managing ClickHouse at scale. You define the desired state - package installed, config file present, service running - and Puppet converges each node to match.

## Adding the ClickHouse Repository

```puppet
class clickhouse::repo {
  exec { 'add-clickhouse-key':
    command => 'curl -fsSL https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key | apt-key add -',
    path    => ['/usr/bin', '/bin'],
    unless  => 'apt-key list | grep -q ClickHouse',
  }

  file { '/etc/apt/sources.list.d/clickhouse.list':
    ensure  => present,
    content => "deb https://packages.clickhouse.com/deb lts main\n",
    require => Exec['add-clickhouse-key'],
  }

  exec { 'apt-update-clickhouse':
    command     => 'apt-get update',
    path        => ['/usr/bin'],
    refreshonly => true,
    subscribe   => File['/etc/apt/sources.list.d/clickhouse.list'],
  }
}
```

## Installing ClickHouse

```puppet
class clickhouse::install {
  package { ['clickhouse-server', 'clickhouse-client']:
    ensure  => present,
    require => Class['clickhouse::repo'],
  }
}
```

## Managing the Configuration File

```puppet
class clickhouse::config (
  String $listen_host      = '0.0.0.0',
  Integer $max_connections = 4096,
  String $log_level        = 'warning',
) {
  file { '/etc/clickhouse-server/config.xml':
    ensure  => present,
    owner   => 'clickhouse',
    group   => 'clickhouse',
    mode    => '0640',
    content => template('clickhouse/config.xml.erb'),
    require => Package['clickhouse-server'],
    notify  => Service['clickhouse-server'],
  }
}
```

## Managing the Service

```puppet
class clickhouse::service {
  service { 'clickhouse-server':
    ensure  => running,
    enable  => true,
    require => [
      Package['clickhouse-server'],
      File['/etc/clickhouse-server/config.xml'],
    ],
  }
}
```

## Main clickhouse Class

```puppet
class clickhouse (
  String $listen_host      = '0.0.0.0',
  Integer $max_connections = 4096,
) {
  contain clickhouse::repo
  contain clickhouse::install

  class { 'clickhouse::config':
    listen_host     => $listen_host,
    max_connections => $max_connections,
  }
  contain clickhouse::config

  contain clickhouse::service

  Class['clickhouse::repo']
  -> Class['clickhouse::install']
  -> Class['clickhouse::config']
  ~> Class['clickhouse::service']
}
```

## Applying to a Node

```puppet
node 'ch01.example.com' {
  class { 'clickhouse':
    listen_host      => '0.0.0.0',
    max_connections  => 8192,
  }
}
```

## Running Puppet Agent

```bash
puppet agent --test --noop   # dry run
puppet agent --test          # apply
```

## Summary

Puppet manages ClickHouse using the standard `package`, `file`, and `service` resource types. Structure the module into `repo`, `install`, `config`, and `service` classes with explicit dependency ordering using `->` and notification using `~>`. Use class parameters and ERB templates to make the configuration data-driven and reusable across environments.
