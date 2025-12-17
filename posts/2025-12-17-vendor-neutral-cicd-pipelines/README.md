# Why Vendor-Neutral CI/CD matters: Why Bash Scripts Beat Platform Lock-In

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, DevOps, Bash, Vendor Lock-in, Automation, GitHub Actions, GitLab CI, Jenkins

Description: Build portable CI/CD pipelines by putting your logic in bash scripts instead of vendor-specific syntax. When platforms change pricing, policies, or disappear entirely, migrate in hours instead of weeks.

> Your build logic belongs in scripts you control, not YAML dialects owned by vendors who can rug-pull you tomorrow.

**Timely example:** On December 16, 2025, GitHub [announced](https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/) they will start charging $0.002/minute for self-hosted runners in March 2026. A feature that was free for years now has a price. If your CI logic is trapped in GitHub Actions syntax, you pay or you rewrite. If your logic lives in bash scripts, you evaluate alternatives and migrate in a day.

Every CI/CD platform sells convenience. GitHub Actions has slick marketplace actions. GitLab CI has includes and extends. CircleCI has orbs. Jenkins has a plugin for everything. The pitch is always the same: use our abstractions, ship faster.

The hidden cost? Your build logic becomes platform-specific. When that platform raises prices 300%, gets acquired, deprecates features, or blocks your account, you discover the real price of convenience. Migration becomes a multi-week engineering project instead of a configuration change.

There is a better way: treat your CI/CD platform as a dumb executor and keep your actual logic in bash scripts.

## The Rug-Pull Reality

It happens more often than vendors admit:

- **GitHub's self-hosted runner tax (December 2025)** – Just yesterday, [GitHub announced](https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/) that starting March 2026, self-hosted runners will cost $0.002 per minute. Teams who built entire infrastructures around "free" self-hosted runners now face unexpected bills. The feature that was free for years suddenly has a price tag.
- **Pricing shocks** – Travis CI went from free for open source to paid overnight. Teams scrambled to migrate years of `.travis.yml` logic.
- **Feature deprecation** – CircleCI deprecated their 1.0 configuration format. Pipelines broke. Engineers spent weeks rewriting.
- **Acquisition chaos** – When platforms get acquired, roadmaps shift. Your carefully crafted integrations become orphaned.
- **Account suspension** – Automated systems flag accounts. Appeals take weeks. Your deployments halt.

If your pipeline logic lives in vendor-specific syntax, each of these events becomes an emergency. If your logic lives in bash scripts, it becomes a configuration update.

## The Portable Pipeline Pattern

The pattern is simple: CI/CD platforms should only do two things:

1. **Trigger execution** – On push, PR, schedule, or manual trigger.
2. **Call your scripts** – Pass environment variables, run bash, report exit codes.

Everything else lives in your repository as shell scripts that run identically on any platform or your laptop.

### Before: Vendor Lock-In

```yaml
# GitHub Actions - platform-specific syntax
name: Build and Test
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
```

This looks clean until you need to move to GitLab. Every `uses:` action needs a GitLab equivalent. The `cache` directive works differently. Artifacts have different syntax. You are rewriting, not migrating.

### After: Portable Bash

```yaml
# GitHub Actions - thin wrapper
name: Build and Test
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/ci/setup.sh
      - run: ./scripts/ci/build.sh
      - run: ./scripts/ci/test.sh
```

```yaml
# GitLab CI - same scripts, different wrapper
stages:
  - build

build:
  stage: build
  script:
    - ./scripts/ci/setup.sh
    - ./scripts/ci/build.sh
    - ./scripts/ci/test.sh
```

The CI configuration becomes trivial. The real logic lives in `scripts/ci/`, version-controlled and portable.

## Write Scripts That Work Everywhere

### setup.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

# Detect and install Node.js if needed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Install dependencies
npm ci

echo "Setup complete"
```

### build.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Starting build..."

npm run build

# Verify build output exists
if [[ ! -d "dist" ]]; then
    echo "ERROR: Build failed - dist directory not found"
    exit 1
fi

echo "Build complete"
ls -la dist/
```

### test.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Running tests..."

# Run tests with coverage
npm test -- --coverage

# Check coverage threshold
COVERAGE=$(grep -oP 'All files[^|]*\|\s*\K[\d.]+' coverage/coverage-summary.json 2>/dev/null || echo "0")
THRESHOLD=80

if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
    echo "WARNING: Coverage ${COVERAGE}% is below threshold ${THRESHOLD}%"
fi

echo "Tests complete"
```

## Six Advantages of the Bash-First Approach

### 1. Local Debugging

When CI fails, the feedback loop is brutal: push, wait, read logs, guess, repeat. With bash scripts, you debug locally:

```bash
# Reproduce the exact CI environment
docker run -it -v $(pwd):/app -w /app ubuntu:22.04 bash

# Run the failing script
./scripts/ci/build.sh
```

No more "works on my machine but fails in CI" mysteries. The script runs identically everywhere.

### 2. Faster Iteration

Writing vendor-specific YAML means committing and pushing to test every change. With bash scripts:

```bash
# Edit and test immediately
vim scripts/ci/test.sh
./scripts/ci/test.sh

# Works? Commit and push
git add -A && git commit -m "Fix test script" && git push
```

You iterate in seconds, not minutes.

### 3. Reusable Across Projects

Once you have solid CI scripts, they work everywhere:

```bash
# New project? Copy the scripts
cp -r ../other-project/scripts/ci ./scripts/

# Adjust for project specifics
vim scripts/ci/build.sh
```

No need to remember the syntax differences between GitHub Actions, GitLab CI, Jenkins, and CircleCI. Your scripts just work.

### 4. Version Control Transparency

Bash scripts diff cleanly. You see exactly what changed:

```diff
- npm test
+ npm test -- --coverage --ci
```

Compare this to debugging why a GitHub Action updated from v3 to v4 broke your pipeline. Marketplace actions are black boxes. Your scripts are transparent.

### 5. No Marketplace Dependencies

Third-party actions and orbs are convenient until:

- They get deprecated
- They have security vulnerabilities
- They stop working with new platform versions
- The maintainer disappears

Your bash scripts have no external dependencies beyond standard Unix tools that have been stable for decades.

### 6. Composable Complexity

Complex pipelines stay readable when composed from focused scripts:

```bash
#!/usr/bin/env bash
# scripts/ci/deploy.sh
set -euo pipefail

./scripts/ci/build.sh
./scripts/ci/test.sh
./scripts/ci/security-scan.sh
./scripts/ci/docker-build.sh
./scripts/ci/push-to-registry.sh
./scripts/ci/deploy-to-kubernetes.sh
```

Each script does one thing well. The composition is obvious. Compare this to 200-line YAML files with nested conditionals and matrix strategies.

## Handling Platform-Specific Features

Some things genuinely require platform integration: caching, artifacts, secrets. Handle these minimally in the CI config and pass them to scripts as environment variables.

### Secrets

```yaml
# GitHub Actions
env:
  DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
steps:
  - run: ./scripts/ci/deploy.sh
```

```yaml
# GitLab CI
variables:
  DEPLOY_TOKEN: $DEPLOY_TOKEN
script:
  - ./scripts/ci/deploy.sh
```

Your deploy script reads `$DEPLOY_TOKEN` and works on both platforms.

### Caching

Keep caching in the CI config (it is inherently platform-specific) but make it optional:

```yaml
# GitHub Actions
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('package-lock.json') }}
- run: ./scripts/ci/build.sh
```

Your build script works with or without the cache. The cache just makes it faster.

### Artifacts

Upload artifacts in the CI config, but let scripts control what gets built:

```bash
# scripts/ci/build.sh creates dist/
# scripts/ci/package.sh creates artifacts/release.tar.gz
```

```yaml
# GitHub Actions
- run: ./scripts/ci/package.sh
- uses: actions/upload-artifact@v4
  with:
    path: artifacts/
```

The platform handles upload. Your scripts handle creation.

## Migration Becomes Trivial

When you need to move platforms, the process is straightforward:

1. Create the new CI config file (10-20 lines of YAML)
2. Set up secrets in the new platform
3. Push and verify

No logic rewrites. No action-to-orb translations. No debugging platform-specific behavior differences.

Here is a real migration from GitHub Actions to GitLab CI:

```yaml
# .gitlab-ci.yml - complete pipeline
stages:
  - build
  - test
  - deploy

variables:
  DOCKER_HOST: tcp://docker:2375

build:
  stage: build
  script:
    - ./scripts/ci/setup.sh
    - ./scripts/ci/build.sh

test:
  stage: test
  script:
    - ./scripts/ci/test.sh

deploy:
  stage: deploy
  script:
    - ./scripts/ci/deploy.sh
  only:
    - main
```

That is it. The same scripts that ran on GitHub Actions now run on GitLab. Migration took an hour, not a week.

## Start Today

You do not need to rewrite everything at once:

1. **Pick one job** – Take your most complex CI job and extract the logic into a bash script.
2. **Test locally** – Run the script on your machine. Fix issues without push-and-pray.
3. **Update the CI config** – Replace the inline commands with a script call.
4. **Repeat** – Gradually move all logic into scripts.

Within a sprint, your pipelines become portable. When the next rug-pull happens - and it will - you will be ready.

## Your Pipeline, Your Terms

CI/CD platforms are commodities. They trigger builds, run containers, and report results. The valuable part is your build logic - the accumulated knowledge of how to compile, test, and deploy your specific application.

Keep that logic in bash scripts you control. Let platforms compete for your business on price and reliability. When they fail you, walk away without looking back.

Vendor lock-in is a choice. Choose freedom.
