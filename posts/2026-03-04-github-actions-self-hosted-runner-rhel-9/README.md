# How to Set Up GitHub Actions Self-Hosted Runner on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GitHub Actions, Runner, CI/CD, Self-Hosted, Linux

Description: Install and configure a GitHub Actions self-hosted runner on RHEL 9 to run workflow jobs on your own infrastructure.

---

GitHub Actions self-hosted runners let you execute workflow jobs on your own RHEL 9 machines. This gives you full control over the build environment, access to internal resources, and avoids the usage limits of GitHub-hosted runners.

## Prerequisites

```bash
# Install required packages
sudo dnf install -y curl tar jq

# Create a dedicated user for the runner
sudo useradd -m -s /bin/bash github-runner
```

## Download and Install the Runner

Get the runner package from your GitHub repository settings:

1. Go to your repository on GitHub
2. Navigate to Settings > Actions > Runners
3. Click "New self-hosted runner"
4. Select Linux and x86_64

```bash
# Switch to the runner user
sudo su - github-runner

# Create a directory for the runner
mkdir actions-runner && cd actions-runner

# Download the latest runner package
curl -o actions-runner-linux-x64.tar.gz -L \
  https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64-2.311.0.tar.gz

# Extract the package
tar xzf actions-runner-linux-x64.tar.gz
```

## Configure the Runner

```bash
# Configure the runner (still as github-runner user)
./config.sh \
  --url https://github.com/YOUR_ORG/YOUR_REPO \
  --token YOUR_REGISTRATION_TOKEN \
  --name "rhel9-runner-01" \
  --labels "rhel9,self-hosted,x64" \
  --work "_work"

# The token is available from the GitHub UI when you add a new runner
```

## Install as a systemd Service

```bash
# Exit back to root/sudo user
exit

# Install the service (run as root)
cd /home/github-runner/actions-runner
sudo ./svc.sh install github-runner

# Start the service
sudo ./svc.sh start

# Check status
sudo ./svc.sh status

# Enable at boot
sudo systemctl enable actions.runner.YOUR_ORG-YOUR_REPO.rhel9-runner-01.service
```

## Verify the Runner

Check the runner status in GitHub:

1. Go to Settings > Actions > Runners
2. Your runner should show as "Idle" (green dot)

```bash
# Check the service locally
sudo systemctl status actions.runner.*

# View runner logs
sudo journalctl -u actions.runner.* -f
```

## Use the Runner in a Workflow

```yaml
# .github/workflows/build.yml
name: Build on RHEL 9

on:
  push:
    branches: [main]

jobs:
  build:
    # Target the self-hosted runner with matching labels
    runs-on: [self-hosted, rhel9]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Show system info
        run: |
          cat /etc/redhat-release
          uname -r
          hostname

      - name: Install dependencies
        run: |
          sudo dnf install -y gcc make

      - name: Build
        run: |
          make build

      - name: Test
        run: |
          make test
```

## Install Build Tools on the Runner

```bash
# Install common build tools the runner might need
sudo dnf install -y \
  gcc gcc-c++ make cmake \
  git curl wget \
  python3 python3-pip \
  java-17-openjdk \
  docker

# Start Docker if your workflows need it
sudo systemctl enable --now docker
sudo usermod -aG docker github-runner
```

## Configure Multiple Runners

```bash
# Create additional runner directories
for i in 1 2 3; do
  sudo su - github-runner -c "
    mkdir -p actions-runner-${i} && cd actions-runner-${i}
    tar xzf ~/actions-runner/actions-runner-linux-x64.tar.gz
    ./config.sh \
      --url https://github.com/YOUR_ORG/YOUR_REPO \
      --token YOUR_TOKEN \
      --name rhel9-runner-0${i} \
      --labels rhel9,self-hosted \
      --work _work
  "
  cd /home/github-runner/actions-runner-${i}
  sudo ./svc.sh install github-runner
  sudo ./svc.sh start
done
```

## Remove a Runner

```bash
# Stop the service
sudo ./svc.sh stop

# Uninstall the service
sudo ./svc.sh uninstall

# Remove the runner configuration
sudo su - github-runner -c "cd actions-runner && ./config.sh remove --token YOUR_REMOVE_TOKEN"
```

Self-hosted GitHub Actions runners on RHEL 9 give you the flexibility to run CI/CD jobs on your own infrastructure with full control over the environment and network access.
