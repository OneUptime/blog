# How to Run Ansible Playbooks in CircleCI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, CircleCI, CI/CD, DevOps

Description: Set up CircleCI pipelines to run Ansible playbooks with proper secret management, caching, and multi-environment deployment workflows.

---

CircleCI is known for fast builds and a clean configuration syntax. Running Ansible playbooks in CircleCI gives you a streamlined deployment pipeline that is easy to reason about. The configuration lives in a single `.circleci/config.yml` file, and CircleCI's context feature provides a nice way to manage secrets across different environments.

This guide covers everything from basic setup to multi-environment deployment workflows with approval gates.

## Basic Configuration

Create a `.circleci/config.yml` file in your repository root.

```yaml
# .circleci/config.yml - Basic Ansible pipeline
version: 2.1

executors:
  ansible-executor:
    docker:
      - image: python:3.11-slim
    working_directory: ~/project
    environment:
      ANSIBLE_HOST_KEY_CHECKING: "false"
      ANSIBLE_FORCE_COLOR: "true"

jobs:
  lint:
    executor: ansible-executor
    steps:
      - checkout
      - run:
          name: Install Ansible and lint tools
          command: |
            pip install ansible==8.7.0 ansible-lint
      - run:
          name: Lint playbooks
          command: |
            ansible-lint playbooks/
      - run:
          name: Syntax check
          command: |
            ansible-playbook --syntax-check playbooks/site.yml

  deploy-staging:
    executor: ansible-executor
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: |
            apt-get update && apt-get install -y openssh-client
            pip install ansible==8.7.0
            ansible-galaxy collection install -r requirements.yml
      - run:
          name: Set up SSH key
          command: |
            mkdir -p ~/.ssh
            echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
            chmod 600 ~/.ssh/id_rsa
            ssh-keyscan -H $STAGING_HOST >> ~/.ssh/known_hosts 2>/dev/null
      - run:
          name: Set up vault password
          command: echo "$ANSIBLE_VAULT_PASSWORD" > /tmp/vault_pass.txt
      - run:
          name: Run Ansible playbook
          command: |
            ansible-playbook \
              -i inventory/staging.ini \
              --vault-password-file /tmp/vault_pass.txt \
              playbooks/site.yml
      - run:
          name: Clean up secrets
          command: rm -f /tmp/vault_pass.txt ~/.ssh/id_rsa
          when: always

workflows:
  deploy:
    jobs:
      - lint
      - deploy-staging:
          requires:
            - lint
          filters:
            branches:
              only: main
```

## Using CircleCI Contexts for Secrets

Contexts are CircleCI's way of grouping environment variables. Create separate contexts for staging and production.

Go to Organization Settings > Contexts and create:
- `ansible-staging` (with staging SSH keys and hosts)
- `ansible-production` (with production SSH keys and hosts)

Reference contexts in your workflow.

```yaml
workflows:
  deploy:
    jobs:
      - lint
      - deploy-staging:
          context: ansible-staging
          requires:
            - lint
          filters:
            branches:
              only: main
      - approve-production:
          type: approval
          requires:
            - deploy-staging
      - deploy-production:
          context: ansible-production
          requires:
            - approve-production
```

## Complete Multi-Stage Pipeline

Here is a full pipeline with caching, testing, and approval gates.

```yaml
# .circleci/config.yml - Full Ansible deployment pipeline
version: 2.1

executors:
  ansible:
    docker:
      - image: python:3.11-slim
    environment:
      ANSIBLE_HOST_KEY_CHECKING: "false"
      ANSIBLE_FORCE_COLOR: "true"

commands:
  # Reusable command for installing Ansible
  install-ansible:
    steps:
      - run:
          name: Install system dependencies
          command: apt-get update && apt-get install -y openssh-client git
      - restore_cache:
          keys:
            - pip-v1-{{ checksum "requirements.txt" }}
            - pip-v1-
      - run:
          name: Install Ansible
          command: pip install ansible==8.7.0 ansible-lint
      - save_cache:
          key: pip-v1-{{ checksum "requirements.txt" }}
          paths:
            - /usr/local/lib/python3.11/site-packages
      - run:
          name: Install collections
          command: ansible-galaxy collection install -r requirements.yml

  # Reusable command for SSH setup
  setup-ssh:
    steps:
      - run:
          name: Configure SSH
          command: |
            mkdir -p ~/.ssh
            echo "$SSH_PRIVATE_KEY" | base64 -d > ~/.ssh/id_rsa
            chmod 600 ~/.ssh/id_rsa
            echo "$KNOWN_HOSTS" >> ~/.ssh/known_hosts

  # Reusable command for running a playbook
  run-playbook:
    parameters:
      inventory:
        type: string
      extra_vars:
        type: string
        default: ""
    steps:
      - run:
          name: Write vault password
          command: echo "$ANSIBLE_VAULT_PASSWORD" > /tmp/vault_pass.txt
      - run:
          name: Run Ansible playbook
          command: |
            ansible-playbook \
              -i inventory/<< parameters.inventory >> \
              --vault-password-file /tmp/vault_pass.txt \
              << parameters.extra_vars >> \
              playbooks/site.yml
      - run:
          name: Clean up
          command: rm -f /tmp/vault_pass.txt ~/.ssh/id_rsa
          when: always

jobs:
  validate:
    executor: ansible
    steps:
      - checkout
      - install-ansible
      - run:
          name: Run ansible-lint
          command: ansible-lint playbooks/
      - run:
          name: Run syntax check
          command: ansible-playbook --syntax-check playbooks/site.yml
      - run:
          name: Verify inventory
          command: ansible-inventory -i inventory/staging.ini --list > /dev/null

  deploy-staging:
    executor: ansible
    steps:
      - checkout
      - install-ansible
      - setup-ssh
      - run-playbook:
          inventory: staging.ini
          extra_vars: "-e deploy_version=${CIRCLE_SHA1:0:7}"

  test-staging:
    docker:
      - image: curlimages/curl:latest
    steps:
      - run:
          name: Health check staging
          command: |
            curl -f https://staging.example.com/health || exit 1
            echo "Staging health check passed"

  deploy-production:
    executor: ansible
    steps:
      - checkout
      - install-ansible
      - setup-ssh
      - run-playbook:
          inventory: production.ini
          extra_vars: "-e deploy_version=${CIRCLE_SHA1:0:7}"

  test-production:
    docker:
      - image: curlimages/curl:latest
    steps:
      - run:
          name: Health check production
          command: |
            curl -f https://example.com/health || exit 1
            echo "Production health check passed"

workflows:
  version: 2
  deploy-pipeline:
    jobs:
      - validate

      - deploy-staging:
          context: ansible-staging
          requires:
            - validate
          filters:
            branches:
              only: main

      - test-staging:
          requires:
            - deploy-staging

      - approve-production:
          type: approval
          requires:
            - test-staging

      - deploy-production:
          context: ansible-production
          requires:
            - approve-production

      - test-production:
          requires:
            - deploy-production
```

## Pipeline Flow

```mermaid
graph LR
    A[Push to main] --> B[Validate/Lint]
    B --> C[Deploy Staging]
    C --> D[Test Staging]
    D --> E[Manual Approval]
    E --> F[Deploy Production]
    F --> G[Test Production]
```

## Using a Custom Docker Image

Build a custom Docker image to avoid installing Ansible on every run.

```dockerfile
# Dockerfile.circleci-ansible
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

# Create a non-root user for CircleCI
RUN useradd -m circleci
USER circleci
WORKDIR /home/circleci/project
```

Use it in your config.

```yaml
executors:
  ansible:
    docker:
      - image: your-registry/circleci-ansible:latest
```

## Using CircleCI Orbs

CircleCI has orbs (reusable config packages). While there is no official Ansible orb that covers everything, you can create your own private orb.

```yaml
# Using a community Ansible orb (example)
version: 2.1

orbs:
  ansible: my-org/ansible@1.0.0

workflows:
  deploy:
    jobs:
      - ansible/lint:
          playbook: playbooks/site.yml
      - ansible/deploy:
          context: ansible-staging
          inventory: staging.ini
          playbook: playbooks/site.yml
          requires:
            - ansible/lint
```

## Resource Classes and Performance

CircleCI lets you choose different machine sizes. For large Ansible runs, you might want more CPU and memory.

```yaml
jobs:
  deploy-large:
    executor: ansible
    resource_class: large  # 4 CPU, 8GB RAM
    steps:
      - checkout
      - install-ansible
      - setup-ssh
      - run-playbook:
          inventory: production.ini
```

## Tips for CircleCI with Ansible

1. Use CircleCI commands for reusable step definitions. This avoids copy-pasting SSH setup and Ansible installation across jobs.
2. Contexts should be restricted to specific security groups. Do not let every team member trigger production deployments.
3. Base64-encode your SSH keys when storing them as environment variables. Raw multi-line strings in environment variables can cause issues.
4. The `when: always` condition on cleanup steps ensures secrets are removed even when the playbook fails.
5. Use `restore_cache` / `save_cache` to cache pip packages and Ansible collections between builds.
6. The `approval` job type provides manual gates between environments. Only users with the right permissions can approve.

CircleCI's clean YAML syntax and reusable commands make it a great platform for Ansible deployments. The workflow model maps naturally to multi-environment deployment pipelines.
