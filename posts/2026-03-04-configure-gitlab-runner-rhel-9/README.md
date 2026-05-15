# How to Configure GitLab Runner on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GitLab, Runner, CI/CD, Automation, Linux

Description: Install and configure GitLab Runner on RHEL to execute CI/CD pipeline jobs for your GitLab instance.

---

GitLab Runner is the agent that executes CI/CD jobs defined in your `.gitlab-ci.yml` files. You can install it on a separate RHEL machine from your GitLab server to keep builds isolated from the main instance.

## Install GitLab Runner

```bash
# Add the GitLab Runner repository
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.rpm.sh" -o script.rpm.sh
less script.rpm.sh
sudo bash script.rpm.sh

# Install GitLab Runner
sudo dnf install -y gitlab-runner

# Verify the installation
gitlab-runner --version
```

## Register the Runner

Create a runner in your GitLab instance and copy its authentication token:
1. Go to Settings > CI/CD > Runners
2. Create a runner, set any required tags, and copy the authentication token

```bash
# Register the runner interactively
sudo gitlab-runner register

# You will be prompted for:
# - GitLab instance URL (e.g., https://gitlab.example.com)
# - Runner authentication token
# - Description (e.g., "rhel9-runner-01")
# - Executor (shell, docker, etc.)
```

For automated registration:

```bash
# Register non-interactively with the shell executor
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.example.com" \
  --token "YOUR_RUNNER_AUTH_TOKEN" \
  --executor "shell" \
  --description "rhel9-shell-runner"
```

## Configure the Docker Executor

The Docker executor runs each job in a fresh container:

```bash
# Install Podman and enable a Podman socket for the gitlab-runner user
sudo dnf install -y podman podman-docker podman-plugins
sudo loginctl enable-linger gitlab-runner

# Sign in as the gitlab-runner user through SSH or another pam_systemd session, then run:
systemctl --user enable --now podman.socket

# Register with the Docker executor
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.example.com" \
  --token "YOUR_RUNNER_AUTH_TOKEN" \
  --executor "docker" \
  --docker-image "registry.access.redhat.com/ubi9/ubi:latest" \
  --description "rhel9-docker-runner"
```

## Runner Configuration File

The runner configuration is stored in `/etc/gitlab-runner/config.toml`:

```toml
# /etc/gitlab-runner/config.toml
concurrent = 4       # Maximum number of concurrent jobs
check_interval = 0   # How often to check for new jobs (0 = default 3s)

[[runners]]
  name = "rhel9-docker-runner"
  url = "https://gitlab.example.com"
  token = "RUNNER_AUTH_TOKEN"
  executor = "docker"

  [runners.docker]
    # Replace UID with the output of: id -u gitlab-runner
    host = "unix:///run/user/UID/podman/podman.sock"
    image = "registry.access.redhat.com/ubi9/ubi:latest"
    privileged = false
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    disable_cache = false
    volumes = ["/cache"]
    shm_size = 0
```

## Manage the Runner Service

```bash
# Start the runner
sudo systemctl start gitlab-runner

# Enable at boot
sudo systemctl enable gitlab-runner

# Check status
sudo systemctl status gitlab-runner

# View logs
sudo journalctl -u gitlab-runner -f

# List registered runners
sudo gitlab-runner list

# Verify the runner can connect
sudo gitlab-runner verify
```

## Sample .gitlab-ci.yml

```yaml
# .gitlab-ci.yml - Test pipeline for the RHEL runner

stages:
  - build
  - test

build-job:
  stage: build
  tags:
    - rhel9
  script:
    - echo "Building on RHEL..."
    - cat /etc/redhat-release
    - gcc --version || echo "No gcc installed"

test-job:
  stage: test
  tags:
    - rhel9
  script:
    - echo "Running tests on RHEL..."
    - uname -r
```

## Unregister a Runner

```bash
# Unregister a specific runner
sudo gitlab-runner unregister --name "rhel9-docker-runner"

# Unregister all runners on this machine
sudo gitlab-runner unregister --all-runners
```

GitLab Runner on RHEL connects your GitLab instance to dedicated build machines. Whether you use the shell executor for direct access or the Docker executor for isolation, the runner handles job execution automatically.
