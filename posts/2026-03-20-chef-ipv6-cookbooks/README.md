# How to Deploy IPv6 Configuration with Chef Cookbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chef, IPv6, Cookbook, Supermarket, Configuration Management, Automation

Description: A guide to using Chef Supermarket cookbooks for IPv6 configuration, including the sysctl, firewall, and network cookbooks for standardized IPv6 deployment.

Chef Supermarket cookbooks and Chef Infra's built-in resources can simplify IPv6 deployment. Leveraging existing building blocks reduces implementation time and provides tested code for common IPv6 configuration tasks.

## Key Chef Resources for IPv6

| Resource / Cookbook | Purpose |
|---|---|
| `sysctl` | Built-in Chef Infra resource for persistent sysctl management (replaces the deprecated `sysctl` cookbook) |
| `firewall` | Cross-platform firewall management; IPv6 rules are iptables-specific |
| `network_interfaces_v2` | Network interface management on older Ubuntu/RHEL/Windows targets |
| `os-hardening` | Security hardening including IPv6 settings |

## Installing Cookbooks with Berkshelf

Current Chef Workstation docs prefer Policyfiles, but Berkshelf is still available for Berksfile-based workflows.

```ruby
# Berksfile

source 'https://supermarket.chef.io'

cookbook 'firewall', '~> 6.3'
cookbook 'network_interfaces_v2', '~> 2.11'
cookbook 'os-hardening', '~> 4.2'
```

```bash
# Install all cookbooks

berks install
berks upload
```

## IPv6 sysctl with Chef Infra's `sysctl` Resource

The old `sysctl` cookbook's `sysctl_param` resource was promoted into Chef Infra as the built-in `sysctl` resource in Chef 14.

```ruby
# recipes/ipv6_sysctl.rb

# IPv6 parameters
sysctl 'net.ipv6.conf.all.disable_ipv6' do
  value 0
end

sysctl 'net.ipv6.conf.default.disable_ipv6' do
  value 0
end

sysctl 'net.ipv6.conf.all.accept_ra' do
  value 1
end

sysctl 'net.ipv6.conf.all.forwarding' do
  value node['ipv6']['forwarding'] ? 1 : 0
end

sysctl 'net.ipv6.conf.all.use_tempaddr' do
  value node['ipv6']['privacy']['use_tempaddr']
end
```

## IPv6 Firewall with the firewall Cookbook

For Linux IPv6 rules with the `firewall` cookbook, use the iptables solution so the cookbook manages both `iptables` and `ip6tables`:

```ruby
# recipes/ipv6_firewall.rb

# Use the iptables provider for IPv6 rules.
node.default['firewall']['solution'] = 'iptables'
node.default['firewall']['ipv6_enabled'] = true

include_recipe 'firewall::default'

# Allow loopback (both IPv4 and IPv6)
firewall_rule 'loopback' do
  interface 'lo'
  protocol :none
  command :allow
end

# Allow established sessions
firewall_rule 'established' do
  stateful [:established, :related]
  protocol :none
  command :allow
end

# Allow ICMPv6 (required for IPv6 operations)
firewall_rule 'icmpv6' do
  protocol :'ipv6-icmp'
  source '::/0'
  command :allow
end

# Allow SSH over IPv6
firewall_rule 'ssh_ipv6' do
  port 22
  protocol :tcp
  source '::/0'
  command :allow
end

# Allow HTTP and HTTPS over IPv6
firewall_rule 'web_ipv6' do
  port [80, 443]
  protocol :tcp
  source '::/0'
  command :allow
end

# The iptables provider defaults INPUT and FORWARD to DROP.
```

## Network Interface Configuration

On Debian/Ubuntu, configure IPv6 with the cookbook's `ipv6` attribute instead of shelling out with `post_up` commands:

```ruby
# recipes/ipv6_interface.rb

# Configure eth0 with static IPv6
network_interface 'eth0_inet6' do
  device 'eth0'
  ipv6 true
  bootproto 'static'
  address '2001:db8::10'
  netmask '64'
  gateway '2001:db8::1'
end
```

## Wrapper Cookbook Pattern

Create a wrapper cookbook that customizes community cookbooks:

```ruby
# my_company_ipv6/recipes/default.rb

# Override firewall defaults
node.default['firewall']['solution'] = 'iptables'
node.default['firewall']['ipv6_enabled'] = true

# Include community cookbook
include_recipe 'firewall::default'

# Apply IPv6 sysctl settings with Chef Infra's built-in resource
sysctl 'net.ipv6.conf.all.disable_ipv6' do
  value 0
end
```

## Chef Testing for IPv6 Cookbooks

```ruby
# test/integration/default/ipv6_test.rb

describe 'IPv6 Configuration' do
  # Test sysctl settings
  describe kernel_parameter('net.ipv6.conf.all.disable_ipv6') do
    its('value') { should eq 0 }
  end

  describe kernel_parameter('net.ipv6.conf.all.accept_ra') do
    its('value') { should eq 1 }
  end

  # Test IPv6 firewall rules on the iptables backend
  describe command('ip6tables -S INPUT') do
    its('stdout') { should match /-A INPUT .* -p ipv6-icmp .* -j ACCEPT/ }
    its('stdout') { should match /-A INPUT .* -p tcp .* --dport 22 .* -j ACCEPT/ }
  end

  # Test that a global IPv6 address is configured
  describe command('ip -6 addr show scope global') do
    its('stdout') { should_not be_empty }
  end
end
```

```bash
# Run tests with Kitchen
kitchen test

# Or run specific test suite
kitchen converge && kitchen verify
```

Using Chef Infra resources and Chef Supermarket cookbooks for IPv6 deployment can reduce development time while ensuring consistent IPv6 configuration across your infrastructure.
