# How to Validate IPv6 Configuration Drift with Configuration Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Configuration Drift, Puppet, Chef, SaltStack, Compliance, InSpec

Description: A guide to detecting and correcting IPv6 configuration drift using configuration management tools, compliance scanning, and automated remediation.

Configuration drift occurs when the actual state of a system diverges from the desired state. For IPv6, common drift includes disabled privacy extensions, modified firewall rules, or changed sysctl parameters. This guide covers detection and remediation strategies.

## What IPv6 Configuration Drift Looks Like

```bash
# Desired state (in Puppet/Chef/Salt)

net.ipv6.conf.all.use_tempaddr = 2     # Privacy extensions preferred

# Actual state on server (after manual change)
net.ipv6.conf.all.use_tempaddr = 0     # Privacy extensions disabled

# This is drift - the system no longer matches the desired state
```

## Detection with Puppet

```bash
# Puppet --noop shows what would change without applying
sudo puppet agent --test --noop

# Example output showing IPv6 drift:
# Notice: /Stage[main]/Ipv6::Sysctl/Sysctl[net.ipv6.conf.all.use_tempaddr]/value:
#   current_value: 0, should be: 2 (noop)

# List all nodes with IPv6 drift
puppet query 'resources[certname, title] {
  type = "Sysctl" and
  title = "net.ipv6.conf.all.use_tempaddr" and
  parameters.value != "2"
}'
```

## Detection with Chef InSpec

```ruby
# ipv6_compliance.rb - InSpec profile for IPv6 compliance

control 'ipv6-privacy-extensions' do
  impact 1.0
  title 'IPv6 Privacy Extensions Must Be Enabled'
  desc 'use_tempaddr should be set to 2 for privacy extension preference'

  describe kernel_parameter('net.ipv6.conf.all.use_tempaddr') do
    its('value') { should eq 2 }
  end
end

control 'ipv6-forwarding-disabled' do
  impact 0.7
  title 'IPv6 Forwarding Must Be Disabled on Non-Routers'
  desc 'Only router nodes should have IPv6 forwarding enabled'

  describe kernel_parameter('net.ipv6.conf.all.forwarding') do
    its('value') { should eq 0 }
  end
end

control 'ipv6-firewall-icmpv6-allowed' do
  impact 1.0
  title 'ICMPv6 Must Be Allowed'
  desc 'Blocking ICMPv6 breaks IPv6 functionality'

  describe command('ip6tables -L INPUT -n') do
    its('stdout') { should match /ACCEPT.*ipv6-icmp/ }
  end
end

control 'ipv6-no-disable' do
  impact 1.0
  title 'IPv6 Must Not Be Disabled'

  describe kernel_parameter('net.ipv6.conf.all.disable_ipv6') do
    its('value') { should eq 0 }
  end
end
```

```bash
# Run InSpec compliance scan
inspec exec ipv6_compliance.rb --target ssh://user@server

# Run against all servers in parallel
for server in server1 server2 server3; do
  inspec exec ipv6_compliance.rb --target ssh://admin@$server \
    --reporter json:reports/$server.json html:reports/$server.html &
done
wait
```

## Detection with SaltStack

```bash
# Check IPv6 sysctl values across all minions
salt '*' sysctl.get net.ipv6.conf.all.use_tempaddr

# Find minions that have drifted
salt '*' sysctl.get net.ipv6.conf.all.use_tempaddr | grep ' 0$'

# Check firewall compliance
salt '*' cmd.run "ip6tables -L INPUT -n | grep -c ACCEPT"

# Dry-run state to show what would change
salt '*' state.apply ipv6 test=True
```

## Automated Remediation

### Puppet (Continuous Enforcement)

```bash
# Puppet agents check and correct drift every 30 minutes by default
# View drift correction events
puppet query 'events[certname, resource_title, status, message] {
  resource_type = "Sysctl" and
  status = "changed"
}'

# Force immediate remediation
sudo puppet agent --test
```

### Chef (Convergence)

```bash
# Chef client corrects drift on scheduled runs
# Force immediate convergence
ssh server01 'sudo chef-client --once'

# Batch convergence using knife
knife ssh 'name:*' 'sudo chef-client'
```

### SaltStack (Event-Driven Remediation)

```yaml
# /srv/salt/reactor/ipv6_drift.sls
# Auto-remediate IPv6 drift on detection

ipv6_remediate:
  local.state.apply:
    - tgt: {{ data['id'] }}
    - arg:
      - ipv6
```

```bash
# Trigger immediate remediation on detected drift
salt 'server01' state.apply ipv6

# Remediate all drifted systems in parallel
salt '*' state.apply ipv6 --async
```

## Compliance Reporting Dashboard

```promql
# Prometheus metrics from InSpec runs
# Track compliance over time

# % of nodes with correct IPv6 privacy settings
sum(inspec_control_pass{control="ipv6-privacy-extensions"}) /
count(inspec_control_pass{control="ipv6-privacy-extensions"})

# Number of nodes with IPv6 configuration failures
count(inspec_control_fail{profile="ipv6_compliance"})
```

Combining configuration management's continuous enforcement with compliance scanning provides a complete IPv6 drift detection and remediation pipeline - drift is automatically corrected on the next agent run, with compliance reports tracking the drift rate over time.
