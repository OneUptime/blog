# How to Configure IPv6 with Puppet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Puppet, IPv6, Configuration Management, Automation, Linux, Networking

Description: A guide to configuring IPv6 network settings on Linux systems using Puppet manifests, including sysctl parameters, interface configuration, and firewall rules.

Puppet enables consistent IPv6 configuration across fleets of Linux servers through declarative manifests. This guide covers the key Puppet resources and patterns for deploying IPv6 configuration at scale.

## Puppet Module Structure

```text
modules/ipv6/
├── manifests/
│   ├── init.pp          # Main class
│   ├── sysctl.pp        # IPv6 kernel parameters
│   ├── firewall.pp      # IPv6 firewall rules
│   └── interface.pp     # Network interface config
└── files/
    ├── 60-ipv6.conf     # sysctl drop-in
    └── ip6tables.rules  # Firewall rules file
```

## Main IPv6 Class

```puppet
# modules/ipv6/manifests/init.pp

class ipv6 (
  Boolean $enable_forwarding = false,
  Boolean $enable_privacy    = true,
  Enum['0', '1', '2'] $accept_ra = '1',
) {
  class { 'ipv6::sysctl':
    enable_forwarding => $enable_forwarding,
    enable_privacy    => $enable_privacy,
    accept_ra         => $accept_ra,
  }
}
```

## IPv6 sysctl Configuration

```puppet
# modules/ipv6/manifests/sysctl.pp

class ipv6::sysctl (
  Boolean              $enable_forwarding = false,
  Boolean              $enable_privacy    = true,
  Enum['0', '1', '2']  $accept_ra         = '1',
) {
  # Enable IPv6
  sysctl { 'net.ipv6.conf.all.disable_ipv6':
    value => '0',
  }

  sysctl { 'net.ipv6.conf.default.disable_ipv6':
    value => '0',
  }

  # Enable routing when the node should forward IPv6 traffic
  sysctl { 'net.ipv6.conf.all.forwarding':
    value => $enable_forwarding ? {
      true    => '1',
      default => '0',
    },
  }

  sysctl { 'net.ipv6.conf.default.forwarding':
    value => $enable_forwarding ? {
      true    => '1',
      default => '0',
    },
  }

  # Accept Router Advertisements
  sysctl { 'net.ipv6.conf.all.accept_ra':
    value => $accept_ra,
  }

  sysctl { 'net.ipv6.conf.default.accept_ra':
    value => $accept_ra,
  }

  # Accept autoconfiguration (SLAAC) when Router Advertisements are enabled
  sysctl { 'net.ipv6.conf.all.autoconf':
    value => $accept_ra ? {
      '0'     => '0',
      default => '1',
    },
  }

  sysctl { 'net.ipv6.conf.default.autoconf':
    value => $accept_ra ? {
      '0'     => '0',
      default => '1',
    },
  }

  # Privacy extensions use temporary IPv6 addresses
  sysctl { 'net.ipv6.conf.all.use_tempaddr':
    value => $enable_privacy ? {
      true    => '2',
      default => '0',
    },
  }

  sysctl { 'net.ipv6.conf.default.use_tempaddr':
    value => $enable_privacy ? {
      true    => '2',
      default => '0',
    },
  }

  # Enable Duplicate Address Detection
  sysctl { 'net.ipv6.conf.all.accept_dad':
    value => '1',
  }

  sysctl { 'net.ipv6.conf.default.accept_dad':
    value => '1',
  }
}
```

## Using the sysctl Type

If a `sysctl` resource type is not available in your environment, manage a sysctl drop-in with core Puppet resources:

```puppet
class ipv6::sysctl {
  file { '/etc/sysctl.d/60-ipv6.conf':
    ensure => file,
    source => 'puppet:///modules/ipv6/60-ipv6.conf',
    notify => Exec['reload_sysctl'],
  }

  exec { 'reload_sysctl':
    command     => 'sysctl --system',
    path        => ['/usr/sbin', '/sbin', '/usr/bin', '/bin'],
    refreshonly => true,
  }
}
```

## IPv6 Firewall Rules with Puppet

```puppet
# modules/ipv6/manifests/firewall.pp

# Using puppetlabs/firewall module with IPv6 support

class ipv6::firewall {
  # Allow loopback
  firewall { '000 ip6 allow loopback':
    protocol => 'ip6tables',
    chain    => 'INPUT',
    iniface  => 'lo',
    jump     => 'accept',
  }

  # Allow established connections
  firewall { '001 ip6 allow established':
    protocol => 'ip6tables',
    chain    => 'INPUT',
    state    => ['ESTABLISHED', 'RELATED'],
    jump     => 'accept',
  }

  # Allow ICMPv6 (critical for IPv6 operation)
  firewall { '002 ip6 allow icmpv6':
    protocol => 'ip6tables',
    chain    => 'INPUT',
    proto    => 'ipv6-icmp',
    jump     => 'accept',
  }

  # Allow SSH over IPv6
  firewall { '010 ip6 allow ssh':
    protocol => 'ip6tables',
    chain    => 'INPUT',
    dport    => 22,
    proto    => 'tcp',
    jump     => 'accept',
  }

  # Allow HTTP and HTTPS over IPv6
  firewall { '020 ip6 allow http':
    protocol => 'ip6tables',
    chain    => 'INPUT',
    dport    => [80, 443],
    proto    => 'tcp',
    jump     => 'accept',
  }

  # Default deny
  firewall { '999 ip6 default deny':
    protocol => 'ip6tables',
    chain    => 'INPUT',
    jump     => 'drop',
  }
}
```

## IPv6 Network Interface Configuration

For Debian or Ubuntu systems using `ifupdown`, manage an interface drop-in like this:

```puppet
# modules/ipv6/manifests/interface.pp

class ipv6::interface (
  String $interface = 'eth0',
  Optional[String] $static_address = undef,
  String $prefix_length            = '64',
) {
  if $static_address {
    # Configure static IPv6 address
    file { "/etc/network/interfaces.d/${interface}-ipv6.cfg":
      ensure  => file,
      content => "iface ${interface} inet6 static\n" +
                 "    address ${static_address}\n" +
                 "    netmask ${prefix_length}\n",
    }
  }
}
```

## Hiera Integration for IPv6 Config

```yaml
# data/nodes/webserver01.yaml
ipv6::enable_forwarding: false
ipv6::enable_privacy: true
ipv6::accept_ra: '1'

# data/nodes/router01.yaml
ipv6::enable_forwarding: true
ipv6::enable_privacy: false
ipv6::accept_ra: '2'   # Accept RA even with forwarding enabled
```

## Applying the Module

```puppet
# site.pp or profile
node 'webserver01' {
  include ipv6
  include ipv6::firewall
}

node 'router01' {
  class { 'ipv6':
    enable_forwarding => true,
    enable_privacy    => false,
  }
}
```

```bash
# Apply configuration
puppet agent --test --verbose

# Check what would change without applying
puppet agent --test --noop
```

Puppet's declarative approach ensures IPv6 configuration is consistently applied and idempotent - running the manifest multiple times produces the same result, making it safe to apply across large server fleets.
