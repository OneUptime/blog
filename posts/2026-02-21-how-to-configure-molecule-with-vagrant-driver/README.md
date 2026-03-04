# How to Configure Molecule with Vagrant Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Vagrant, Testing, Virtual Machines

Description: Set up Molecule with the Vagrant driver for full VM-based Ansible testing with VirtualBox and libvirt providers for realistic test environments.

---

While Docker is fast for Molecule testing, some Ansible roles genuinely need a full virtual machine. Roles that manage kernel parameters, configure firewalls with iptables, set up NFS mounts, manage LVM volumes, or do anything that requires a real init system benefit from VM-based testing. The Vagrant driver for Molecule gives you real VMs through VirtualBox or libvirt, providing the most realistic test environment possible.

## When to Use Vagrant Over Docker

Use the Vagrant driver when your role:

- Manages kernel modules or sysctl parameters
- Configures network interfaces or firewall rules
- Works with LVM, disk partitions, or mount points
- Requires a real systemd init system (not the containerized workaround)
- Tests multi-machine networking scenarios
- Needs to test reboot behavior

For everything else, Docker is faster and more convenient.

## Prerequisites

You need Vagrant and a VM provider installed.

```bash
# Install Vagrant
# macOS
brew install vagrant

# Ubuntu/Debian
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt-get update && sudo apt-get install vagrant

# Install VirtualBox (the most common provider)
# macOS
brew install --cask virtualbox

# Ubuntu/Debian
sudo apt-get install -y virtualbox
```

For Linux servers without a GUI, libvirt is a better choice.

```bash
# Install libvirt and the Vagrant plugin (Fedora/RHEL/Rocky)
sudo dnf install -y libvirt libvirt-devel gcc make ruby-devel
sudo systemctl start libvirtd
vagrant plugin install vagrant-libvirt
```

Install the Molecule Vagrant driver.

```bash
# Install Molecule with Vagrant support
pip install molecule molecule-plugins[vagrant]
```

## Basic Vagrant Configuration

Here is a minimal Molecule configuration using Vagrant.

```yaml
# molecule/default/molecule.yml - basic Vagrant setup
driver:
  name: vagrant
  provider:
    name: virtualbox

platforms:
  - name: instance
    box: "bento/ubuntu-22.04"
    memory: 1024
    cpus: 2

provisioner:
  name: ansible

verifier:
  name: ansible
```

This creates a VirtualBox VM from the `bento/ubuntu-22.04` box, allocates 1 GB of RAM and 2 CPUs, and runs your role against it.

## Detailed Vagrant Configuration

For more control over the VM, use the full set of platform options.

```yaml
# molecule/default/molecule.yml - detailed Vagrant configuration
driver:
  name: vagrant
  provider:
    name: virtualbox
    options:
      linked_clone: true  # faster VM creation using linked clones

platforms:
  - name: webserver
    box: "bento/ubuntu-22.04"
    box_version: "202309.08.0"
    memory: 2048
    cpus: 2
    interfaces:
      - auto_config: true
        network_name: private_network
        type: static
        ip: "192.168.56.10"
    provider_options:
      gui: false
    provider_raw_config_args:
      - "customize ['modifyvm', :id, '--natdnshostresolver1', 'on']"
    config_options:
      ssh.insert_key: true
      synced_folder: false

provisioner:
  name: ansible
  config_options:
    defaults:
      callbacks_enabled: profile_tasks
    ssh_connection:
      pipelining: true

verifier:
  name: ansible
```

## Multi-VM Scenarios

One of Vagrant's strengths is multi-machine setups. Here is a scenario that tests a web server and database server together.

```yaml
# molecule/cluster/molecule.yml - multi-VM cluster testing
driver:
  name: vagrant
  provider:
    name: virtualbox
    options:
      linked_clone: true

platforms:
  - name: webserver
    box: "bento/ubuntu-22.04"
    memory: 1024
    cpus: 1
    interfaces:
      - auto_config: true
        network_name: private_network
        type: static
        ip: "192.168.56.10"

  - name: database
    box: "bento/ubuntu-22.04"
    memory: 2048
    cpus: 2
    interfaces:
      - auto_config: true
        network_name: private_network
        type: static
        ip: "192.168.56.11"

  - name: loadbalancer
    box: "bento/ubuntu-22.04"
    memory: 512
    cpus: 1
    interfaces:
      - auto_config: true
        network_name: private_network
        type: static
        ip: "192.168.56.12"

provisioner:
  name: ansible
  inventory:
    hosts:
      webservers:
        hosts:
          webserver: {}
      databases:
        hosts:
          database: {}
      loadbalancers:
        hosts:
          loadbalancer: {}
    group_vars:
      all:
        db_host: "192.168.56.11"
        web_host: "192.168.56.10"
```

The converge playbook applies different roles to each group.

```yaml
# molecule/cluster/converge.yml - apply roles to specific VM groups
- name: Configure database
  hosts: databases
  become: true
  roles:
    - role: my_database

- name: Configure web server
  hosts: webservers
  become: true
  roles:
    - role: my_webserver

- name: Configure load balancer
  hosts: loadbalancers
  become: true
  roles:
    - role: my_loadbalancer
```

## Using libvirt Provider

For Linux-based testing environments, libvirt is more performant than VirtualBox.

```yaml
# molecule/default/molecule.yml - libvirt provider configuration
driver:
  name: vagrant
  provider:
    name: libvirt
    options:
      driver: kvm

platforms:
  - name: instance
    box: "generic/ubuntu2204"
    memory: 2048
    cpus: 2
    provider_options:
      video_type: "virtio"
      channel:
        type: "unix"
        target_name: "org.qemu.guest_agent.0"
        target_type: "virtio"
    provider_raw_config_args:
      - "cpu_mode = 'host-passthrough'"
      - "disk_bus = 'virtio'"
      - "nic_model_type = 'virtio'"
```

## Testing Across Multiple OS Versions

Test your role on several operating systems.

```yaml
# molecule/multi-os/molecule.yml - test on multiple operating systems
driver:
  name: vagrant
  provider:
    name: virtualbox
    options:
      linked_clone: true

platforms:
  - name: ubuntu2204
    box: "bento/ubuntu-22.04"
    memory: 1024
    cpus: 1

  - name: ubuntu2004
    box: "bento/ubuntu-20.04"
    memory: 1024
    cpus: 1

  - name: rocky9
    box: "bento/rockylinux-9"
    memory: 1024
    cpus: 1

  - name: debian12
    box: "bento/debian-12"
    memory: 1024
    cpus: 1

  - name: alma9
    box: "bento/almalinux-9"
    memory: 1024
    cpus: 1

provisioner:
  name: ansible
  inventory:
    host_vars:
      ubuntu2204:
        ansible_python_interpreter: /usr/bin/python3
      ubuntu2004:
        ansible_python_interpreter: /usr/bin/python3

verifier:
  name: ansible
```

## Adding Extra Disks

For roles that manage storage, you can add extra virtual disks.

```yaml
# molecule/storage/molecule.yml - VM with extra disks
driver:
  name: vagrant
  provider:
    name: virtualbox

platforms:
  - name: storage-server
    box: "bento/ubuntu-22.04"
    memory: 2048
    cpus: 2
    provider_raw_config_args:
      - "customize ['createhd', '--filename', 'extra-disk1.vdi', '--size', '10240']"
      - "customize ['storageattach', :id, '--storagectl', 'SATA Controller', '--port', 1, '--device', 0, '--type', 'hdd', '--medium', 'extra-disk1.vdi']"
      - "customize ['createhd', '--filename', 'extra-disk2.vdi', '--size', '10240']"
      - "customize ['storageattach', :id, '--storagectl', 'SATA Controller', '--port', 2, '--device', 0, '--type', 'hdd', '--medium', 'extra-disk2.vdi']"
```

## Synced Folders

Share directories between host and guest.

```yaml
# molecule/default/molecule.yml - synced folder configuration
platforms:
  - name: instance
    box: "bento/ubuntu-22.04"
    memory: 1024
    cpus: 1
    config_options:
      synced_folder: true
    provider_raw_config_args:
      - "synced_folder '.', '/vagrant', type: 'rsync'"
```

## Performance Optimization

Vagrant VMs are slower than Docker containers. Here are ways to speed things up.

```yaml
# molecule/default/molecule.yml - optimized for faster VM testing
driver:
  name: vagrant
  provider:
    name: virtualbox
    options:
      linked_clone: true  # share base image across VMs

platforms:
  - name: instance
    box: "bento/ubuntu-22.04"
    memory: 1024
    cpus: 2
    config_options:
      synced_folder: false  # disable synced folders for speed
    provider_raw_config_args:
      - "customize ['modifyvm', :id, '--ioapic', 'on']"
      - "customize ['modifyvm', :id, '--paravirtprovider', 'kvm']"

provisioner:
  name: ansible
  config_options:
    ssh_connection:
      pipelining: true  # reduce SSH overhead
    defaults:
      gathering: smart  # cache facts
      forks: 10
```

Also, during development, use `molecule converge` instead of `molecule test`. The `converge` command keeps the VM running so you can iterate without waiting for VM creation each time.

```bash
# During development: create once, converge many times
molecule create
molecule converge
# make changes to your role
molecule converge  # re-run without recreating the VM
molecule verify
# when done
molecule destroy
```

## Practical Tips

1. **Use linked clones.** They share the base disk image and only store differences, which dramatically speeds up VM creation.

2. **Disable GUI.** Unless you are debugging graphical issues, always set `gui: false` to save resources.

3. **Pre-download boxes.** Run `vagrant box add bento/ubuntu-22.04` before running Molecule to avoid download delays during tests.

4. **Use static IPs for multi-VM.** DHCP can be unpredictable in test environments. Assign static IPs so your converge playbook can reliably reference other VMs.

5. **Clean up stale VMs.** If a Molecule run fails partway through, VMs may be left running. Use `molecule destroy` or `vagrant global-status --prune` to clean up.

The Vagrant driver gives you the most realistic test environment for Ansible roles. It is slower than Docker, but when you need a real VM, there is no substitute.
