# How to Automate IPv6 Firewall Rules with Chef

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chef, IPv6, Firewall, Ip6tables, Automation, Security

Description: A guide to automating IPv6 firewall rule management with Chef using the firewall cookbook and custom resources for consistent ip6tables deployment.

The community `firewall` cookbook on Chef Supermarket can manage firewall rules declaratively. This guide covers implementing a comprehensive IPv6 firewall policy using Chef resources, with support for different server roles.

## Setup: Installing the firewall Cookbook

```ruby
# Berksfile

source 'https://supermarket.chef.io'
cookbook 'firewall', '~> 7.0'
```

```bash
berks install && berks upload
```

## Base IPv6 Firewall Recipe

```ruby
# cookbooks/ipv6_firewall/recipes/base.rb

# Use the iptables provider rather than the platform default firewall.
node.default['firewall']['solution'] = 'iptables'

# We'll define the IPv6 established rule explicitly below.
node.default['firewall']['allow_established'] = false

# Include the firewall cookbook
include_recipe 'firewall'

# Allow loopback interface
firewall_rule 'ipv6_loopback' do
  interface 'lo'
  command :allow
  position 1
end

# Allow established and related connections
firewall_rule 'ipv6_established' do
  stateful [:established, :related]
  command :allow
  position 2
end

# CRITICAL: Allow ICMPv6 (breaks IPv6 if blocked)
# Packet Too Big, NDP, Router Discovery all require ICMPv6
firewall_rule 'ipv6_icmpv6_all' do
  protocol :icmp
  source '::/0'
  command :allow
  position 3
end

# Drop all other INPUT traffic
firewall_rule 'ipv6_drop_all' do
  command :deny
  direction :in
  position 99
end
```

## Role-Based IPv6 Firewall Rules

```ruby
# cookbooks/ipv6_firewall/recipes/web_server.rb

include_recipe 'ipv6_firewall::base'

# Allow HTTP and HTTPS from any IPv6
firewall_rule 'ipv6_http' do
  port 80
  protocol :tcp
  source '::/0'
  command :allow
  position 10
end

firewall_rule 'ipv6_https' do
  port 443
  protocol :tcp
  source '::/0'
  command :allow
  position 11
end
```

```ruby
# cookbooks/ipv6_firewall/recipes/database.rb

include_recipe 'ipv6_firewall::base'

# Allow PostgreSQL only from application server subnet
firewall_rule 'ipv6_postgres' do
  port 5432
  protocol :tcp
  source '2001:db8:100::/48'    # App server IPv6 subnet
  command :allow
  position 10
end

firewall_rule 'ipv6_redis' do
  port 6379
  protocol :tcp
  source '2001:db8:100::/48'
  command :allow
  position 11
end
```

## Custom Resource for IPv6 Rules

```ruby
# cookbooks/ipv6_firewall/resources/rule.rb

provides :ipv6_rule

property :port, [Integer, Array, Range]
property :source, String, default: '::/0'
property :protocol, [Integer, Symbol], default: :tcp
property :command, Symbol, default: :allow
property :position, Integer, default: 50

action :create do
  firewall_rule new_resource.name do
    port     new_resource.port
    source   new_resource.source
    protocol new_resource.protocol
    command  new_resource.command
    position new_resource.position
  end
end
```

## Attribute-Driven Firewall Configuration

```ruby
# attributes/default.rb

# Default IPv6 firewall rules
default['ipv6_firewall']['rules'] = {
  'ssh' => {
    'port' => 22,
    'source' => '::/0',
    'position' => 50
  }
}
```

```ruby
# recipes/attribute_driven.rb

include_recipe 'ipv6_firewall::base'

# Apply rules from attributes
node['ipv6_firewall']['rules'].each do |name, config|
  protocol_value = config.fetch('protocol', :tcp)
  protocol_value = protocol_value.to_sym if protocol_value.is_a?(String)

  firewall_rule "ipv6_#{name}" do
    port      config['port']
    source    config.fetch('source', '::/0')
    protocol  protocol_value
    command   config.fetch('command', :allow).to_sym
    position  config.fetch('position', 50)
  end
end
```

## ip6tables Direct Recipe (without firewall cookbook)

```ruby
# recipes/ip6tables_direct.rb

# Debian/Ubuntu example: manage persistent ip6tables rules without the firewall cookbook
package 'iptables-persistent' do
  action :install
end

service 'netfilter-persistent' do
  action :enable
end

rules = node['ipv6_firewall']['rules'].map do |_, config|
  protocol = config.fetch('protocol', 'tcp').to_s
  source = config.fetch('source', '::/0')
  "-A INPUT -p #{protocol} -s #{source} --dport #{config['port']} -j ACCEPT"
end

file '/etc/iptables/rules.v6' do
  content <<~RULES
    # Managed by Chef
    *filter
    :INPUT DROP [0:0]
    :FORWARD DROP [0:0]
    :OUTPUT ACCEPT [0:0]
    -A INPUT -i lo -j ACCEPT
    -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
    -A INPUT -p icmpv6 -j ACCEPT
    #{rules.join("\n")}
    COMMIT
  RULES
  notifies :run, 'execute[reload_netfilter_persistent]', :immediately
end

execute 'reload_netfilter_persistent' do
  command 'netfilter-persistent reload'
  action :nothing
end
```

## Testing IPv6 Firewall with InSpec

```ruby
# test/integration/default/controls/firewall.rb

control 'ipv6-firewall-1' do
  impact 1.0
  title 'IPv6 firewall rules are present'
  desc 'Ensure the expected IPv6 input policy and allow rules exist.'

  describe command('ip6tables -S INPUT') do
    its('exit_status') { should eq 0 }
    its('stdout') { should match(/-P INPUT DROP/) }
    its('stdout') { should match(/-A INPUT -i lo -j ACCEPT/) }
    its('stdout') { should match(/ESTABLISHED/) }
    its('stdout') { should match(/RELATED/) }
    its('stdout') { should match(/(icmpv6|ipv6-icmp)/) }
    its('stdout') { should match(/--dport 80\b/) }
    its('stdout') { should match(/--dport 443\b/) }
  end
end
```

The `firewall` cookbook and Chef's resource model make IPv6 firewall management declarative and testable, ensuring consistent security policies across all managed nodes with role-based rule customization through attributes and recipes.
