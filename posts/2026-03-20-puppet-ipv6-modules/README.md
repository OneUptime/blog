# How to Deploy IPv6 Configuration with Puppet Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Puppet, IPv6, Module, Forge, Configuration Management, Network

Description: A guide to using Puppet Forge modules for IPv6 network configuration, including the network, firewall, and sysctl modules for deploying IPv6 at scale.

The Puppet Forge provides community-maintained modules that simplify IPv6 configuration. Rather than writing all configuration from scratch, leverage existing modules for network interface management, ip6tables firewall rules, and sysctl parameters.

## Key Puppet Forge Modules for IPv6

| Module | Author | Purpose |
|---|---|---|
| `puppetlabs/firewall` | puppetlabs | ip6tables management |
| `puppet/augeasproviders_sysctl` | Vox Pupuli | sysctl management |
| `puppet/network` | Vox Pupuli | Network interface config |
| `saz/sysctl` | saz | Alternative sysctl module |

## Installing Modules

```bash
# Install required modules

puppet module install puppetlabs-firewall
puppet module install puppet-augeasproviders_sysctl
puppet module install puppet-network

# List installed modules
puppet module list
```

## IPv6 sysctl with augeasproviders_sysctl

```puppet
# Manage IPv6 kernel parameters declaratively
class profile::ipv6::sysctl (
  $forwarding = '0',
) {

  sysctl { 'net.ipv6.conf.all.disable_ipv6':
    value => '0',
  }

  sysctl { 'net.ipv6.conf.default.disable_ipv6':
    value => '0',
  }

  sysctl { 'net.ipv6.conf.all.accept_ra':
    value => '1',
  }

  sysctl { 'net.ipv6.conf.all.forwarding':
    value => $forwarding,
  }

  sysctl { 'net.ipv6.conf.all.use_tempaddr':
    value => '1',
  }
}
```

## IPv6 Firewall with puppetlabs/firewall

The puppetlabs/firewall module supports both iptables and ip6tables:

```puppet
class profile::ipv6::firewall {
  # Install firewall dependencies and manage rules
  class { 'firewall': }

  # Purge unmanaged firewall rules
  resources { 'firewall':
    purge => true,
  }

  # Rules with protocol => ip6tables target IPv6
  Firewall {
    before  => Class['profile::ipv6::firewall::post'],
    require => Class['profile::ipv6::firewall::pre'],
  }

  class { ['profile::ipv6::firewall::pre', 'profile::ipv6::firewall::post']: }
}

class profile::ipv6::firewall::pre {
  firewall { '000 ip6 accept loopback':
    protocol => 'ip6tables',
    chain    => 'INPUT',
    proto    => 'all',
    iniface  => 'lo',
    jump     => 'accept',
  }

  firewall { '001 ip6 accept established':
    protocol => 'ip6tables',
    chain    => 'INPUT',
    proto    => 'all',
    state    => ['ESTABLISHED', 'RELATED'],
    jump     => 'accept',
  }

  firewall { '002 ip6 accept icmpv6':
    protocol => 'ip6tables',
    chain    => 'INPUT',
    proto    => 'ipv6-icmp',
    jump     => 'accept',
  }

  firewall { '010 ip6 accept ssh':
    protocol => 'ip6tables',
    chain    => 'INPUT',
    dport    => 22,
    proto    => 'tcp',
    jump     => 'accept',
  }

  firewall { '020 ip6 accept http https':
    protocol => 'ip6tables',
    chain    => 'INPUT',
    dport    => [80, 443],
    proto    => 'tcp',
    jump     => 'accept',
  }
}

class profile::ipv6::firewall::post {
  firewall { '999 ip6 drop all':
    protocol => 'ip6tables',
    chain    => 'INPUT',
    proto    => 'all',
    jump     => 'drop',
    before   => undef,
  }
}
```

## Network Interface with puppet/network Module

```puppet
class profile::ipv6::interface {
  # Debian/Ubuntu ifupdown systems: manage an IPv6 stanza in /etc/network/interfaces
  network_config { 'eth0':
    ensure    => 'present',
    family    => 'inet6',
    method    => 'static',
    ipaddress => '2001:db8::10',
    netmask   => '64',
    onboot    => 'true',
    options   => {
      'gateway' => '2001:db8::1',
    },
  }
}
```

## Profile-Based IPv6 Deployment

```puppet
# profiles/manifests/ipv6/base.pp
class profile::ipv6::base (
  $forwarding = '0',
) {
  class { 'profile::ipv6::sysctl':
    forwarding => $forwarding,
  }
  include profile::ipv6::firewall
}

# profiles/manifests/ipv6/router.pp
class profile::ipv6::router {
  class { 'profile::ipv6::base':
    forwarding => '1',
  }
}

# Role assignments
node 'webserver01' {
  class { 'profile::ipv6::base': }
}

node 'router01' {
  include profile::ipv6::router
}
```

```bash
# Run an agent test on a node
puppet agent --test --verbose

# Upgrade the module to the latest release
puppet module upgrade puppetlabs-firewall

# Run tests for module
pdk test unit
```

Using Puppet Forge modules for IPv6 configuration reduces the amount of custom code needed and provides battle-tested implementations of sysctl management, firewall rules, and network configuration maintained by the Puppet community.
