# How to Manage Redis with Puppet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Puppet, Configuration Management, Automation, Infrastructure

Description: Learn how to manage Redis with Puppet - covering module usage, installation automation, configuration templating, service management, and idempotent Redis deployments.

---

Puppet enables declarative, idempotent Redis management. By defining your Redis configuration as Puppet manifests, you ensure consistent deployments across all environments and make configuration changes auditable and version-controlled.

## Install the Redis Puppet Module

Use the community Redis module from Puppet Forge:

```bash
puppet module install puppet-redis
```

## Basic Redis Installation

Define a node manifest to install and configure Redis:

```puppet
# manifests/nodes/redis_server.pp
node 'redis-server.example.com' {
  class { 'redis':
    bind             => '0.0.0.0',
    requirepass      => lookup('redis::password'),
    maxmemory        => '2gb',
    maxmemory_policy => 'allkeys-lru',
    save_db_to_disk          => true,
    save_db_to_disk_interval => { '900' => '1', '300' => '10', '60' => '10000' },
    log_level                => 'notice',
    log_file                 => '/var/log/redis/redis-server.log',
  }
}
```

## Manage Redis Configuration with Templates

For fine-grained control, manage the configuration file directly:

```puppet
# manifests/redis.pp
class profile::redis (
  String           $bind_address = '127.0.0.1',
  Integer          $port         = 6379,
  String           $maxmemory    = '1gb',
  String           $eviction     = 'allkeys-lru',
  Boolean          $aof_enabled  = false,
  Optional[String] $replicaof    = undef,
) {

  package { 'redis-server':
    ensure => installed,
  }

  file { '/etc/redis/redis.conf':
    ensure  => file,
    owner   => 'redis',
    group   => 'redis',
    mode    => '0640',
    content => template('profile/redis/redis.conf.erb'),
    notify  => Service['redis-server'],
    require => Package['redis-server'],
  }

  service { 'redis-server':
    ensure  => running,
    enable  => true,
    require => File['/etc/redis/redis.conf'],
  }
}
```

## Create a Configuration Template

```erb
<%# templates/redis/redis.conf.erb %>
bind <%= @bind_address %>
port <%= @port %>

maxmemory <%= @maxmemory %>
maxmemory-policy <%= @eviction %>

loglevel notice
logfile /var/log/redis/redis-server.log

<% if @aof_enabled %>
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
<% else %>
appendonly no
<% end %>

save 900 1
save 300 10
save 60 10000

<% if @replicaof %>
replicaof <%= @replicaof %>
<% end %>
```

## Manage Redis Cluster Nodes

Define multiple Redis nodes with different roles:

```yaml
# Hiera data for cluster nodes
# data/nodes/redis-primary.yaml
profile::redis::bind_address: '10.0.0.1'
profile::redis::port: 6379

# data/nodes/redis-replica.yaml
profile::redis::bind_address: '10.0.0.2'
profile::redis::replicaof: '10.0.0.1 6379'
```

```puppet
# manifests/redis_cluster.pp
class profile::redis_cluster {
  # Hiera provides node-specific values for profile::redis parameters
  # Replicas automatically get replicaof via Hiera data
  include profile::redis
}
```

## Run Puppet and Verify

```bash
# Test catalog compilation
puppet agent --noop --verbose

# Apply configuration
puppet agent --onetime --verbose

# Verify Redis is running with correct config
redis-cli CONFIG GET maxmemory
redis-cli CONFIG GET maxmemory-policy
```

## Enforce Firewall Rules with Puppet

```puppet
class profile::redis_firewall {
  firewall { '100 allow redis from app servers':
    dport   => 6379,
    source  => '10.0.0.0/24',
    proto   => 'tcp',
    action  => 'accept',
  }

  firewall { '101 deny redis from all others':
    dport   => 6379,
    proto   => 'tcp',
    action  => 'drop',
  }
}
```

## Summary

Puppet enables consistent, idempotent Redis management through declarative manifests and ERB templates. Define your Redis configuration in version-controlled manifests, use Hiera for environment-specific values like passwords and memory limits, and apply configurations with `puppet agent`. Changes are automatically applied across your fleet, and any configuration drift is corrected on the next Puppet run.
