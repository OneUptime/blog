# How to Handle OpenTofu Version Management with tofuenv

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, tofuenv, Version Management, IaC, DevOps

Description: Learn how to manage multiple OpenTofu versions using tofuenv, including installation, switching versions, pinning per project, and integrating with CI/CD pipelines.

---

When you work across multiple projects, each one might require a different version of OpenTofu. One project might be on 1.6.x, another on 1.7.x, and you might want to test a pre-release version on the side. Managing this manually by downloading binaries and swapping them in your PATH is tedious and error-prone. That is where tofuenv comes in.

tofuenv is a version manager for OpenTofu, inspired by tfenv (which does the same thing for Terraform). It lets you install, switch, and pin OpenTofu versions per project with minimal effort.

## Installing tofuenv

tofuenv is a shell script that works on macOS and Linux. Here is how to install it:

```bash
# Clone the repository
git clone https://github.com/tofuutils/tofuenv.git ~/.tofuenv

# Add tofuenv to your PATH
# For bash:
echo 'export PATH="$HOME/.tofuenv/bin:$PATH"' >> ~/.bashrc

# For zsh:
echo 'export PATH="$HOME/.tofuenv/bin:$PATH"' >> ~/.zshrc

# Reload your shell
source ~/.bashrc  # or source ~/.zshrc

# Verify the installation
tofuenv --version
```

On macOS, you can also install it via Homebrew:

```bash
brew install tofuutils/tap/tofuenv

# Verify
tofuenv --version
```

## Installing OpenTofu Versions

With tofuenv installed, you can install any version of OpenTofu:

```bash
# List all available versions
tofuenv list-remote

# Install a specific version
tofuenv install 1.6.2

# Install the latest stable version
tofuenv install latest

# Install the latest version matching a prefix
tofuenv install latest:^1.6

# Install a specific pre-release version
tofuenv install 1.7.0-alpha1

# List installed versions
tofuenv list
```

The output of `tofuenv list` shows all locally installed versions with an asterisk next to the active one:

```
  1.7.0-alpha1
* 1.6.2 (set by /home/user/.tofuenv/version)
  1.6.1
  1.6.0
  1.5.0
```

## Switching Versions

You can switch the active OpenTofu version globally or per project:

```bash
# Switch globally
tofuenv use 1.6.2

# Verify the active version
tofu version
# OpenTofu v1.6.2

# Switch to the latest installed version
tofuenv use latest

# Switch to the latest 1.6.x version
tofuenv use latest:^1.6
```

## Pinning Versions Per Project

The real power of tofuenv is per-project version pinning. Create a `.opentofu-version` file in your project root:

```bash
# Pin this project to OpenTofu 1.6.2
echo "1.6.2" > .opentofu-version
```

Now, whenever you run `tofu` in that directory (or any subdirectory), tofuenv automatically switches to the pinned version:

```bash
cd /path/to/project-a
tofu version
# OpenTofu v1.6.2

cd /path/to/project-b
tofu version
# OpenTofu v1.7.0
```

This file should be committed to your repository so every team member uses the same version:

```bash
# Add to version control
git add .opentofu-version
git commit -m "Pin OpenTofu version to 1.6.2"
```

### Version File Priority

tofuenv looks for version files in this order:

1. `TOFUENV_TOFU_VERSION` environment variable
2. `.opentofu-version` file in the current directory
3. `.opentofu-version` file in parent directories (walking up to root)
4. `~/.tofuenv/version` file (global default)

This hierarchy lets you set a global default but override it for specific projects.

## Automatic Installation

You can configure tofuenv to automatically install a version if it is not already present:

```bash
# Set auto-install via environment variable
export TOFUENV_AUTO_INSTALL=true

# Now switching to an uninstalled version will install it first
cd /path/to/project
# If .opentofu-version says 1.6.3 and it's not installed,
# tofuenv will download and install it automatically
tofu version
```

Add this to your shell profile for a seamless experience:

```bash
# In ~/.bashrc or ~/.zshrc
export TOFUENV_AUTO_INSTALL=true
```

## Using tofuenv in CI/CD Pipelines

tofuenv works well in CI/CD environments. Here is how to set it up in common pipelines:

### GitHub Actions

```yaml
# .github/workflows/infrastructure.yml
name: Infrastructure

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install tofuenv
        run: |
          git clone https://github.com/tofuutils/tofuenv.git ~/.tofuenv
          echo "$HOME/.tofuenv/bin" >> $GITHUB_PATH

      - name: Install OpenTofu
        run: |
          # Reads version from .opentofu-version file
          tofuenv install
          tofu version

      - name: Init and Plan
        run: |
          tofu init
          tofu plan
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - plan
  - apply

.tofu-setup: &tofu-setup
  before_script:
    - git clone https://github.com/tofuutils/tofuenv.git ~/.tofuenv
    - export PATH="$HOME/.tofuenv/bin:$PATH"
    - tofuenv install
    - tofu version

plan:
  stage: plan
  <<: *tofu-setup
  script:
    - tofu init
    - tofu plan -out=plan.tfplan
  artifacts:
    paths:
      - plan.tfplan

apply:
  stage: apply
  <<: *tofu-setup
  script:
    - tofu init
    - tofu apply plan.tfplan
  when: manual
  only:
    - main
```

### Docker-based CI

If your CI runs in Docker containers, include tofuenv in your Dockerfile:

```dockerfile
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install tofuenv
RUN git clone https://github.com/tofuutils/tofuenv.git /opt/tofuenv
ENV PATH="/opt/tofuenv/bin:${PATH}"

# Pre-install common versions
RUN tofuenv install 1.6.2 && \
    tofuenv install 1.7.0 && \
    tofuenv use 1.6.2

WORKDIR /workspace
ENTRYPOINT ["tofu"]
```

## Managing Team Consistency

For teams, version pinning prevents the "works on my machine" problem:

```bash
# Create a version pinning policy in your project
# .opentofu-version
1.6.2
```

Add a check to your CI pipeline that verifies everyone is using the correct version:

```bash
#!/bin/bash
# scripts/check-version.sh
# Run this in CI to verify version consistency

EXPECTED_VERSION=$(cat .opentofu-version)
ACTUAL_VERSION=$(tofu version -json | python3 -c "import sys,json; print(json.load(sys.stdin)['terraform_version'])")

if [ "$EXPECTED_VERSION" != "$ACTUAL_VERSION" ]; then
  echo "ERROR: Expected OpenTofu $EXPECTED_VERSION but got $ACTUAL_VERSION"
  exit 1
fi

echo "OpenTofu version check passed: $ACTUAL_VERSION"
```

## Upgrading OpenTofu Versions

When upgrading to a new version of OpenTofu, follow this process:

```bash
# Step 1: Install the new version
tofuenv install 1.7.0

# Step 2: Test in a separate branch
git checkout -b upgrade/opentofu-1.7.0

# Step 3: Update the version file
echo "1.7.0" > .opentofu-version

# Step 4: Run init with upgrade flag
tofu init -upgrade

# Step 5: Run a plan to check for changes
tofu plan

# Step 6: Run tests if you have them
# (your test suite here)

# Step 7: Commit and create a PR
git add .opentofu-version .terraform.lock.hcl
git commit -m "Upgrade OpenTofu to 1.7.0"
```

## Uninstalling Versions

Keep your machine clean by removing versions you no longer need:

```bash
# Uninstall a specific version
tofuenv uninstall 1.5.0

# List installed versions to see what can be cleaned up
tofuenv list
```

## Monitoring Your Infrastructure

While version management keeps your tooling consistent, monitoring keeps your deployed infrastructure healthy. [OneUptime](https://oneuptime.com) provides uptime monitoring and alerting for the services you deploy with OpenTofu, regardless of which version you are running.

## Troubleshooting

**tofuenv: command not found**: Make sure `~/.tofuenv/bin` is in your PATH and you have reloaded your shell.

**Permission denied when installing**: tofuenv stores binaries in `~/.tofuenv/versions/`. Make sure that directory is writable.

**Version not found**: Run `tofuenv list-remote` to see available versions. Pre-release versions may use different naming.

**Conflicts with tfenv**: If you have tfenv installed, make sure the PATH order is correct. tofuenv and tfenv can coexist, but the one earlier in PATH takes precedence for the `tofu` and `terraform` binaries respectively.

## Conclusion

tofuenv makes OpenTofu version management effortless. Pin versions per project, auto-install missing versions, and keep your team on the same page with a single file in your repository. The setup takes five minutes and saves hours of debugging version-related issues down the road.

For more OpenTofu topics, check out our guides on [running OpenTofu in Docker](https://oneuptime.com/blog/post/2026-02-23-how-to-run-opentofu-in-docker/view) and [debugging OpenTofu configuration issues](https://oneuptime.com/blog/post/2026-02-23-how-to-debug-opentofu-configuration-issues/view).
