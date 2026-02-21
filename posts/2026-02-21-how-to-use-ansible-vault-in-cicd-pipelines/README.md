# How to Use Ansible Vault in CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, CI/CD, DevOps, Automation

Description: Learn how to securely use Ansible Vault encrypted secrets in CI/CD pipelines across GitHub Actions, GitLab CI, Jenkins, and other platforms.

---

Running Ansible playbooks with vault-encrypted secrets in a CI/CD pipeline requires some thought. You cannot type a password interactively, and you should never hardcode the vault password in your pipeline configuration. Every major CI/CD platform has a mechanism for injecting secrets securely, and the trick is connecting that mechanism to Ansible Vault. This guide walks through the patterns and platform-specific implementations.

## The Core Pattern

Regardless of the CI/CD platform, the approach is the same:

1. Store the Ansible Vault password as a pipeline secret/variable.
2. At runtime, make that password available to Ansible via a password file or script.
3. Run the playbook with `--vault-password-file` pointing to that file or script.

```mermaid
flowchart LR
    A[CI/CD Platform Secrets] -->|Inject as env var| B[Pipeline Runner]
    B -->|Write to temp file or script| C[Vault Password File]
    C -->|--vault-password-file| D[ansible-playbook]
    D -->|Decrypt secrets| E[Deploy to Targets]
```

## Method 1: Environment Variable with Script

This is the most portable method. Write a small script that reads the vault password from an environment variable:

```bash
#!/bin/bash
# vault_pass.sh - reads vault password from CI/CD injected environment variable
if [ -z "${ANSIBLE_VAULT_PASSWORD}" ]; then
  echo "ERROR: ANSIBLE_VAULT_PASSWORD is not set" >&2
  exit 1
fi
echo "${ANSIBLE_VAULT_PASSWORD}"
```

Commit this script to your repository (it contains no secrets). The actual password comes from the CI/CD platform at runtime.

## Method 2: Temporary Password File

Some teams prefer creating a temporary file during the pipeline run:

```bash
# Write the vault password to a temporary file
echo "${ANSIBLE_VAULT_PASSWORD}" > /tmp/vault_pass.txt
chmod 600 /tmp/vault_pass.txt

# Run the playbook
ansible-playbook site.yml --vault-password-file /tmp/vault_pass.txt

# Clean up
rm -f /tmp/vault_pass.txt
```

## GitHub Actions

GitHub Actions stores secrets in the repository or organization settings. Here is a complete workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Ansible and dependencies
        run: |
          pip install ansible boto3

      - name: Run Ansible Playbook
        env:
          # VAULT_PASSWORD is configured in GitHub repo Settings > Secrets
          ANSIBLE_VAULT_PASSWORD: ${{ secrets.VAULT_PASSWORD }}
          # SSH key for connecting to target hosts
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
        run: |
          # Set up SSH key
          mkdir -p ~/.ssh
          echo "${SSH_PRIVATE_KEY}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa

          # Make vault password script executable
          chmod +x vault_pass.sh

          # Run the playbook
          ansible-playbook \
            -i inventory/production \
            site.yml \
            --vault-password-file ./vault_pass.sh
```

### Multiple Vault IDs in GitHub Actions

For multi-environment deployments:

```yaml
# .github/workflows/deploy-multi-env.yml
name: Deploy to Multiple Environments

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - uses: actions/checkout@v4

      - name: Install Ansible
        run: pip install ansible

      - name: Deploy to ${{ github.event.inputs.environment }}
        env:
          VAULT_PASS_STAGING: ${{ secrets.VAULT_PASS_STAGING }}
          VAULT_PASS_PROD: ${{ secrets.VAULT_PASS_PROD }}
        run: |
          # Create vault password scripts for each environment
          cat > /tmp/vault_pass_staging.sh << 'SCRIPT'
          #!/bin/bash
          echo "${VAULT_PASS_STAGING}"
          SCRIPT

          cat > /tmp/vault_pass_prod.sh << 'SCRIPT'
          #!/bin/bash
          echo "${VAULT_PASS_PROD}"
          SCRIPT

          chmod 700 /tmp/vault_pass_staging.sh /tmp/vault_pass_prod.sh

          ansible-playbook site.yml \
            -i "inventory/${{ github.event.inputs.environment }}" \
            --vault-id "staging@/tmp/vault_pass_staging.sh" \
            --vault-id "prod@/tmp/vault_pass_prod.sh"
```

## GitLab CI/CD

GitLab CI stores secrets as CI/CD variables (masked and protected):

```yaml
# .gitlab-ci.yml
stages:
  - deploy

variables:
  ANSIBLE_FORCE_COLOR: "true"

deploy_staging:
  stage: deploy
  image: python:3.11
  environment:
    name: staging
  before_script:
    - pip install ansible
    - chmod +x vault_pass.sh
    # Set up SSH for target host access
    - eval $(ssh-agent -s)
    - echo "${SSH_PRIVATE_KEY}" | ssh-add -
    - mkdir -p ~/.ssh
    - echo "${SSH_KNOWN_HOSTS}" > ~/.ssh/known_hosts
  script:
    # ANSIBLE_VAULT_PASSWORD is set as a masked CI/CD variable in GitLab
    - ansible-playbook -i inventory/staging site.yml --vault-password-file ./vault_pass.sh
  only:
    - main

deploy_production:
  stage: deploy
  image: python:3.11
  environment:
    name: production
  before_script:
    - pip install ansible
    - chmod +x vault_pass.sh
  script:
    - ansible-playbook -i inventory/production site.yml --vault-password-file ./vault_pass.sh
  only:
    - main
  when: manual
```

## Jenkins

Jenkins stores secrets in its credential store. Use the `withCredentials` block:

```groovy
// Jenkinsfile
pipeline {
    agent {
        docker {
            image 'python:3.11'
        }
    }

    stages {
        stage('Setup') {
            steps {
                sh 'pip install ansible'
            }
        }

        stage('Deploy') {
            steps {
                // 'ansible-vault-pass' is the credential ID in Jenkins
                withCredentials([
                    string(credentialsId: 'ansible-vault-pass', variable: 'ANSIBLE_VAULT_PASSWORD'),
                    sshUserPrivateKey(credentialsId: 'deploy-ssh-key', keyFileVariable: 'SSH_KEY')
                ]) {
                    sh '''
                        chmod +x vault_pass.sh
                        ansible-playbook \
                            -i inventory/production \
                            site.yml \
                            --vault-password-file ./vault_pass.sh \
                            --private-key "${SSH_KEY}"
                    '''
                }
            }
        }
    }

    post {
        always {
            // Clean up any temporary files
            sh 'rm -f /tmp/vault_pass*.txt'
        }
    }
}
```

## Azure DevOps

Azure Pipelines uses variable groups and pipeline variables:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: ansible-secrets  # Variable group containing ANSIBLE_VAULT_PASSWORD

steps:
  - task: UsePythonVersion@0
    inputs:
      versionSpec: '3.11'

  - script: pip install ansible
    displayName: 'Install Ansible'

  - script: |
      chmod +x vault_pass.sh
      ansible-playbook \
        -i inventory/production \
        site.yml \
        --vault-password-file ./vault_pass.sh
    displayName: 'Run Ansible Playbook'
    env:
      ANSIBLE_VAULT_PASSWORD: $(ANSIBLE_VAULT_PASSWORD)
```

## Security Best Practices for CI/CD

### Mask Secret Output

Prevent the vault password from leaking in logs:

```yaml
# In your playbook, use no_log for tasks that handle secrets
- name: Deploy secrets file
  ansible.builtin.template:
    src: secrets.conf.j2
    dest: /etc/myapp/secrets.conf
    mode: '0600'
  no_log: true
```

### Limit Vault Password Scope

Use environment-specific secrets so a staging pipeline never has access to production vault passwords:

```yaml
# GitHub Actions example with environment protection
jobs:
  deploy-prod:
    environment: production  # Requires approval + uses production secrets
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        env:
          ANSIBLE_VAULT_PASSWORD: ${{ secrets.PROD_VAULT_PASSWORD }}
        run: ansible-playbook -i inventory/prod site.yml --vault-password-file ./vault_pass.sh
```

### Validate Before Deploy

Add a check step that verifies vault decryption works before attempting the full deployment:

```bash
# Pre-flight check: verify vault password can decrypt
ansible-vault view --vault-password-file ./vault_pass.sh group_vars/production/vault.yml > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "ERROR: Vault decryption failed. Check your vault password."
  exit 1
fi
echo "Vault decryption verified. Proceeding with deployment."
```

## Debugging Pipeline Failures

When vault-related failures happen in CI/CD, they are harder to debug because you cannot SSH into the runner. Use these techniques:

```bash
# Check if the environment variable is set (without printing its value)
if [ -n "${ANSIBLE_VAULT_PASSWORD}" ]; then
  echo "ANSIBLE_VAULT_PASSWORD is set, length: ${#ANSIBLE_VAULT_PASSWORD}"
else
  echo "ANSIBLE_VAULT_PASSWORD is NOT set"
fi

# Test the vault password script independently
./vault_pass.sh > /dev/null 2>&1 && echo "Script works" || echo "Script failed"

# Run with maximum verbosity for vault-related debugging
ansible-playbook site.yml --vault-password-file ./vault_pass.sh -vvvv 2>&1 | head -100
```

## Summary

The pattern for using Ansible Vault in CI/CD is universal: store the vault password in the platform's secret management, inject it as an environment variable, and use a script to feed it to Ansible. The platform-specific details differ in syntax but not in concept. Keep vault passwords scoped to environments, mask sensitive output in logs, and add pre-flight checks to catch decryption failures early.
