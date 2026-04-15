# How to Set Up ClickHouse in a Vagrant Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Vagrant, Local Development, DevOps, VirtualBox

Description: Learn how to set up a local ClickHouse instance using Vagrant for development and testing, with a Vagrantfile and shell provisioner script.

---

## Why Use Vagrant for ClickHouse Development

Vagrant creates reproducible local VMs using a simple `Vagrantfile`. For ClickHouse development, it lets every team member spin up an identical environment without Docker or cloud access. It is especially useful for testing configuration changes, cluster setups, or OS-specific behaviors before promoting to production.

## Vagrantfile Setup

Create a `Vagrantfile` in your project root:

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  config.vm.hostname = "clickhouse-dev"

  config.vm.network "forwarded_port", guest: 8123, host: 8123, host_ip: "127.0.0.1"
  config.vm.network "forwarded_port", guest: 9000, host: 9000, host_ip: "127.0.0.1"

  config.vm.provider "virtualbox" do |vb|
    vb.memory = "4096"
    vb.cpus   = 2
    vb.name   = "clickhouse-dev"
  end

  config.vm.provision "shell", path: "scripts/install_clickhouse.sh"
end
```

## Provisioner Script (scripts/install_clickhouse.sh)

```bash
#!/bin/bash
set -euo pipefail

apt-get update -qq
apt-get install -y apt-transport-https ca-certificates curl gnupg

curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' \
  | gpg --dearmor -o /usr/share/keyrings/clickhouse-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/clickhouse-archive-keyring.gpg] \
  https://packages.clickhouse.com/deb lts main" \
  > /etc/apt/sources.list.d/clickhouse.list

apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y clickhouse-server clickhouse-client

# Listen on all interfaces inside the VM
sed -i 's|<!-- <listen_host>0.0.0.0</listen_host> -->|<listen_host>0.0.0.0</listen_host>|' \
  /etc/clickhouse-server/config.xml

systemctl enable --now clickhouse-server
echo "ClickHouse is ready at http://localhost:8123"
```

## Starting and Connecting

```bash
vagrant up           # create and provision the VM
vagrant ssh          # SSH into the VM
vagrant provision    # re-run the provisioner after changes
```

From your host machine, connect to ClickHouse directly:

```bash
clickhouse-client --host 127.0.0.1 --port 9000
# or via HTTP
curl http://127.0.0.1:8123/?query=SELECT+version()
```

## Multi-Node Vagrant Setup

To test a 3-node cluster locally:

```ruby
(1..3).each do |i|
  config.vm.define "ch#{i}" do |node|
    node.vm.box      = "ubuntu/jammy64"
    node.vm.hostname = "ch#{i}.local"
    node.vm.network "private_network", ip: "192.168.56.1#{i}"
    node.vm.provider "virtualbox" do |vb|
      vb.memory = "2048"
    end
    node.vm.provision "shell", path: "scripts/install_clickhouse.sh"
  end
end
```

## Summary

Vagrant provides a consistent local ClickHouse environment using a declarative Vagrantfile and a shell provisioner. Port-forward ports 8123 and 9000 to connect from the host. Use the multi-node pattern to simulate cluster topology locally. Vagrant is ideal for testing configuration changes and cluster behaviors before applying them to production infrastructure.
