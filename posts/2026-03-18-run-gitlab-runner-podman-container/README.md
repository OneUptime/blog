# How to Run GitLab Runner in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, GitLab, CI/CD, Runner

Description: Learn how to run GitLab Runner in a Podman container to execute CI/CD pipelines with persistent configuration and custom executors.

---

> GitLab Runner in Podman gives you a lightweight CI/CD executor in a container ready to process your pipeline jobs.

GitLab Runner is the agent that runs CI/CD jobs defined in your GitLab pipelines. Running it in a Podman container isolates the runner from your host system, makes it portable across environments, and simplifies registration and management. This guide covers pulling the image, registering the runner, configuring executors, and managing the runner lifecycle.

---

## Pulling the GitLab Runner Image

Download the official GitLab Runner image.

```bash
# Pull the latest GitLab Runner image

podman pull docker.io/gitlab/gitlab-runner:latest

# Verify the image
podman images | grep gitlab-runner
```

## Running a Basic GitLab Runner Container

Start the runner with persistent configuration.

```bash
# Create a volume for runner configuration
podman volume create gitlab-runner-config

# Run GitLab Runner in detached mode
podman run -d \
  --name my-gitlab-runner \
  -v gitlab-runner-config:/etc/gitlab-runner:Z \
  docker.io/gitlab/gitlab-runner:latest

# Check the container is running
podman ps

# View the runner logs
podman logs my-gitlab-runner
```

## Registering the Runner with GitLab

Register the runner with your GitLab instance using a runner authentication token.

```bash
# Register the runner non-interactively
# Replace YOUR_RUNNER_AUTHENTICATION_TOKEN with the glrt- token from GitLab
podman exec my-gitlab-runner gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --token "YOUR_RUNNER_AUTHENTICATION_TOKEN" \
  --executor "shell" \
  --description "podman-runner"

# Verify the registration
podman exec my-gitlab-runner gitlab-runner list
```

## Using the Shell Executor

The shell executor runs jobs directly in the runner container.

```bash
# Create a custom runner configuration for shell executor
mkdir -p ~/gitlab-runner-config

cat > ~/gitlab-runner-config/config.toml <<'EOF'
concurrent = 4
check_interval = 0
shutdown_timeout = 0

[session_server]
  session_timeout = 1800

[[runners]]
  name = "podman-shell-runner"
  url = "https://gitlab.com/"
  token = "YOUR_RUNNER_AUTHENTICATION_TOKEN"
  executor = "shell"
  [runners.custom_build_dir]
  [runners.cache]
    MaxUploadedArchiveSize = 0
EOF

# Run GitLab Runner with the custom config
podman run -d \
  --name gitlab-runner-shell \
  -v ~/gitlab-runner-config/config.toml:/etc/gitlab-runner/config.toml:Z \
  docker.io/gitlab/gitlab-runner:latest
```

## Running Multiple Runners

Set up multiple runner instances for parallel job execution.

```bash
# Create separate volumes for each runner
podman volume create runner-1-config
podman volume create runner-2-config

# Start Runner 1 - for build jobs
podman run -d \
  --name gitlab-runner-1 \
  -v runner-1-config:/etc/gitlab-runner:Z \
  docker.io/gitlab/gitlab-runner:latest

# Start Runner 2 - for test jobs
podman run -d \
  --name gitlab-runner-2 \
  -v runner-2-config:/etc/gitlab-runner:Z \
  docker.io/gitlab/gitlab-runner:latest

# Register each runner with tokens for runners that already have different tags configured in GitLab
podman exec gitlab-runner-1 gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --token "YOUR_BUILD_RUNNER_AUTHENTICATION_TOKEN" \
  --executor "shell" \
  --description "build-runner"

podman exec gitlab-runner-2 gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --token "YOUR_TEST_RUNNER_AUTHENTICATION_TOKEN" \
  --executor "shell" \
  --description "test-runner"
```

## Custom Runner with Build Tools

Build a runner image with additional tools pre-installed.

```bash
# Create a Containerfile with build tools
mkdir -p ~/gitlab-runner-custom

cat > ~/gitlab-runner-custom/Containerfile <<'EOF'
FROM docker.io/gitlab/gitlab-runner:latest

# Install common build tools
RUN apt-get update && apt-get install -y \
    curl \
    git \
    make \
    gcc \
    python3 \
    python3-pip \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install additional tools
RUN npm install -g yarn
EOF

# Build the custom runner image
podman build -t gitlab-runner-custom -f ~/gitlab-runner-custom/Containerfile ~/gitlab-runner-custom

# Run the custom runner
podman run -d \
  --name gitlab-runner-tooled \
  -v gitlab-runner-config:/etc/gitlab-runner:Z \
  gitlab-runner-custom
```

## Monitoring Runner Status

Check the health and status of your runners.

```bash
# List all registered runners
podman exec my-gitlab-runner gitlab-runner list

# Verify runner connectivity to GitLab
podman exec my-gitlab-runner gitlab-runner verify

# Check runner container status
podman ps --filter name=my-gitlab-runner

# View recent runner logs
podman logs --tail=30 my-gitlab-runner
```

## Unregistering and Cleaning Up

Properly unregister runners before removing containers.

```bash
# Unregister a specific runner
podman exec my-gitlab-runner gitlab-runner unregister --name "podman-runner"

# Unregister all runners
podman exec my-gitlab-runner gitlab-runner unregister --all-runners

# Stop and remove the container
podman stop my-gitlab-runner
podman rm my-gitlab-runner

# Remove all runner containers
podman rm -f gitlab-runner-1 gitlab-runner-2 gitlab-runner-shell gitlab-runner-tooled

# Clean up volumes
podman volume rm gitlab-runner-config runner-1-config runner-2-config
```

## Summary

Running GitLab Runner in a Podman container gives you an isolated CI/CD executor that is portable and easy to manage. Named volumes persist your runner configuration and registration across restarts. Multiple runners configured with different tags let you route build and test jobs to specialized executors. Custom images with pre-installed tools eliminate per-job installation overhead. Podman's rootless mode adds security to your CI/CD infrastructure when you run Podman rootless, ensuring pipeline jobs run in a contained environment.
