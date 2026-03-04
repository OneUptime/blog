# How to Run Ansible in a Docker Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Docker, Containers, DevOps, CI/CD

Description: Run Ansible inside a Docker container for portable, reproducible automation with no local installation required, ideal for CI/CD pipelines.

---

Running Ansible inside a Docker container gives you a portable, reproducible execution environment. You do not need to install Ansible on your local machine or your CI/CD runners. Everyone on the team gets the exact same Ansible version, Python version, and collection set. This approach is especially valuable for CI/CD pipelines where you want consistent behavior regardless of the runner's OS.

## Why Run Ansible in a Container?

- **Consistency**: Every team member and every CI/CD run uses the same Ansible version
- **No local installation needed**: Pull the image and run
- **Easy version switching**: Different projects can use different container tags
- **Clean environment**: No conflicts with system Python or other tools
- **Portable**: Works on any system that runs Docker

## Using the Official Ansible Image

The Ansible community maintains container images that are ready to use:

```bash
# Pull the latest Ansible image
docker pull quay.io/ansible/creator-ee:latest

# Run an ad-hoc command
docker run --rm \
  -v ~/.ssh:/root/.ssh:ro \
  -v $(pwd):/ansible:rw \
  -w /ansible \
  quay.io/ansible/creator-ee:latest \
  ansible all -i inventory.ini -m ping
```

However, for production use, I recommend building your own image with your specific requirements.

## Building a Custom Ansible Docker Image

Create a Dockerfile that includes exactly what your project needs:

```dockerfile
# Dockerfile.ansible
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      openssh-client \
      sshpass \
      git \
      rsync \
      && rm -rf /var/lib/apt/lists/*

# Install Ansible and related tools
RUN pip install --no-cache-dir \
    ansible==9.2.0 \
    ansible-lint==24.2.0 \
    jmespath==1.0.1 \
    netaddr==1.2.1

# Install commonly needed collections
RUN ansible-galaxy collection install \
    community.general \
    ansible.posix \
    community.docker

# Set the working directory
WORKDIR /ansible

# Default command shows the Ansible version
CMD ["ansible", "--version"]
```

Build the image:

```bash
# Build the custom Ansible image
docker build -t ansible-runner:9.2.0 -f Dockerfile.ansible .
```

## Running Playbooks from the Container

### Basic Playbook Execution

Mount your project directory and SSH keys into the container:

```bash
# Run a playbook
docker run --rm \
  -v ~/.ssh:/root/.ssh:ro \
  -v $(pwd):/ansible:rw \
  -w /ansible \
  ansible-runner:9.2.0 \
  ansible-playbook -i inventory.ini playbooks/deploy.yml
```

Explanation of the flags:
- `--rm`: Remove the container after it exits
- `-v ~/.ssh:/root/.ssh:ro`: Mount SSH keys as read-only
- `-v $(pwd):/ansible:rw`: Mount the current directory with read-write access
- `-w /ansible`: Set the working directory inside the container

### With Vault Password

If your playbook uses Ansible Vault:

```bash
# Pass the vault password through a file
docker run --rm \
  -v ~/.ssh:/root/.ssh:ro \
  -v $(pwd):/ansible:rw \
  -v ~/.vault_pass:/root/.vault_pass:ro \
  -w /ansible \
  ansible-runner:9.2.0 \
  ansible-playbook -i inventory.ini \
    --vault-password-file /root/.vault_pass \
    playbooks/deploy.yml
```

Or pass it through an environment variable:

```bash
# Pass vault password via environment variable
docker run --rm \
  -e ANSIBLE_VAULT_PASSWORD=mysecretpassword \
  -v ~/.ssh:/root/.ssh:ro \
  -v $(pwd):/ansible:rw \
  -w /ansible \
  ansible-runner:9.2.0 \
  ansible-playbook -i inventory.ini \
    playbooks/deploy.yml
```

### Interactive Shell

Drop into the container for debugging or ad-hoc commands:

```bash
# Start an interactive shell in the Ansible container
docker run --rm -it \
  -v ~/.ssh:/root/.ssh:ro \
  -v $(pwd):/ansible:rw \
  -w /ansible \
  ansible-runner:9.2.0 \
  /bin/bash
```

## Docker Compose for Convenience

If you run Ansible from Docker frequently, create a docker-compose.yml to simplify the commands:

```yaml
# docker-compose.yml
version: "3.8"

services:
  ansible:
    build:
      context: .
      dockerfile: Dockerfile.ansible
    volumes:
      - ~/.ssh:/root/.ssh:ro
      - .:/ansible:rw
    working_dir: /ansible
    environment:
      - ANSIBLE_FORCE_COLOR=true
      - ANSIBLE_HOST_KEY_CHECKING=false
    entrypoint: ["ansible-playbook"]
    # Default inventory
    command: ["--help"]

  ansible-lint:
    build:
      context: .
      dockerfile: Dockerfile.ansible
    volumes:
      - .:/ansible:rw
    working_dir: /ansible
    entrypoint: ["ansible-lint"]
    command: ["."]
```

Use it:

```bash
# Run a playbook
docker compose run --rm ansible -i inventory.ini playbooks/deploy.yml

# Run ansible-lint
docker compose run --rm ansible-lint

# Run an ad-hoc command
docker compose run --rm --entrypoint ansible ansible all -i inventory.ini -m ping
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/ansible-deploy.yml
name: Ansible Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    container:
      image: python:3.11-slim

    steps:
      - uses: actions/checkout@v4

      - name: Install Ansible
        run: |
          pip install ansible==9.2.0
          ansible-galaxy collection install -r collections/requirements.yml

      - name: Set up SSH key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts

      - name: Run playbook
        run: ansible-playbook -i inventory/production.ini playbooks/deploy.yml
        env:
          ANSIBLE_HOST_KEY_CHECKING: "false"
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - lint
  - deploy

lint:
  stage: lint
  image: python:3.11-slim
  before_script:
    - pip install ansible==9.2.0 ansible-lint
  script:
    - ansible-lint playbooks/

deploy:
  stage: deploy
  image: python:3.11-slim
  only:
    - main
  before_script:
    - pip install ansible==9.2.0
    - ansible-galaxy collection install -r collections/requirements.yml
    - mkdir -p ~/.ssh
    - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_ed25519
    - chmod 600 ~/.ssh/id_ed25519
  script:
    - ansible-playbook -i inventory/production.ini playbooks/deploy.yml
```

## Handling SSH Agent Forwarding

If you need SSH agent forwarding inside the container (for example, to pull Git repos on managed hosts using your local SSH key):

```bash
# On Linux, forward the SSH agent socket
docker run --rm \
  -v $SSH_AUTH_SOCK:/ssh-agent \
  -e SSH_AUTH_SOCK=/ssh-agent \
  -v $(pwd):/ansible:rw \
  -w /ansible \
  ansible-runner:9.2.0 \
  ansible-playbook -i inventory.ini playbooks/deploy.yml
```

On macOS, Docker Desktop has built-in SSH agent forwarding:

```bash
# macOS SSH agent forwarding
docker run --rm \
  -v /run/host-services/ssh-auth.sock:/ssh-agent \
  -e SSH_AUTH_SOCK=/ssh-agent \
  -v $(pwd):/ansible:rw \
  -w /ansible \
  ansible-runner:9.2.0 \
  ansible-playbook -i inventory.ini playbooks/deploy.yml
```

## Wrapper Script

Create a shell script that wraps the Docker command for daily use:

```bash
#!/bin/bash
# ansible-docker.sh - Run Ansible commands inside Docker

IMAGE="ansible-runner:9.2.0"
PROJECT_DIR="$(pwd)"

docker run --rm \
  -v ~/.ssh:/root/.ssh:ro \
  -v "${PROJECT_DIR}:/ansible:rw" \
  -w /ansible \
  -e ANSIBLE_FORCE_COLOR=true \
  -e ANSIBLE_HOST_KEY_CHECKING=false \
  "${IMAGE}" \
  "$@"
```

Make it executable and use it:

```bash
chmod +x ansible-docker.sh

# Run any Ansible command through Docker
./ansible-docker.sh ansible-playbook -i inventory.ini playbooks/deploy.yml
./ansible-docker.sh ansible all -i inventory.ini -m ping
./ansible-docker.sh ansible-lint playbooks/
```

## Network Considerations

By default, Docker containers use a bridge network. If your managed hosts are on the local network, the container can reach them through the bridge. If you need the container to use the host's network stack directly:

```bash
# Use host networking (Linux only)
docker run --rm --network host \
  -v ~/.ssh:/root/.ssh:ro \
  -v $(pwd):/ansible:rw \
  -w /ansible \
  ansible-runner:9.2.0 \
  ansible-playbook -i inventory.ini playbooks/deploy.yml
```

On macOS and Windows, `--network host` does not work the same way because Docker runs in a VM. The default bridge network should work for reaching external hosts.

## Summary

Running Ansible in a Docker container is the best way to ensure reproducible automation across your team and CI/CD pipelines. Build a custom image with your exact Ansible version, collections, and dependencies. Use volume mounts for your project files and SSH keys. Wrap the Docker command in a shell script or docker-compose.yml for convenience. This approach eliminates "it works on my machine" issues and makes your automation pipeline truly portable.
