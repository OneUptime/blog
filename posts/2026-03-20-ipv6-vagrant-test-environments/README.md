# How to Create IPv6 Test Environments with Vagrant

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vagrant, IPv6, Test Environment, VirtualBox, Networking, Automation

Description: Create reproducible IPv6 test environments with Vagrant, configure private IPv6 networks between VMs, and automate network configuration with shell provisioners.

## Basic IPv6 Vagrantfile

```ruby
# Vagrantfile - Single VM with IPv6

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"

  # Private network with IPv6
  config.vm.network "private_network",
    ip: "2001:db8:1::10",
    netmask: "64"

  config.vm.provision "shell", inline: <<-SHELL
    # Enable IPv6 routing
    sysctl -w net.ipv6.conf.all.forwarding=1
    printf '%s\n' 'net.ipv6.conf.all.forwarding=1' > /etc/sysctl.d/99-ipv6.conf

    # Verify IPv6 configuration
    ip -6 addr show
    ip -6 route show
  SHELL
end
```

## Multi-VM IPv6 Lab

```ruby
# Vagrantfile - 3-VM IPv6 router lab
Vagrant.configure("2") do |config|

  # Router 1
  config.vm.define "r1" do |r1|
    r1.vm.box = "ubuntu/jammy64"
    r1.vm.hostname = "router1"

    # Link to r2
    r1.vm.network "private_network",
      virtualbox__intnet: "r1-r2",
      ip: "2001:db8:12::1",
      netmask: "64"

    # Loopback range
    r1.vm.provision "shell", inline: <<-SHELL
      ip -6 addr add 2001:db8:1::1/128 dev lo 2>/dev/null || true
      sysctl -w net.ipv6.conf.all.forwarding=1
      printf '%s\n' 'net.ipv6.conf.all.forwarding=1' > /etc/sysctl.d/99-ipv6.conf

      apt-get update -q
      apt-get install -y -q curl ca-certificates lsb-release

      # Install FRR for later routing experiments
      curl -fsSL https://deb.frrouting.org/frr/keys.gpg > /usr/share/keyrings/frrouting.gpg
      echo "deb [signed-by=/usr/share/keyrings/frrouting.gpg] https://deb.frrouting.org/frr $(lsb_release -s -c) frr-stable" > /etc/apt/sources.list.d/frr.list
      apt-get update -q && apt-get install -y -q frr
    SHELL
  end

  # Router 2
  config.vm.define "r2" do |r2|
    r2.vm.box = "ubuntu/jammy64"
    r2.vm.hostname = "router2"

    r2.vm.network "private_network",
      virtualbox__intnet: "r1-r2",
      ip: "2001:db8:12::2",
      netmask: "64"

    r2.vm.network "private_network",
      virtualbox__intnet: "r2-r3",
      ip: "2001:db8:23::1",
      netmask: "64"

    r2.vm.provision "shell", inline: <<-SHELL
      ip -6 addr add 2001:db8:2::1/128 dev lo 2>/dev/null || true
      sysctl -w net.ipv6.conf.all.forwarding=1
      printf '%s\n' 'net.ipv6.conf.all.forwarding=1' > /etc/sysctl.d/99-ipv6.conf
    SHELL
  end

  # Router 3
  config.vm.define "r3" do |r3|
    r3.vm.box = "ubuntu/jammy64"
    r3.vm.hostname = "router3"

    r3.vm.network "private_network",
      virtualbox__intnet: "r2-r3",
      ip: "2001:db8:23::2",
      netmask: "64"

    r3.vm.provision "shell", inline: <<-SHELL
      ip -6 addr add 2001:db8:3::1/128 dev lo 2>/dev/null || true
      sysctl -w net.ipv6.conf.all.forwarding=1
      printf '%s\n' 'net.ipv6.conf.all.forwarding=1' > /etc/sysctl.d/99-ipv6.conf
    SHELL
  end
end
```

## IPv6 Networking Configuration Provisioner

```bash
#!/bin/bash
# provision-ipv6.sh - Run as Vagrant provisioner

set -e

# Arguments passed from Vagrantfile
LOOPBACK_ADDR=$1  # e.g., "2001:db8:1::1"
NEIGHBORS=$2       # e.g., "2001:db8:12::2,2001:db8:13::2"

# Assign loopback
ip -6 addr add "${LOOPBACK_ADDR}/128" dev lo 2>/dev/null || true

# Enable forwarding
sysctl -w net.ipv6.conf.all.forwarding=1
printf '%s\n' 'net.ipv6.conf.all.forwarding=1' > /etc/sysctl.d/99-ipv6.conf

# Wait for link-local addresses
sleep 2

# Test IPv6 connectivity to neighbors
IFS=',' read -ra NEIGH_LIST <<< "$NEIGHBORS"
for NEIGH in "${NEIGH_LIST[@]}"; do
    if ping -6 -c 2 -W 3 "${NEIGH}" >/dev/null 2>&1; then
        echo "Neighbor ${NEIGH}: reachable"
    else
        echo "Neighbor ${NEIGH}: UNREACHABLE"
    fi
done
```

```ruby
# Use provisioner in Vagrantfile
r1.vm.provision "shell",
  path: "provision-ipv6.sh",
  args: ["2001:db8:1::1", "2001:db8:12::2"]
```

## Vagrant Lab Lifecycle

```bash
# Start all VMs
vagrant up

# Start specific VM
vagrant up r1

# SSH to a VM
vagrant ssh r1

# Run provisioner again (without restart)
vagrant provision r1

# Suspend/resume (preserves VM state and frees host RAM)
vagrant suspend
vagrant resume

# Rebuild a specific VM
vagrant destroy r2 && vagrant up r2

# Destroy all
vagrant destroy -f
```

## Testing IPv6 Connectivity Between VMs

```bash
# From r1, test reachability to r2
vagrant ssh r1 -c "ping -6 -c 3 2001:db8:12::2"

# From r2, test reachability to r3
vagrant ssh r2 -c "ping -6 -c 3 2001:db8:23::2"

# Inspect IPv6 routes on r2
vagrant ssh r2 -c "ip -6 route show"
```

## Conclusion

Vagrant enables reproducible IPv6 test environments that can be version-controlled alongside application code. The `private_network` with `virtualbox__intnet` creates isolated internal networks for multi-VM topologies. Shell provisioners handle IPv6 configuration including address assignment, forwarding, and optional FRR installation. The `vagrant up/destroy` lifecycle makes environments disposable - spin up a fresh IPv6 lab in minutes, destroy it when done. Because these examples use `virtualbox__intnet`, the inter-VM links stay on VirtualBox internal networks rather than host-only adapters.
