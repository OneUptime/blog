# How to Automate IPv6 Router Advertisement Daemon with Puppet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Puppet, Radvd, IPv6, Router Advertisement, SLAAC, Automation

Description: A guide to automating radvd (Router Advertisement Daemon) configuration using Puppet for consistent IPv6 SLAAC deployment across network infrastructure.

radvd (Router Advertisement Daemon) is the standard tool for sending IPv6 Router Advertisements on Linux, enabling SLAAC (Stateless Address AutoConfiguration) for connected clients. Puppet can manage radvd configuration consistently across all router and gateway systems.

## Puppet Module for radvd

```puppet
# modules/radvd/manifests/init.pp

class radvd (
  Boolean $enable          = true,
  Hash    $interfaces      = {},
  String  $package_name    = 'radvd',
  String  $service_name    = 'radvd',
  String  $config_file     = '/etc/radvd.conf',
) {
  # Install radvd
  package { $package_name:
    ensure => installed,
  }

  # Generate configuration
  file { $config_file:
    ensure  => file,
    content => template('radvd/radvd.conf.erb'),
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    require => Package[$package_name],
    notify  => Service[$service_name],
  }

  # Manage radvd service
  service { $service_name:
    ensure    => $enable ? { true => 'running', false => 'stopped' },
    enable    => $enable,
    hasstatus => true,
    require   => [
      Package[$package_name],
      File[$config_file],
    ],
  }
}
```

## radvd Configuration Template

```erb
<%# modules/radvd/templates/radvd.conf.erb %>
# radvd.conf - Managed by Puppet

# Node: <%= @hostname %>
# Environment: <%= scope['environment'] %>

<% @interfaces.sort.each do |iface, config| -%>
interface <%= iface %> {
    AdvSendAdvert on;
    AdvManagedFlag <%= config.fetch('managed', false) ? 'on' : 'off' %>;
    AdvOtherConfigFlag <%= config.fetch('other_config', false) ? 'on' : 'off' %>;
    AdvDefaultLifetime <%= config.fetch('router_lifetime', 3600) %>;
    AdvDefaultPreference <%= config.fetch('preference', 'medium') %>;

<% if config['prefixes'] -%>
<% config['prefixes'].each do |prefix, prefix_config| -%>
    prefix <%= prefix %> {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime <%= prefix_config.fetch('valid_lifetime', 86400) %>;
        AdvPreferredLifetime <%= prefix_config.fetch('preferred_lifetime', 14400) %>;
    };

<% end -%>
<% end -%>
<% if config['rdnss'] -%>
    RDNSS <%= config['rdnss'].join(' ') %> {
        AdvRDNSSLifetime 3600;
    };

<% end -%>
<% if config['dnssl'] -%>
    DNSSL <%= config['dnssl'].join(' ') %> {
        AdvDNSSLLifetime 3600;
    };

<% end -%>
};

<% end -%>
```

## Hiera Data for radvd

```yaml
# data/nodes/router01.yaml

radvd::enable: true
radvd::interfaces:
  eth1:
    router_lifetime: 3600
    preference: 'medium'
    managed: false
    other_config: false
    prefixes:
      '2001:db8:100::/64':
        valid_lifetime: 86400
        preferred_lifetime: 14400
    rdnss:
      - '2001:db8::53'
      - '2001:4860:4860::8888'
    dnssl:
      - 'office.example.com'
      - 'example.com'

  eth2:
    prefixes:
      '2001:db8:200::/64':
        valid_lifetime: 43200
        preferred_lifetime: 7200
```

## Using the radvd Class

```puppet
# site.pp or profiles

node 'router01' {
  # Ensure IPv6 forwarding is enabled separately on the host.

  # Configure radvd using Hiera data
  include radvd
}

# Or explicit class instantiation:
class { 'radvd':
  enable     => true,
  interfaces => {
    'eth1' => {
      'prefixes' => {
        '2001:db8:101::/64' => {
          'valid_lifetime'     => 86400,
          'preferred_lifetime' => 14400,
        },
      },
      'rdnss' => ['2001:db8::53'],
    },
  },
}
```

## Testing radvd Configuration

```puppet
# spec/classes/radvd_spec.rb

require 'spec_helper'

describe 'radvd' do
  let(:params) do
    {
      enable: true,
      interfaces: {
        'eth1' => {
          'prefixes' => {
            '2001:db8::/64' => {
              'valid_lifetime' => 86400,
              'preferred_lifetime' => 14400,
            },
          },
        },
      },
    }
  end

  it { is_expected.to contain_package('radvd').with_ensure('installed') }
  it { is_expected.to contain_file('/etc/radvd.conf') }
  it { is_expected.to contain_service('radvd').with_ensure('running') }
  it {
    is_expected.to contain_file('/etc/radvd.conf')
      .with_content(%r{prefix 2001:db8::/64})
  }
end
```

```bash
# Run Puppet agent to deploy radvd
puppet agent --test

# Verify radvd is running and sending RAs
sudo systemctl status radvd
sudo radvdump
```

Automating radvd with Puppet ensures consistent Router Advertisement configuration across all IPv6 gateways, with Hiera providing a clean interface for per-site prefix and DNS server customization without modifying the module itself.
