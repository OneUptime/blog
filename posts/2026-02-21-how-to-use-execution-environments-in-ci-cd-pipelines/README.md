# How to Use Execution Environments in CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Execution Environments, CI/CD, DevOps, GitHub Actions

Description: Integrate Ansible Execution Environments into CI/CD pipelines using GitHub Actions, GitLab CI, and Jenkins for consistent automation runs.

---

Running Ansible playbooks in CI/CD pipelines has always been messy. You need to install Ansible, all its dependencies, the right collections, and hope the CI runner's Python environment does not conflict with anything. Execution Environments solve this by packaging everything into a container image. Your pipeline just pulls the image and runs inside it. No dependency installation, no version conflicts, no surprises.

## The Basic Approach

The pattern is simple:

1. Build your EE once and push it to a registry
2. In your CI/CD pipeline, pull the EE image
3. Run ansible-navigator (or ansible-playbook directly) inside the EE
4. Get consistent results every time

This means your pipeline does not need Ansible installed on the runner. It only needs a container runtime (Podman or Docker) and optionally ansible-navigator.

## GitHub Actions Pipeline

Here is a complete GitHub Actions workflow that runs an Ansible playbook using an EE:

```yaml
# .github/workflows/ansible-deploy.yml
name: Deploy with Ansible

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

      - name: Install ansible-navigator
        run: pip install ansible-navigator

      - name: Configure SSH key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan ${{ secrets.TARGET_HOST }} >> ~/.ssh/known_hosts

      - name: Create vault password file
        run: echo "${{ secrets.VAULT_PASSWORD }}" > .vault_pass

      - name: Run playbook with Execution Environment
        run: |
          ansible-navigator run deploy.yml \
            --inventory inventory/production.yml \
            --execution-environment-image quay.io/myorg/ansible-ee:2.1.0 \
            --mode stdout \
            --pull-policy missing \
            --vault-password-file .vault_pass \
            --extra-vars "app_version=${{ github.sha }}"

      - name: Upload playbook artifacts
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ansible-artifacts
          path: "*-artifact-*.json"
          retention-days: 30

      - name: Cleanup
        if: always()
        run: rm -f .vault_pass ~/.ssh/id_rsa
```

## Running Directly in the EE Container

If you do not want to install ansible-navigator on the runner, run the playbook directly inside the EE container:

```yaml
# .github/workflows/ansible-direct.yml
name: Deploy using EE container directly

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    container:
      image: quay.io/myorg/ansible-ee:2.1.0
      credentials:
        username: ${{ secrets.REGISTRY_USER }}
        password: ${{ secrets.REGISTRY_TOKEN }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan ${{ secrets.TARGET_HOST }} >> ~/.ssh/known_hosts

      - name: Run playbook
        run: |
          ansible-playbook deploy.yml \
            -i inventory/production.yml \
            --extra-vars "app_version=${{ github.sha }}"
        env:
          ANSIBLE_VAULT_PASSWORD: ${{ secrets.VAULT_PASSWORD }}
```

This approach runs the entire job inside the EE container, so you have direct access to all the collections and Python packages without any additional setup.

## GitLab CI Pipeline

Here is the equivalent pipeline for GitLab CI:

```yaml
# .gitlab-ci.yml
stages:
  - lint
  - deploy

variables:
  EE_IMAGE: "quay.io/myorg/ansible-ee:2.1.0"

# Use the EE image directly as the job image
lint:
  stage: lint
  image: ${EE_IMAGE}
  script:
    - ansible-lint site.yml
    - ansible-playbook site.yml --syntax-check
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

deploy-staging:
  stage: deploy
  image: ${EE_IMAGE}
  before_script:
    - mkdir -p ~/.ssh
    - echo "${SSH_PRIVATE_KEY}" > ~/.ssh/id_rsa
    - chmod 600 ~/.ssh/id_rsa
    - ssh-keyscan ${STAGING_HOST} >> ~/.ssh/known_hosts
    - echo "${VAULT_PASSWORD}" > .vault_pass
  script:
    - >
      ansible-playbook deploy.yml
      -i inventory/staging.yml
      --vault-password-file .vault_pass
      -e "app_version=${CI_COMMIT_SHA}"
  after_script:
    - rm -f .vault_pass ~/.ssh/id_rsa
  environment:
    name: staging
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy-production:
  stage: deploy
  image: ${EE_IMAGE}
  before_script:
    - mkdir -p ~/.ssh
    - echo "${SSH_PRIVATE_KEY}" > ~/.ssh/id_rsa
    - chmod 600 ~/.ssh/id_rsa
    - ssh-keyscan ${PRODUCTION_HOST} >> ~/.ssh/known_hosts
    - echo "${VAULT_PASSWORD}" > .vault_pass
  script:
    - >
      ansible-playbook deploy.yml
      -i inventory/production.yml
      --vault-password-file .vault_pass
      -e "app_version=${CI_COMMIT_SHA}"
  after_script:
    - rm -f .vault_pass ~/.ssh/id_rsa
  environment:
    name: production
  rules:
    - if: $CI_COMMIT_TAG
  when: manual
```

## Jenkins Pipeline

For Jenkins, use the EE container in a Docker agent:

```groovy
// Jenkinsfile
pipeline {
    agent {
        docker {
            image 'quay.io/myorg/ansible-ee:2.1.0'
            registryUrl 'https://quay.io'
            registryCredentialsId 'quay-credentials'
        }
    }

    environment {
        ANSIBLE_FORCE_COLOR = 'true'
    }

    stages {
        stage('Lint') {
            steps {
                sh 'ansible-playbook site.yml --syntax-check'
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'ansible-ssh-key',
                        keyFileVariable: 'SSH_KEY'
                    ),
                    string(
                        credentialsId: 'vault-password',
                        variable: 'VAULT_PASS'
                    )
                ]) {
                    sh '''
                        mkdir -p ~/.ssh
                        cp ${SSH_KEY} ~/.ssh/id_rsa
                        chmod 600 ~/.ssh/id_rsa
                        echo "${VAULT_PASS}" > .vault_pass

                        ansible-playbook deploy.yml \
                            -i inventory/production.yml \
                            --vault-password-file .vault_pass \
                            -e "app_version=${BUILD_NUMBER}"

                        rm -f .vault_pass
                    '''
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: '*-artifact-*.json', allowEmptyArchive: true
            cleanWs()
        }
    }
}
```

## Building and Using EEs in the Same Pipeline

Sometimes you want to build the EE as part of the pipeline (for example, to test EE changes before merging):

```yaml
# .github/workflows/ee-build-and-test.yml
name: Build EE and Run Tests

on:
  pull_request:
    paths:
      - 'execution-environment.yml'
      - 'requirements.yml'
      - 'requirements.txt'
      - 'bindep.txt'

jobs:
  build-ee:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install ansible-builder and navigator
        run: pip install ansible-builder ansible-navigator

      - name: Build the Execution Environment
        run: |
          ansible-builder build \
            --tag test-ee:pr-${{ github.event.number }} \
            --verbosity 2

      - name: Verify collections
        run: |
          docker run --rm test-ee:pr-${{ github.event.number }} \
            ansible-galaxy collection list

      - name: Verify Python packages
        run: |
          docker run --rm test-ee:pr-${{ github.event.number }} \
            pip check

      - name: Run test playbook
        run: |
          ansible-navigator run tests/test-ee.yml \
            --execution-environment-image test-ee:pr-${{ github.event.number }} \
            --mode stdout \
            --pull-policy never
```

## Caching EE Images in CI

Pulling large EE images on every pipeline run wastes time and bandwidth. Most CI systems support image caching.

GitHub Actions with Docker layer caching:

```yaml
# Cache the EE image between runs
- name: Cache EE image
  uses: actions/cache@v4
  with:
    path: /tmp/ee-image.tar
    key: ee-image-${{ hashFiles('execution-environment.yml', 'requirements.yml', 'requirements.txt') }}

- name: Load cached image
  run: |
    if [ -f /tmp/ee-image.tar ]; then
      docker load -i /tmp/ee-image.tar
    else
      docker pull quay.io/myorg/ansible-ee:2.1.0
      docker save quay.io/myorg/ansible-ee:2.1.0 -o /tmp/ee-image.tar
    fi
```

## Handling Secrets Securely

Never put secrets into the EE image itself. Always inject them at runtime:

```yaml
# Secure secrets handling in CI
- name: Run playbook with injected secrets
  run: |
    ansible-navigator run deploy.yml \
      --execution-environment-image quay.io/myorg/ansible-ee:2.1.0 \
      --mode stdout \
      --execution-environment-volume-mounts "/tmp/secrets:/secrets:ro" \
      --extra-vars "@/secrets/vars.yml"
  env:
    ANSIBLE_VAULT_PASSWORD_FILE: /tmp/vault_pass
```

## Wrapping Up

Execution Environments transform CI/CD pipelines from fragile dependency-juggling acts into reliable, reproducible automation runs. Whether you use GitHub Actions, GitLab CI, or Jenkins, the pattern is the same: build the EE once, push it to a registry, and use it as the runtime for every pipeline run. Cache the image to avoid repeated pulls, inject secrets at runtime rather than baking them into the image, and test your EE changes in pull request pipelines before they hit production.
