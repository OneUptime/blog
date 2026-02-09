# How to Run Act to Test GitHub Actions Locally in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, GitHub Actions, Act, CI/CD, DevOps, Local Testing, Automation

Description: Use act to run and debug GitHub Actions workflows locally in Docker containers, saving time on commit-push-wait cycles.

---

Testing GitHub Actions workflows is painful. The typical cycle goes like this: edit the workflow YAML, commit, push, wait for GitHub to pick it up, watch it fail, read the logs, repeat. Each iteration takes minutes, and debugging complex workflows can eat an entire afternoon.

Act solves this by running your GitHub Actions workflows locally in Docker containers. It reads your `.github/workflows/` directory, builds the execution environment, and runs the jobs on your machine. The feedback loop drops from minutes to seconds, and you can iterate on workflows without pushing a single commit.

## How Act Works

Act parses your GitHub Actions workflow YAML files and maps each job to a Docker container. It downloads or builds runner images that mimic the GitHub-hosted runner environment, mounts your repository into the container, and executes the steps sequentially. Act supports most GitHub Actions features including matrix builds, services, secrets, and artifacts.

```mermaid
graph LR
    A[.github/workflows/*.yml] --> B[Act CLI]
    B --> C[Docker Engine]
    C --> D[Runner Container]
    D --> E[Step 1: Checkout]
    E --> F[Step 2: Setup Node]
    F --> G[Step 3: Test]
    G --> H[Step 4: Build]
```

## Installation

Install act on your system. It requires Docker to be running.

```bash
# macOS with Homebrew
brew install act

# Linux - download the binary
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Verify the installation
act --version

# Verify Docker is available (act needs it)
docker info --format '{{.ServerVersion}}'
```

On first run, act asks you to choose a default runner image. The options are micro (minimal, ~200MB), medium (~500MB), and large (~18GB, closest to GitHub's actual runners). Start with medium for a good balance between compatibility and download size.

## Basic Usage

Navigate to a repository with GitHub Actions workflows and run act.

```bash
# List all available workflows and their jobs
act -l

# Run the default push event (triggers workflows with "on: push")
act

# Run a specific event
act pull_request

# Run a specific job from a specific workflow
act -j build

# Run with verbose output for debugging
act -v
```

## Example Workflow

Here is a typical GitHub Actions workflow and how to test it with act.

```yaml
# .github/workflows/ci.yml - Standard Node.js CI workflow
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

  docker:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:test .

      - name: Run container tests
        run: |
          docker run -d --name test-app myapp:test
          sleep 5
          curl -f http://localhost:3000/health || exit 1
          docker stop test-app
```

Test this workflow locally.

```bash
# Run the entire workflow (both jobs)
act push

# Run only the test job
act -j test

# Run only one matrix combination
act -j test --matrix node-version:20

# Dry run to see what would happen without actually executing
act -n
```

## Working with Secrets

GitHub Actions workflows often reference secrets. Act lets you provide them through environment files or command-line flags.

Create a `.secrets` file in your project root (add it to `.gitignore`).

```bash
# .secrets - Local secrets for act (DO NOT COMMIT THIS FILE)
GITHUB_TOKEN=ghp_your_personal_access_token
NPM_TOKEN=npm_your_token
DOCKER_USERNAME=myuser
DOCKER_PASSWORD=mypassword
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret...
```

```bash
# Run with secrets from file
act --secret-file .secrets

# Or pass individual secrets on the command line
act -s GITHUB_TOKEN=ghp_your_token -s NPM_TOKEN=npm_your_token

# Use environment variables from your shell
act -s GITHUB_TOKEN
```

## Working with Services

Many workflows use service containers for databases or caches. Act supports the `services` key in workflow files.

```yaml
# Workflow with service containers
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Run tests with services
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379
        run: npm test
```

```bash
# Run the workflow - act will start the service containers automatically
act -j test
```

## Custom Runner Images

The default act images may not have all the tools your workflows need. You can specify custom images.

```bash
# Use a specific image for the ubuntu-latest runner
act -P ubuntu-latest=catthehacker/ubuntu:full-latest

# Or create an .actrc file for persistent configuration
echo "-P ubuntu-latest=catthehacker/ubuntu:full-latest" > .actrc
echo "-P ubuntu-22.04=catthehacker/ubuntu:full-22.04" >> .actrc
```

For workflows that need specific tools, build a custom runner image.

```dockerfile
# Dockerfile.act-runner - Custom act runner with extra tools
FROM catthehacker/ubuntu:act-latest

# Install additional tools your workflows need
RUN apt-get update && apt-get install -y \
    postgresql-client \
    redis-tools \
    awscli \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install specific language versions
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs
```

```bash
# Build and use the custom runner
docker build -t my-act-runner -f Dockerfile.act-runner .
act -P ubuntu-latest=my-act-runner
```

## Debugging Workflows

Act provides several debugging techniques.

```bash
# Enable step-by-step debug output
act -v

# Drop into a shell inside the runner container when a step fails
act --reuse

# Set the ACTIONS_STEP_DEBUG variable for GitHub Actions debug logging
act -s ACTIONS_STEP_DEBUG=true

# Bind a port for debugging a running step
act --bind
```

## Event Payloads

Some workflows depend on event payload data (like PR numbers or commit messages). Create a custom event payload file.

```json
{
  "pull_request": {
    "number": 42,
    "head": {
      "ref": "feature-branch",
      "sha": "abc123"
    },
    "base": {
      "ref": "main"
    }
  }
}
```

```bash
# Run with a custom event payload
act pull_request -e event.json
```

## Limitations

Act cannot perfectly replicate the GitHub Actions environment. Some differences to be aware of: the `GITHUB_TOKEN` does not have the same permissions as in actual GitHub-hosted runs. Some third-party actions may behave differently or not work at all. GitHub-specific features like caching (`actions/cache`) have limited support. Workflow commands like `::set-output` work, but some newer command features may lag behind.

Despite these limitations, act handles 90% of CI workflows correctly and catches most configuration errors before you push.

## Cleanup

Act creates Docker containers and images during execution. Clean them up periodically.

```bash
# Remove act-related containers
docker container prune -f

# Remove act runner images if you want to free disk space
docker rmi $(docker images -q "catthehacker/*") 2>/dev/null
docker rmi $(docker images -q "nektos/act-*") 2>/dev/null
```

## Conclusion

Act transforms GitHub Actions development from a slow, push-and-pray process into a fast, local iteration loop. You catch YAML mistakes, missing environment variables, and step ordering issues in seconds instead of minutes. For teams that rely heavily on GitHub Actions, act is an essential tool. And for monitoring your CI/CD pipelines in production, [OneUptime](https://oneuptime.com) provides visibility into workflow success rates, build times, and deployment frequency so you know when your pipelines need attention.
