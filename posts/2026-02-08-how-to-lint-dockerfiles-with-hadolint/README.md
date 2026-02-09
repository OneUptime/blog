# How to Lint Dockerfiles with Hadolint

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, Hadolint, Linting, Best Practices, DevOps, CI/CD

Description: Learn how to use Hadolint to catch Dockerfile mistakes, enforce best practices, and integrate linting into your CI pipeline.

---

Dockerfiles look simple, but they hide plenty of opportunities for mistakes. Forgetting to pin a base image version, running `apt-get update` and `apt-get install` in separate RUN instructions, or using `COPY` when `ADD` is more appropriate - these are all common errors that lead to broken builds, security vulnerabilities, or bloated images. Hadolint catches these problems before they reach production.

Hadolint is a Dockerfile linter that parses your Dockerfile and checks it against a comprehensive set of best-practice rules. It also integrates ShellCheck to lint the shell commands inside your RUN instructions. Together, they catch both Dockerfile-specific and shell scripting issues.

## Installing Hadolint

Hadolint is available as a standalone binary, a Docker image, and through package managers.

Install Hadolint on different platforms:

```bash
# macOS via Homebrew
brew install hadolint

# Linux - download the binary directly
wget -O /usr/local/bin/hadolint \
    https://github.com/hadolint/hadolint/releases/latest/download/hadolint-Linux-x86_64
chmod +x /usr/local/bin/hadolint

# Run via Docker (no installation needed)
docker run --rm -i hadolint/hadolint < Dockerfile

# Verify installation
hadolint --version
```

## Running Your First Lint

Create a Dockerfile with some common mistakes to see Hadolint in action.

A Dockerfile with several issues:

```dockerfile
# bad-example.Dockerfile - Contains common mistakes
FROM ubuntu
RUN apt-get update
RUN apt-get install -y python3 wget
ADD https://example.com/app.tar.gz /app/
RUN cd /app && tar xzf app.tar.gz
EXPOSE 8080
CMD python3 /app/main.py
```

Run Hadolint against it:

```bash
# Lint a Dockerfile
hadolint bad-example.Dockerfile
```

Hadolint produces output like this:

```
bad-example.Dockerfile:1 DL3007 warning: Using latest is prone to errors
bad-example.Dockerfile:2 DL3009 info: Delete the apt-get lists after installing
bad-example.Dockerfile:2 DL3008 warning: Pin versions in apt get install
bad-example.Dockerfile:3 DL3008 warning: Pin versions in apt get install
bad-example.Dockerfile:4 DL3020 error: Use COPY instead of ADD for files and folders
bad-example.Dockerfile:7 DL3025 warning: Use arguments JSON notation for CMD
```

Each warning includes a rule ID (like DL3007), a severity level, and a human-readable description of the problem.

## Understanding Hadolint Rules

Hadolint rules fall into several categories. Rules prefixed with `DL` are Dockerfile-specific rules. Rules prefixed with `SC` come from ShellCheck and apply to shell commands in RUN instructions.

Here are the most important rules you will encounter:

```bash
# DL3007 - Always pin the base image version
# Bad:
FROM ubuntu
# Good:
FROM ubuntu:22.04

# DL3008 - Pin package versions in apt-get install
# Bad:
RUN apt-get install -y curl
# Good:
RUN apt-get install -y curl=7.88.1-10+deb12u5

# DL3009 - Remove apt-get cache after installing
# Bad:
RUN apt-get update && apt-get install -y curl
# Good:
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# DL3025 - Use JSON notation for CMD and ENTRYPOINT
# Bad:
CMD python3 app.py
# Good:
CMD ["python3", "app.py"]

# DL3003 - Use WORKDIR instead of cd
# Bad:
RUN cd /app && make build
# Good:
WORKDIR /app
RUN make build
```

## Configuring Hadolint

Not every rule makes sense for every project. Hadolint supports configuration files to customize which rules are enforced.

Create a `.hadolint.yaml` configuration file in your project root:

```yaml
# .hadolint.yaml - Hadolint configuration

# Ignore specific rules globally
ignored:
  - DL3008  # Don't require pinning apt package versions
  - DL3013  # Don't require pinning pip package versions

# Override severity levels
override:
  warning:
    - DL3042  # Treat "avoid cache dir" as warning instead of error
  info:
    - DL3059  # Treat "multiple consecutive RUN" as info

# Trust specific registries for base images
trustedRegistries:
  - docker.io
  - gcr.io
  - ghcr.io

# Set the default failure threshold
# Possible values: error, warning, info, style, ignore, none
failure-threshold: warning
```

Run Hadolint with the configuration file:

```bash
# Hadolint automatically picks up .hadolint.yaml from the current directory
hadolint Dockerfile

# Or specify a config file explicitly
hadolint --config /path/to/.hadolint.yaml Dockerfile
```

## Inline Rule Ignoring

Sometimes a specific rule does not apply to one line in your Dockerfile. You can suppress it with an inline comment.

Ignore a rule for the next instruction:

```dockerfile
# Ignore DL3008 for this specific install (we want latest version)
# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Ignore multiple rules for one instruction
# hadolint ignore=DL3008,DL3015
RUN apt-get update && apt-get install -y python3 git
```

The ignore comment must appear on the line immediately before the instruction it applies to.

## Output Formats

Hadolint supports multiple output formats for different use cases.

Select the output format with the `--format` flag:

```bash
# Default format (human-readable)
hadolint Dockerfile

# JSON format (useful for programmatic processing)
hadolint --format json Dockerfile

# SARIF format (for GitHub Advanced Security integration)
hadolint --format sarif Dockerfile

# GitLab CI code quality format
hadolint --format gitlab_codeclimate Dockerfile

# Checkstyle format (for Jenkins and other CI tools)
hadolint --format checkstyle Dockerfile

# Compact single-line format
hadolint --format tty Dockerfile
```

The JSON output is particularly useful for building custom tooling around Hadolint:

```bash
# Parse JSON output with jq to count issues by severity
hadolint --format json Dockerfile | jq 'group_by(.level) | map({level: .[0].level, count: length})'
```

## Integrating with CI/CD

Hadolint fits naturally into CI pipelines. Here are configurations for popular CI systems.

GitHub Actions workflow:

```yaml
# .github/workflows/lint-dockerfile.yml
name: Lint Dockerfile

on:
  pull_request:
    paths:
      - "Dockerfile*"
      - ".hadolint.yaml"

jobs:
  hadolint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Hadolint
        uses: hadolint/hadolint-action@v3.1.0
        with:
          dockerfile: Dockerfile
          failure-threshold: warning
```

GitLab CI configuration:

```yaml
# .gitlab-ci.yml
hadolint:
  stage: lint
  image: hadolint/hadolint:latest-debian
  script:
    - hadolint --format gitlab_codeclimate Dockerfile > hadolint-report.json
  artifacts:
    reports:
      codequality: hadolint-report.json
  rules:
    - changes:
        - Dockerfile
        - .hadolint.yaml
```

Jenkins pipeline step:

```groovy
// Jenkinsfile
stage('Lint Dockerfile') {
    steps {
        sh 'docker run --rm -i hadolint/hadolint < Dockerfile'
    }
}
```

## Pre-Commit Hook

Run Hadolint automatically before every commit with a pre-commit hook.

Add Hadolint to your `.pre-commit-config.yaml`:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/hadolint/hadolint
    rev: v2.12.0
    hooks:
      - id: hadolint-docker
        args: ["--failure-threshold", "warning"]
```

Install and activate the hook:

```bash
# Install pre-commit if you don't have it
pip install pre-commit

# Install the hooks
pre-commit install

# Run against all Dockerfiles manually
pre-commit run hadolint-docker --all-files
```

## Editor Integration

Hadolint integrates with popular editors for real-time feedback while writing Dockerfiles.

For VS Code, install the "hadolint" extension from the marketplace. It runs Hadolint in the background and shows warnings inline as you type.

For Vim/Neovim with ALE:

```vim
" .vimrc - Enable Hadolint via ALE
let g:ale_linters = {
\   'dockerfile': ['hadolint'],
\}
```

## Linting Multiple Dockerfiles

Projects with multiple Dockerfiles can lint them all in one pass.

Lint all Dockerfiles in a project:

```bash
# Find and lint all Dockerfiles in the project
find . -name "Dockerfile*" -exec hadolint {} \;

# Lint with a specific config for all Dockerfiles
find . -name "Dockerfile*" -print0 | xargs -0 hadolint --config .hadolint.yaml

# Lint and fail on first error (useful for CI)
find . -name "Dockerfile*" | while read -r f; do
    echo "Linting: $f"
    hadolint "$f" || exit 1
done
```

## Fixing a Real Dockerfile

Let's take a typical Dockerfile and apply Hadolint's suggestions.

Before linting:

```dockerfile
FROM node
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD npm start
```

After applying Hadolint recommendations:

```dockerfile
# Pin the base image version (DL3007)
FROM node:20-slim

WORKDIR /app

# Copy dependency files first for better caching
COPY package.json package-lock.json ./

# Use npm ci instead of npm install for reproducible builds
RUN npm ci --production

COPY . .

EXPOSE 3000

# Use JSON notation for CMD (DL3025)
CMD ["npm", "start"]
```

Every change above corresponds to a Hadolint rule. Pinning the version prevents unexpected base image changes. Using `npm ci` ensures reproducible installs. JSON notation for CMD avoids shell interpretation issues.

## Summary

Hadolint catches Dockerfile mistakes that are easy to miss during code review. Install it locally for immediate feedback, configure a `.hadolint.yaml` to fit your project's needs, and add it to your CI pipeline to enforce standards automatically. Ignore rules that do not apply to your situation, but treat its warnings seriously by default. A clean Hadolint report usually means your Dockerfile follows industry best practices.
