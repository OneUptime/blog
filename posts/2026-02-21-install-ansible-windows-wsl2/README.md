# How to Install Ansible on Windows Using WSL2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, WSL2, DevOps, Linux

Description: Complete guide to installing and running Ansible on Windows through WSL2, including WSL setup, Ansible installation, and SSH key configuration.

---

Ansible does not run natively on Windows. The control node (the machine that runs Ansible) must be a Linux or macOS system. However, with Windows Subsystem for Linux 2 (WSL2), you can run a full Linux distribution inside Windows and use it as your Ansible control node. This works surprisingly well and is the recommended approach for Windows users who need Ansible.

## What is WSL2?

WSL2 runs a real Linux kernel inside a lightweight virtual machine managed by Windows. Unlike WSL1 (which translated Linux system calls), WSL2 gives you full Linux kernel compatibility. This matters for Ansible because some operations depend on Linux-specific features like proper file permissions and native SSH.

## Step 1: Enable WSL2

Open PowerShell as Administrator and run:

```powershell
# Enable WSL and install the default Ubuntu distribution
wsl --install
```

This command enables the required Windows features (Virtual Machine Platform and WSL), downloads the Linux kernel, and installs Ubuntu as the default distribution. You will need to restart your computer after this step.

If WSL is already installed but you want to make sure you are on WSL2:

```powershell
# Set WSL2 as the default version
wsl --set-default-version 2

# Check installed distributions and their WSL version
wsl --list --verbose
```

The output should show your distribution running on VERSION 2.

## Step 2: Set Up Your Linux Distribution

After restarting, Ubuntu will launch automatically and ask you to create a username and password. This is your Linux user account inside WSL2, separate from your Windows account.

Once you are at the bash prompt, update the system:

```bash
# Update package lists and upgrade installed packages
sudo apt update && sudo apt upgrade -y
```

## Step 3: Install Ansible

You have two options: install from the PPA (recommended) or install via pip.

### Option A: Install from the Ansible PPA

```bash
# Install prerequisites for adding a PPA
sudo apt install software-properties-common -y

# Add the Ansible PPA
sudo add-apt-repository --yes --update ppa:ansible/ansible

# Install Ansible
sudo apt install ansible -y
```

### Option B: Install via pip in a Virtual Environment

```bash
# Install pip and venv
sudo apt install python3-pip python3-venv -y

# Create a virtual environment
python3 -m venv ~/ansible-env

# Activate it
source ~/ansible-env/bin/activate

# Install Ansible
pip install ansible
```

If you go with the pip method, remember to activate the virtual environment every time you open a new WSL terminal. You can automate this by adding `source ~/ansible-env/bin/activate` to your `~/.bashrc`.

Verify the installation regardless of which method you chose:

```bash
# Confirm Ansible is installed and check the version
ansible --version
```

## Step 4: Configure SSH Keys

Generate an SSH key pair for Ansible to use when connecting to managed hosts:

```bash
# Generate an ed25519 SSH key
ssh-keygen -t ed25519 -f ~/.ssh/ansible_wsl -C "ansible-wsl2" -N ""

# Set correct permissions on the .ssh directory
chmod 700 ~/.ssh
chmod 600 ~/.ssh/ansible_wsl
chmod 644 ~/.ssh/ansible_wsl.pub
```

Copy the public key to your remote servers:

```bash
# Copy the public key to a remote host
ssh-copy-id -i ~/.ssh/ansible_wsl.pub deploy@192.168.1.100
```

## Step 5: Create a Project Directory

I recommend keeping your Ansible projects inside the WSL filesystem (not on /mnt/c/) for better performance. File operations on the Windows filesystem through /mnt/c/ are significantly slower because of the translation layer.

```bash
# Create a project directory inside the WSL filesystem
mkdir -p ~/ansible-projects/homelab
cd ~/ansible-projects/homelab
```

Create an ansible.cfg file:

```ini
# ~/ansible-projects/homelab/ansible.cfg
[defaults]
inventory = inventory.ini
remote_user = deploy
private_key_file = ~/.ssh/ansible_wsl
host_key_checking = False
retry_files_enabled = False
stdout_callback = yaml
forks = 10

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
```

Create a basic inventory:

```ini
# ~/ansible-projects/homelab/inventory.ini
[webservers]
web01 ansible_host=192.168.1.100
web02 ansible_host=192.168.1.101

[databases]
db01 ansible_host=192.168.1.110

[homelab:children]
webservers
databases
```

## Step 6: Test Your Setup

Run the ping module to verify connectivity:

```bash
# Test connectivity to all hosts
ansible all -m ping
```

Expected output for a successful connection:

```
web01 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
```

Now run a test playbook:

```yaml
# ~/ansible-projects/homelab/verify.yml
---
- name: Verify Ansible from WSL2
  hosts: all
  gather_facts: true
  become: false

  tasks:
    - name: Display OS information
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: {{ ansible_distribution }} {{ ansible_distribution_version }}"

    - name: Check free memory
      ansible.builtin.shell: free -h | head -2
      register: mem_info
      changed_when: false

    - name: Show memory info
      ansible.builtin.debug:
        msg: "{{ mem_info.stdout_lines }}"
```

Run it:

```bash
ansible-playbook verify.yml
```

## WSL2 Networking Considerations

WSL2 uses a NAT-based network by default, which means your WSL2 instance gets a different IP address than your Windows host. This is usually transparent for outbound connections (like SSH to your servers), but there are a few things to be aware of.

### Accessing Hosts on Your Local Network

WSL2 can reach hosts on your local network without any extra configuration. The NAT handles outbound traffic correctly.

### DNS Resolution

If you experience DNS issues inside WSL2, you can fix them by configuring a custom resolv.conf:

```bash
# Prevent WSL from auto-generating resolv.conf
sudo tee /etc/wsl.conf << 'EOF'
[network]
generateResolvConf = false
EOF

# Set your DNS server manually
sudo tee /etc/resolv.conf << 'EOF'
nameserver 8.8.8.8
nameserver 1.1.1.1
EOF
```

Restart WSL from PowerShell for the changes to take effect:

```powershell
wsl --shutdown
```

### Using Windows Terminal

I strongly recommend using Windows Terminal (available from the Microsoft Store) instead of the default console. It has proper Unicode support, tabs, and better copy-paste handling, which makes working with Ansible output much more pleasant.

## Sharing Files Between Windows and WSL2

If you need to edit Ansible files in a Windows editor like VS Code, use the WSL extension:

```bash
# Open the current directory in VS Code from WSL
code .
```

VS Code will automatically connect to your WSL2 instance and give you a native editing experience with proper Linux file handling.

You can also access your WSL files from Windows Explorer by navigating to `\\wsl$\Ubuntu\home\youruser\`.

## Performance Tips for WSL2

Keep your Ansible projects in the Linux filesystem (`~/` or `/home/`), not in `/mnt/c/`. The performance difference is massive. File-heavy operations like running large playbooks can be 5-10x slower on the mounted Windows filesystem.

If you need to increase the memory or CPU allocation for WSL2, create a `.wslconfig` file in your Windows home directory:

```ini
# C:\Users\YourName\.wslconfig
[wsl2]
memory=4GB
processors=4
```

## Summary

Running Ansible through WSL2 on Windows gives you a fully functional Linux control node without needing a separate machine or VM. The setup takes about 10 minutes, and once configured, the experience is practically identical to running Ansible on a native Linux or macOS system. The main thing to remember is to keep your files in the Linux filesystem for optimal performance and to use SSH keys for authentication to your managed hosts.
