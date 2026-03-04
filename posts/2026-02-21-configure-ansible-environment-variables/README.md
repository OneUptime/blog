# How to Configure Ansible Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration, Environment Variables, DevOps

Description: A complete guide to using environment variables to configure Ansible behavior, override settings, and pass secrets to playbooks.

---

Environment variables are one of the most powerful ways to configure Ansible. They let you override ansible.cfg settings on the fly, pass secrets without putting them in files, and customize behavior per CI/CD pipeline run. Every setting in ansible.cfg has a corresponding environment variable, and they take precedence over the config file. This guide covers the most useful Ansible environment variables and practical patterns for using them.

## How Ansible Environment Variables Work

Ansible's configuration precedence for any individual setting is:

1. Environment variable (highest priority)
2. ansible.cfg setting
3. Built-in default (lowest priority)

So if `forks = 10` is in your ansible.cfg, but you set `ANSIBLE_FORKS=50` as an environment variable, Ansible uses 50.

## The Most Important Ansible Environment Variables

### ANSIBLE_CONFIG

Points to a specific configuration file. This overrides the normal search order (current directory, home directory, /etc/ansible/):

```bash
# Use a specific config file
export ANSIBLE_CONFIG=/opt/ansible/configs/production.cfg
ansible-playbook deploy.yml
```

### ANSIBLE_INVENTORY

Specifies the inventory file or directory:

```bash
# Use a specific inventory
export ANSIBLE_INVENTORY=/opt/ansible/inventory/production.ini
ansible all -m ping
```

### ANSIBLE_FORKS

Controls parallel execution:

```bash
# Run with more parallelism
export ANSIBLE_FORKS=30
ansible-playbook deploy.yml
```

### ANSIBLE_REMOTE_USER

Sets the default SSH user:

```bash
# Connect as a specific user
export ANSIBLE_REMOTE_USER=deploy
ansible all -m ping
```

### ANSIBLE_PRIVATE_KEY_FILE

Points to the SSH private key:

```bash
export ANSIBLE_PRIVATE_KEY_FILE=~/.ssh/deploy_key
ansible-playbook deploy.yml
```

### ANSIBLE_VAULT_PASSWORD_FILE

Path to the file containing the vault password:

```bash
export ANSIBLE_VAULT_PASSWORD_FILE=~/.vault_pass
ansible-playbook --ask-vault-pass deploy.yml  # This won't prompt because the file is set
```

### ANSIBLE_HOST_KEY_CHECKING

Disable SSH host key verification (useful for dynamic environments):

```bash
export ANSIBLE_HOST_KEY_CHECKING=False
ansible-playbook deploy.yml
```

### ANSIBLE_STDOUT_CALLBACK

Change the output format:

```bash
# Use YAML output
export ANSIBLE_STDOUT_CALLBACK=yaml

# Use JSON output (good for machine parsing)
export ANSIBLE_STDOUT_CALLBACK=json

# Use minimal output
export ANSIBLE_STDOUT_CALLBACK=minimal
```

### ANSIBLE_FORCE_COLOR

Force colored output even when not connected to a terminal (useful in CI/CD):

```bash
export ANSIBLE_FORCE_COLOR=true
ansible-playbook deploy.yml
```

### ANSIBLE_PIPELINING

Enable SSH pipelining for better performance:

```bash
export ANSIBLE_PIPELINING=True
ansible-playbook deploy.yml
```

### ANSIBLE_LOG_PATH

Enable file logging:

```bash
export ANSIBLE_LOG_PATH=/var/log/ansible/playbook.log
ansible-playbook deploy.yml
```

## Setting Environment Variables on Remote Hosts

Beyond configuring the Ansible control node, you often need to set environment variables on the managed hosts where tasks run. This is done with the `environment` keyword in playbooks.

### Per Task

```yaml
---
- name: Run tasks with custom environment
  hosts: webservers
  become: true

  tasks:
    - name: Run database migration with specific environment
      ansible.builtin.command: /opt/app/migrate.sh
      environment:
        DATABASE_URL: "postgresql://db.example.com:5432/myapp"
        RAILS_ENV: production
        PATH: "/opt/app/bin:{{ ansible_env.PATH }}"
```

### Per Play

```yaml
---
- name: Deploy application
  hosts: webservers
  become: true
  environment:
    APP_ENV: production
    LOG_LEVEL: info

  tasks:
    - name: Start the application
      ansible.builtin.command: /opt/app/start.sh

    - name: Run health check
      ansible.builtin.uri:
        url: http://localhost:8080/health
        return_content: true
```

### Per Role

```yaml
# In your playbook
---
- name: Deploy with role
  hosts: webservers
  roles:
    - role: myapp
      environment:
        APP_ENV: production
        SECRET_KEY: "{{ vault_secret_key }}"
```

### Using Variables for Environment

Define environment variables in group_vars or host_vars and reference them:

```yaml
# group_vars/production.yml
---
app_environment:
  APP_ENV: production
  DATABASE_URL: "{{ vault_database_url }}"
  REDIS_URL: "{{ vault_redis_url }}"
  SECRET_KEY: "{{ vault_secret_key }}"
```

```yaml
# playbook.yml
---
- name: Deploy with environment from variables
  hosts: webservers
  become: true
  environment: "{{ app_environment }}"

  tasks:
    - name: Deploy application
      ansible.builtin.command: /opt/app/deploy.sh
```

## CI/CD Pipeline Patterns

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      ANSIBLE_FORCE_COLOR: "true"
      ANSIBLE_HOST_KEY_CHECKING: "false"
      ANSIBLE_STDOUT_CALLBACK: yaml
      ANSIBLE_FORKS: "20"
    steps:
      - uses: actions/checkout@v4
      - name: Run playbook
        env:
          ANSIBLE_VAULT_PASSWORD: ${{ secrets.VAULT_PASSWORD }}
        run: |
          echo "$ANSIBLE_VAULT_PASSWORD" > .vault_pass
          export ANSIBLE_VAULT_PASSWORD_FILE=.vault_pass
          ansible-playbook -i inventory/prod.ini playbooks/deploy.yml
          rm -f .vault_pass
```

### Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any
    environment {
        ANSIBLE_FORCE_COLOR = 'true'
        ANSIBLE_HOST_KEY_CHECKING = 'false'
        ANSIBLE_FORKS = '25'
        ANSIBLE_LOG_PATH = "${WORKSPACE}/ansible.log"
    }
    stages {
        stage('Deploy') {
            steps {
                withCredentials([file(credentialsId: 'vault-pass', variable: 'VAULT_FILE')]) {
                    sh '''
                        export ANSIBLE_VAULT_PASSWORD_FILE=${VAULT_FILE}
                        ansible-playbook -i inventory/prod.ini playbooks/deploy.yml
                    '''
                }
            }
        }
    }
}
```

## Shell Profile Configuration

For your personal workstation, add commonly used Ansible environment variables to your shell profile:

```bash
# ~/.bashrc or ~/.zshrc

# Ansible defaults
export ANSIBLE_STDOUT_CALLBACK=yaml
export ANSIBLE_HOST_KEY_CHECKING=False
export ANSIBLE_PIPELINING=True
export ANSIBLE_FORKS=20

# Suppress Python deprecation warnings
export ANSIBLE_PYTHON_INTERPRETER=auto_silent

# macOS-specific: fix fork safety issue
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES

# Colored output
export ANSIBLE_FORCE_COLOR=true
```

## Listing All Available Environment Variables

To see every environment variable that Ansible recognizes:

```bash
# List all config settings with their environment variable names
ansible-config list | grep "env:"

# Show current values and their sources
ansible-config dump --only-changed
```

Each config setting's documentation shows its corresponding environment variable. For example:

```bash
# Get detailed info about a specific setting
ansible-config dump | grep FORKS
```

## Using .env Files

For project-specific environment variables, create a `.env` file and source it:

```bash
# .env (add to .gitignore!)
export ANSIBLE_CONFIG=ansible.cfg
export ANSIBLE_VAULT_PASSWORD_FILE=.vault_pass
export ANSIBLE_FORKS=20
export ANSIBLE_STDOUT_CALLBACK=yaml
export ANSIBLE_LOG_PATH=logs/ansible.log
```

Source it before running playbooks:

```bash
# Load project environment
source .env
ansible-playbook playbooks/deploy.yml
```

Or use `direnv` to load it automatically when you enter the directory:

```bash
# .envrc (used by direnv)
dotenv .env
```

## Debugging Environment Variable Issues

If you are not sure which environment variables are affecting Ansible's behavior:

```bash
# Show all ANSIBLE_ environment variables currently set
env | grep ANSIBLE_ | sort

# Show where each setting is coming from
ansible-config dump --only-changed -v
```

The verbose flag shows whether each setting came from the config file, an environment variable, or the default.

## Summary

Ansible environment variables give you flexible, per-run control over Ansible's behavior without editing config files. They are essential for CI/CD pipelines, where different jobs need different settings. The most commonly used ones are `ANSIBLE_CONFIG`, `ANSIBLE_INVENTORY`, `ANSIBLE_FORKS`, and `ANSIBLE_VAULT_PASSWORD_FILE`. For managed hosts, use the `environment` keyword in your playbooks to set variables where tasks execute. Keep sensitive environment variables out of version control and use your CI/CD platform's secrets management to inject them at runtime.
