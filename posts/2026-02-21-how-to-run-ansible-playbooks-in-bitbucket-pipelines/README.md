# How to Run Ansible Playbooks in Bitbucket Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Bitbucket, CI/CD, DevOps

Description: Configure Bitbucket Pipelines to run Ansible playbooks for automated deployments with SSH key management and deployment environments.

---

Bitbucket Pipelines is Atlassian's built-in CI/CD solution for Bitbucket repositories. If your team already uses the Atlassian stack (Jira, Confluence, Bitbucket), running Ansible deployments in Bitbucket Pipelines keeps everything under one roof. The pipeline configuration is straightforward, and Bitbucket's deployment environment feature gives you tracking and approval capabilities.

This guide covers setting up Ansible in Bitbucket Pipelines, handling SSH keys and secrets, and building deployment workflows.

## Basic Pipeline Setup

Create a `bitbucket-pipelines.yml` file in your repository root.

```yaml
# bitbucket-pipelines.yml - Basic Ansible pipeline
image: python:3.11-slim

definitions:
  caches:
    pip: ~/.cache/pip
    ansible: ~/.ansible/collections

pipelines:
  default:
    - step:
        name: Lint Ansible Playbooks
        caches:
          - pip
        script:
          - pip install ansible==8.7.0 ansible-lint
          - ansible-lint playbooks/
          - ansible-playbook --syntax-check playbooks/site.yml

  branches:
    main:
      - step:
          name: Lint
          caches:
            - pip
          script:
            - pip install ansible==8.7.0 ansible-lint
            - ansible-lint playbooks/
            - ansible-playbook --syntax-check playbooks/site.yml

      - step:
          name: Deploy to Staging
          deployment: staging
          caches:
            - pip
            - ansible
          script:
            - apt-get update && apt-get install -y openssh-client
            - pip install ansible==8.7.0
            - ansible-galaxy collection install -r requirements.yml
            # Set up SSH from Bitbucket SSH key
            - mkdir -p ~/.ssh
            - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
            - chmod 600 ~/.ssh/id_rsa
            - ssh-keyscan -H $STAGING_HOST >> ~/.ssh/known_hosts 2>/dev/null
            # Write vault password
            - echo "$ANSIBLE_VAULT_PASSWORD" > /tmp/vault_pass.txt
            # Run the playbook
            - >
              ansible-playbook
              -i inventory/staging.ini
              --vault-password-file /tmp/vault_pass.txt
              playbooks/site.yml
            # Clean up
            - rm -f /tmp/vault_pass.txt ~/.ssh/id_rsa
```

## Setting Up SSH Keys

Bitbucket Pipelines has a built-in SSH key feature. Go to Repository Settings > Pipelines > SSH keys.

You can either:
1. Generate a key pair directly in Bitbucket
2. Use your own key pair

Add the public key to your target servers' `authorized_keys` file.

For the built-in SSH key, you do not need to manually set it up in your pipeline. Bitbucket injects it automatically.

```yaml
# Using Bitbucket's built-in SSH key (no manual setup needed)
pipelines:
  branches:
    main:
      - step:
          name: Deploy
          script:
            # The SSH key is already available
            - apt-get update && apt-get install -y openssh-client
            - pip install ansible==8.7.0
            # Add target hosts to known_hosts
            - ssh-keyscan -H $STAGING_HOST >> ~/.ssh/known_hosts 2>/dev/null
            - ansible-playbook -i inventory/staging.ini playbooks/site.yml
```

## Managing Variables and Secrets

Store sensitive values as repository or deployment variables in Repository Settings > Pipelines > Repository variables.

Mark variables as "Secured" to prevent them from being printed in logs.

```yaml
# Variables referenced in the pipeline
# Set these in Bitbucket:
# - ANSIBLE_VAULT_PASSWORD (secured)
# - SSH_PRIVATE_KEY (secured)
# - STAGING_HOST
# - PRODUCTION_HOST
```

For deployment-specific variables, use deployment variables. These are only available in steps tagged with that deployment.

```yaml
# Deployment variables are scoped to a specific environment
- step:
    name: Deploy to Production
    deployment: production
    script:
      # $PRODUCTION_HOST is only available because deployment is 'production'
      - echo "Deploying to $PRODUCTION_HOST"
```

## Multi-Environment Pipeline

Here is a complete pipeline with staging, testing, approval, and production.

```yaml
# bitbucket-pipelines.yml - Full deployment pipeline
image: python:3.11-slim

definitions:
  caches:
    pip: ~/.cache/pip

  steps:
    - step: &install-ansible
        name: Install Ansible
        caches:
          - pip
        script:
          - apt-get update && apt-get install -y openssh-client
          - pip install ansible==8.7.0
          - ansible-galaxy collection install -r requirements.yml

    - step: &lint-step
        name: Lint Playbooks
        caches:
          - pip
        script:
          - pip install ansible==8.7.0 ansible-lint
          - ansible-lint playbooks/
          - ansible-playbook --syntax-check playbooks/site.yml

pipelines:
  branches:
    main:
      # Step 1: Lint and validate
      - step: *lint-step

      # Step 2: Deploy to staging
      - step:
          name: Deploy to Staging
          deployment: staging
          caches:
            - pip
          script:
            - apt-get update && apt-get install -y openssh-client
            - pip install ansible==8.7.0
            - ansible-galaxy collection install -r requirements.yml
            - mkdir -p ~/.ssh
            - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
            - chmod 600 ~/.ssh/id_rsa
            - ssh-keyscan -H $STAGING_HOST >> ~/.ssh/known_hosts 2>/dev/null
            - echo "$ANSIBLE_VAULT_PASSWORD" > /tmp/vault_pass.txt
            - >
              ansible-playbook
              -i inventory/staging.ini
              --vault-password-file /tmp/vault_pass.txt
              -e "deploy_version=$BITBUCKET_COMMIT"
              playbooks/site.yml
            - rm -f /tmp/vault_pass.txt
          after-script:
            - rm -f ~/.ssh/id_rsa /tmp/vault_pass.txt

      # Step 3: Test staging
      - step:
          name: Test Staging
          script:
            - apt-get update && apt-get install -y curl
            - curl -f https://staging.example.com/health || exit 1
            - echo "Staging tests passed"

      # Step 4: Manual trigger for production
      - step:
          name: Deploy to Production
          deployment: production
          trigger: manual
          caches:
            - pip
          script:
            - apt-get update && apt-get install -y openssh-client
            - pip install ansible==8.7.0
            - ansible-galaxy collection install -r requirements.yml
            - mkdir -p ~/.ssh
            - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
            - chmod 600 ~/.ssh/id_rsa
            - ssh-keyscan -H $PRODUCTION_HOST >> ~/.ssh/known_hosts 2>/dev/null
            - echo "$ANSIBLE_VAULT_PASSWORD" > /tmp/vault_pass.txt
            - >
              ansible-playbook
              -i inventory/production.ini
              --vault-password-file /tmp/vault_pass.txt
              -e "deploy_version=$BITBUCKET_COMMIT"
              playbooks/site.yml
          after-script:
            - rm -f ~/.ssh/id_rsa /tmp/vault_pass.txt
```

## Pipeline Flow

```mermaid
graph LR
    A[Push to main] --> B[Lint]
    B --> C[Deploy Staging]
    C --> D[Test Staging]
    D --> E[Manual Trigger]
    E --> F[Deploy Production]
```

## Using a Custom Docker Image

Speed up your pipelines by using a pre-built Docker image.

```dockerfile
# Dockerfile for Bitbucket Pipelines
FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openssh-client git curl && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    ansible==8.7.0 \
    ansible-lint \
    jmespath

RUN ansible-galaxy collection install \
    community.general \
    ansible.posix
```

Reference it in your pipeline.

```yaml
image: your-registry/ansible-runner:latest

pipelines:
  branches:
    main:
      - step:
          name: Deploy
          deployment: staging
          script:
            # Ansible is already installed
            - ansible-playbook -i inventory/staging.ini playbooks/site.yml
```

## Parallel Steps

If you have independent tasks, run them in parallel.

```yaml
pipelines:
  branches:
    main:
      - parallel:
          - step:
              name: Lint
              script:
                - pip install ansible-lint
                - ansible-lint playbooks/
          - step:
              name: Syntax Check
              script:
                - pip install ansible==8.7.0
                - ansible-playbook --syntax-check playbooks/site.yml
      - step:
          name: Deploy
          deployment: staging
          script:
            - pip install ansible==8.7.0
            - ansible-playbook -i inventory/staging.ini playbooks/site.yml
```

## Handling Build Minutes

Bitbucket Pipelines has build minute limits on most plans. Here are ways to optimize:

```yaml
# Use size: 1x for light tasks (default)
- step:
    name: Lint
    size: 1x  # 4GB RAM, standard speed
    script:
      - pip install ansible-lint
      - ansible-lint playbooks/

# Use size: 2x for heavy deployment tasks
- step:
    name: Deploy
    size: 2x  # 8GB RAM, counts as 2x build minutes
    script:
      - pip install ansible==8.7.0
      - ansible-playbook -i inventory/production.ini playbooks/site.yml
```

## Tips for Bitbucket Pipelines with Ansible

1. Use `after-script` instead of manual cleanup in your main script. The `after-script` section runs even when the main script fails.
2. Bitbucket's built-in SSH key feature is the simplest way to handle SSH authentication. Use it when possible.
3. Deployment environments (staging, production) provide deployment tracking and can restrict which branches can deploy.
4. Set `trigger: manual` on production deployment steps to require human approval.
5. Cache pip packages and Ansible collections to reduce build times and save on build minutes.
6. Secured variables are masked in logs. Always mark sensitive values as secured.

Bitbucket Pipelines provides a functional CI/CD platform for Ansible deployments. While it lacks some features of larger platforms like GitLab CI or GitHub Actions, its simplicity and tight integration with the Atlassian ecosystem make it a good choice for teams already invested in those tools.
