# How to Use Ansible with SSH Key Passphrase

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Security, DevOps, Authentication

Description: Configure Ansible to work with passphrase-protected SSH keys using ssh-agent and other secure methods

---

Using SSH keys without a passphrase is convenient but dangerous. If someone gets hold of your private key file, they have instant access to every server that trusts that key. Adding a passphrase to your SSH key encrypts it on disk, so a stolen key file is useless without the passphrase. The challenge is making passphrase-protected keys work seamlessly with Ansible, which needs to authenticate non-interactively across dozens or hundreds of hosts.

This guide covers every practical method for using passphrase-protected SSH keys with Ansible.

## Why Passphrases Matter

An unencrypted SSH private key sitting in `~/.ssh/id_rsa` is like leaving your house key under the doormat. Anyone with read access to that file (a compromised backup, a stolen laptop, a misconfigured file permission) can use it immediately. A passphrase encrypts the key so that possessing the file alone is not enough.

The trade-off is that something needs to supply the passphrase every time the key is used. That is where ssh-agent comes in.

## Method 1: Using ssh-agent (Recommended)

The ssh-agent is a background process that holds decrypted SSH keys in memory. You unlock the key once with your passphrase, and then ssh-agent provides it to SSH (and Ansible) automatically for the rest of your session.

```bash
# Start ssh-agent (if not already running)
eval "$(ssh-agent -s)"

# Add your passphrase-protected key to the agent
ssh-add ~/.ssh/deploy_key
# Enter passphrase for /home/user/.ssh/deploy_key: <your passphrase>

# Verify the key was added
ssh-add -l
# 4096 SHA256:abc123... /home/user/.ssh/deploy_key (RSA)
```

Once the key is loaded into the agent, Ansible can use it without any special configuration.

```ini
# ansible.cfg
[defaults]
private_key_file = ~/.ssh/deploy_key
remote_user = deploy

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
```

Ansible inherits the ssh-agent socket from its environment, so it automatically uses the loaded keys.

## Method 2: ssh-agent with Automatic Key Loading

You can configure your shell to automatically start ssh-agent and load your keys on login.

```bash
# Add to ~/.bashrc or ~/.zshrc
# Start ssh-agent automatically and load the deploy key

if [ -z "$SSH_AUTH_SOCK" ]; then
    eval "$(ssh-agent -s)" > /dev/null
fi

# Add key if not already loaded
ssh-add -l | grep -q "deploy_key" || ssh-add ~/.ssh/deploy_key 2>/dev/null
```

For macOS, you can store the passphrase in the system keychain.

```bash
# macOS: Add key with keychain integration
ssh-add --apple-use-keychain ~/.ssh/deploy_key

# macOS: Configure SSH to use keychain automatically
# Add to ~/.ssh/config:
# Host *
#   AddKeysToAgent yes
#   UseKeychain yes
#   IdentityFile ~/.ssh/deploy_key
```

## Method 3: SSH Config File

You can configure the SSH client to automatically add keys to the agent and specify which key to use for which hosts.

```
# ~/.ssh/config
# Automatically add keys to the agent on first use

Host *
    AddKeysToAgent yes
    IdentitiesOnly yes

Host 192.168.1.*
    User deploy
    IdentityFile ~/.ssh/deploy_key

Host *.production.example.com
    User deploy
    IdentityFile ~/.ssh/prod_key
```

With `AddKeysToAgent yes`, the first time you connect to a host, SSH will prompt for the passphrase and then add the key to the agent. Subsequent connections reuse the loaded key without prompting.

## Method 4: ANSIBLE_SSH_ARGS with Agent Forwarding

If you need to hop through a bastion host and use the same passphrase-protected key on the far side, enable agent forwarding.

```ini
# ansible.cfg
[ssh_connection]
ssh_args = -o ForwardAgent=yes -o ControlMaster=auto -o ControlPersist=60s
```

```ini
# inventory with bastion host (jump host)
[webservers]
web1 ansible_host=10.0.1.10 ansible_ssh_common_args='-o ProxyJump=bastion.example.com'
web2 ansible_host=10.0.1.11 ansible_ssh_common_args='-o ProxyJump=bastion.example.com'

[webservers:vars]
ansible_user=deploy
```

Agent forwarding sends your ssh-agent socket to the bastion host, allowing the jump from the bastion to the target server to use your passphrase-protected key without it being present on the bastion.

**Security note**: Only enable agent forwarding to hosts you trust. A compromised bastion host could use your forwarded agent to access other servers.

## Using Passphrases in CI/CD Pipelines

In CI/CD, there is no one to type the passphrase interactively. You have several options.

```bash
# Option 1: Use a key without a passphrase (dedicated CI key with limited access)
# This is acceptable if the CI environment is secure and the key has minimal permissions

# Option 2: Use SSHPASS-like approach with expect
# Create a wrapper script that feeds the passphrase from a CI secret

#!/bin/bash
# scripts/setup-ssh-agent.sh
# Load a passphrase-protected key using a CI secret
eval "$(ssh-agent -s)"
echo "$SSH_KEY_PASSPHRASE" | ssh-add - <<< "$(echo "$SSH_PRIVATE_KEY")"
```

A more robust approach for CI.

```yaml
# .github/workflows/deploy.yml (GitHub Actions example)
# Configure ssh-agent with passphrase-protected key
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup SSH agent
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.DEPLOY_KEY }}
          # The action handles passphrase-protected keys if provided

      - name: Run Ansible playbook
        run: ansible-playbook -i inventory/hosts.ini playbooks/deploy.yml
```

## Creating a Passphrase-Protected Key

If you do not already have a passphrase-protected key, here is how to create one.

```bash
# Generate a new ed25519 key with a passphrase
ssh-keygen -t ed25519 -C "ansible-deploy-key" -f ~/.ssh/deploy_key
# Enter passphrase (empty for no passphrase): <enter a strong passphrase>
# Enter same passphrase again: <repeat it>

# Add a passphrase to an existing key
ssh-keygen -p -f ~/.ssh/existing_key
# Enter old passphrase: <blank if none>
# Enter new passphrase: <your new passphrase>
```

## Complete Working Example

Here is a full setup tying everything together.

```ini
# ansible.cfg
[defaults]
inventory = inventory/hosts.ini
remote_user = deploy
private_key_file = ~/.ssh/deploy_key
host_key_checking = true

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=300s -o IdentitiesOnly=yes
pipelining = true
```

```ini
# inventory/hosts.ini
[webservers]
web1 ansible_host=192.168.1.10
web2 ansible_host=192.168.1.11

[databases]
db1 ansible_host=192.168.1.20
```

```yaml
# playbooks/deploy.yml
# Standard deployment playbook that works with passphrase-protected keys
---
- name: Deploy application
  hosts: webservers
  become: true

  tasks:
    - name: Pull latest code
      ansible.builtin.git:
        repo: "git@github.com:myorg/myapp.git"
        dest: /opt/myapp
        version: main
      become_user: deploy

    - name: Install dependencies
      ansible.builtin.pip:
        requirements: /opt/myapp/requirements.txt
        virtualenv: /opt/myapp/venv

    - name: Restart application
      ansible.builtin.systemd:
        name: myapp
        state: restarted
```

Run the playbook after loading your key into the agent.

```bash
# Load the key into ssh-agent
ssh-add ~/.ssh/deploy_key

# Run the playbook (no password prompts needed)
ansible-playbook playbooks/deploy.yml
```

## Troubleshooting

Common issues when using passphrase-protected keys with Ansible.

```bash
# Check if ssh-agent is running and has your key
ssh-add -l

# If you get "Could not open a connection to your authentication agent"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/deploy_key

# If Ansible asks for a password despite having the key loaded
# Make sure the SSH_AUTH_SOCK environment variable is set
echo $SSH_AUTH_SOCK

# Test the key directly
ssh -i ~/.ssh/deploy_key deploy@192.168.1.10 "echo ok"
```

If `SSH_AUTH_SOCK` is empty, the ssh-agent is not accessible. This commonly happens when running Ansible from a cron job or a systemd service, because those environments do not inherit your shell's agent socket. In that case, you need to either point to the agent socket explicitly or use a dedicated key without a passphrase for automated runs.

The bottom line is that ssh-agent is the right tool for this job. Load your passphrase-protected key once, and Ansible uses it transparently for the rest of your session. It gives you the security of encrypted keys without the hassle of entering the passphrase for every connection.
