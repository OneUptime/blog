# How to Set Up Ansible Control Node on Raspberry Pi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Raspberry Pi, Linux, Homelab, DevOps

Description: Set up a Raspberry Pi as a dedicated Ansible control node for managing your homelab, IoT devices, and local infrastructure.

---

A Raspberry Pi makes a surprisingly capable Ansible control node. It draws minimal power, runs 24/7 without noise, and can manage dozens of hosts on your local network. Whether you are running a homelab, managing IoT devices, or just want a dedicated automation box that is always on, a Raspberry Pi with Ansible is a practical and affordable setup.

## Hardware Requirements

For an Ansible control node, you do not need much processing power. Ansible's main bottleneck is SSH connections, not CPU:

- **Raspberry Pi 4 Model B** (2GB or 4GB RAM) is ideal
- **Raspberry Pi 3 Model B+** works fine for smaller inventories (up to 30 hosts)
- **Raspberry Pi 5** is overkill for Ansible alone but great if you are also running other services
- A good quality microSD card (32GB Class 10 or better), or better yet, an SSD via USB for reliability
- Ethernet connection (much more reliable than Wi-Fi for SSH)
- A reliable power supply

## Installing the OS

Start with Raspberry Pi OS Lite (64-bit). You do not need a desktop environment for an Ansible control node.

Flash the image using Raspberry Pi Imager or balenaEtcher. If using Raspberry Pi Imager, configure the following in the advanced settings before flashing:

- Set a hostname (e.g., `ansible-pi`)
- Enable SSH
- Set your username and password
- Configure Wi-Fi (if not using Ethernet)

After booting, update the system:

```bash
# Update everything to latest
sudo apt update && sudo apt upgrade -y

# Install basic tools
sudo apt install -y git vim tmux htop
```

## Installing Ansible

### Method 1: From pip (Recommended for Latest Version)

```bash
# Install pip and venv
sudo apt install -y python3-pip python3-venv python3-dev libffi-dev

# Create a virtual environment for Ansible
python3 -m venv ~/ansible-env

# Activate it
source ~/ansible-env/bin/activate

# Install Ansible
pip install ansible

# Verify
ansible --version
```

Add activation to your shell profile so it loads automatically:

```bash
# Add to ~/.bashrc
echo 'source ~/ansible-env/bin/activate' >> ~/.bashrc
```

### Method 2: From apt

```bash
# Install from the default repos (may be an older version)
sudo apt install -y ansible
```

For a newer version via PPA:

```bash
sudo apt install -y software-properties-common
sudo add-apt-repository --yes --update ppa:ansible/ansible
sudo apt install -y ansible
```

Note: PPAs may not be available for the ARM architecture. If the PPA does not work, use the pip method instead.

## Project Structure on the Pi

Set up a clean project directory:

```bash
# Create the main ansible directory
mkdir -p ~/ansible/{playbooks,roles,inventory,group_vars,host_vars,collections}
cd ~/ansible
```

Create the ansible.cfg:

```ini
# ~/ansible/ansible.cfg
[defaults]
inventory = inventory/hosts.ini
remote_user = pi
private_key_file = ~/.ssh/ansible_key
host_key_checking = False
retry_files_enabled = False
stdout_callback = yaml
forks = 10
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 7200

# Performance matters on a Pi - enable these
callback_whitelist = timer, profile_tasks

[privilege_escalation]
become = True
become_method = sudo
become_ask_pass = False

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=600s -o PreferredAuthentications=publickey
```

## Generate SSH Keys

```bash
# Generate a dedicated SSH key for Ansible
ssh-keygen -t ed25519 -f ~/.ssh/ansible_key -C "ansible-pi" -N ""

# Copy the key to your managed hosts
ssh-copy-id -i ~/.ssh/ansible_key.pub pi@192.168.1.10
ssh-copy-id -i ~/.ssh/ansible_key.pub pi@192.168.1.11
```

## Create Your Inventory

A typical homelab inventory:

```ini
# ~/ansible/inventory/hosts.ini
[pis]
pi-web01      ansible_host=192.168.1.10
pi-db01       ansible_host=192.168.1.11
pi-monitor01  ansible_host=192.168.1.12

[servers]
nas01    ansible_host=192.168.1.50 ansible_user=admin
proxmox  ansible_host=192.168.1.60 ansible_user=root

[docker_hosts]
docker01 ansible_host=192.168.1.70
docker02 ansible_host=192.168.1.71

[homelab:children]
pis
servers
docker_hosts
```

Group variables:

```yaml
# ~/ansible/group_vars/all.yml
---
ansible_python_interpreter: /usr/bin/python3
dns_servers:
  - 1.1.1.1
  - 8.8.8.8
ntp_server: pool.ntp.org
timezone: America/New_York
```

## Optimizing Performance on the Pi

The Raspberry Pi has limited CPU and RAM compared to a typical workstation. Here are optimizations that make a real difference:

### Fact Caching

Fact gathering is CPU-intensive. Cache facts so they are only gathered once:

```ini
# Already in the ansible.cfg above, but worth highlighting
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 7200
```

### Reduce Forks on Pi 3

If you are using a Pi 3, reduce forks to avoid running out of memory:

```ini
# For Pi 3 (1GB RAM)
forks = 5

# For Pi 4 (2GB or 4GB RAM)
forks = 10
```

### Use an SSD Instead of SD Card

microSD cards are slow for I/O-heavy operations. If you can, boot from a USB SSD. This makes fact caching and module file transfers significantly faster.

### Disable Unnecessary Fact Gathering

If a playbook does not need facts, disable gathering:

```yaml
---
- name: Quick task that does not need facts
  hosts: all
  gather_facts: false

  tasks:
    - name: Restart a service
      ansible.builtin.service:
        name: nginx
        state: restarted
```

## Example: Homelab Maintenance Playbook

Here is a practical playbook for keeping your homelab up to date:

```yaml
# ~/ansible/playbooks/maintenance.yml
---
- name: Homelab maintenance
  hosts: homelab
  become: true

  tasks:
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"

    - name: Upgrade all packages
      ansible.builtin.apt:
        upgrade: safe
      register: upgrade_result
      when: ansible_os_family == "Debian"

    - name: Check if reboot is needed
      ansible.builtin.stat:
        path: /var/run/reboot-required
      register: reboot_required

    - name: Display hosts that need reboot
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} needs a reboot"
      when: reboot_required.stat.exists

    - name: Ensure NTP is configured
      ansible.builtin.template:
        src: ../templates/timesyncd.conf.j2
        dest: /etc/systemd/timesyncd.conf
        mode: '0644'
      notify: restart timesyncd

    - name: Clean up old packages
      ansible.builtin.apt:
        autoremove: true
        autoclean: true
      when: ansible_os_family == "Debian"

  handlers:
    - name: restart timesyncd
      ansible.builtin.service:
        name: systemd-timesyncd
        state: restarted
```

## Scheduling Playbooks with Cron

One of the best uses for a Pi control node is running scheduled automation:

```bash
# Edit the crontab
crontab -e
```

Add entries for regular maintenance:

```cron
# Run maintenance at 3 AM every Sunday
0 3 * * 0 source ~/ansible-env/bin/activate && cd ~/ansible && ansible-playbook playbooks/maintenance.yml >> /var/log/ansible-cron.log 2>&1

# Run monitoring checks every 15 minutes
*/15 * * * * source ~/ansible-env/bin/activate && cd ~/ansible && ansible-playbook playbooks/health-check.yml >> /var/log/ansible-health.log 2>&1

# Run backup playbook daily at 2 AM
0 2 * * * source ~/ansible-env/bin/activate && cd ~/ansible && ansible-playbook playbooks/backup.yml >> /var/log/ansible-backup.log 2>&1
```

## Monitoring the Pi Control Node

Keep an eye on the Pi's resources to make sure it is not overloaded:

```yaml
# ~/ansible/playbooks/check-control-node.yml
---
- name: Monitor the Ansible control node
  hosts: localhost
  connection: local
  gather_facts: true

  tasks:
    - name: Check CPU temperature
      ansible.builtin.command: vcgencmd measure_temp
      register: cpu_temp
      changed_when: false

    - name: Check memory usage
      ansible.builtin.command: free -h
      register: mem_usage
      changed_when: false

    - name: Check disk usage
      ansible.builtin.command: df -h /
      register: disk_usage
      changed_when: false

    - name: Display system status
      ansible.builtin.debug:
        msg:
          - "CPU Temperature: {{ cpu_temp.stdout }}"
          - "Memory: {{ mem_usage.stdout_lines[1] }}"
          - "Disk: {{ disk_usage.stdout_lines[1] }}"
```

## Summary

A Raspberry Pi is a low-cost, low-power Ansible control node that is perfect for homelabs and small infrastructure. The setup takes about 30 minutes: install the OS, install Ansible via pip, set up SSH keys, and create your inventory. Enable fact caching and SSH pipelining for better performance on the Pi's limited hardware. Use cron jobs to schedule regular maintenance tasks, and your homelab will essentially manage itself.
