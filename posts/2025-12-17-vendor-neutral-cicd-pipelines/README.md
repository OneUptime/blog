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

This example demonstrates a typical GitHub Actions workflow that relies heavily on platform-specific features like marketplace actions and built-in caching. While convenient, this approach creates tight coupling to the platform.

```yaml
# GitHub Actions - platform-specific syntax
# This workflow uses vendor-specific actions that won't work on other CI platforms
name: Build and Test
on: [push]  # Trigger on every push to the repository
jobs:
  build:
    runs-on: ubuntu-latest  # GitHub-hosted runner
    steps:
      - uses: actions/checkout@v4  # GitHub-specific action for cloning
      - uses: actions/setup-node@v4  # GitHub-specific Node.js setup
        with:
          node-version: '20'  # Platform manages Node version
          cache: 'npm'  # GitHub-specific caching mechanism
      - run: npm ci  # Install dependencies
      - run: npm run build  # Build the project
      - run: npm test  # Run tests
      - uses: actions/upload-artifact@v4  # GitHub-specific artifact storage
        with:
          name: build-output
          path: dist/
```

This looks clean until you need to move to GitLab. Every `uses:` action needs a GitLab equivalent. The `cache` directive works differently. Artifacts have different syntax. You are rewriting, not migrating.

### After: Portable Bash

The portable approach keeps CI configuration minimal by delegating all logic to bash scripts. This GitHub Actions example simply triggers script execution, making platform migration trivial.

```yaml
# GitHub Actions - thin wrapper
# Platform only handles triggering and environment - all logic lives in scripts
name: Build and Test
on: [push]  # Trigger on every push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4  # Only platform-specific action needed
      - run: ./scripts/ci/setup.sh  # All setup logic in portable script
      - run: ./scripts/ci/build.sh  # Build logic is platform-agnostic
      - run: ./scripts/ci/test.sh   # Tests run identically anywhere
```

Here is the same pipeline configured for GitLab CI. Notice how the script calls are identical - only the YAML wrapper syntax changes.

```yaml
# GitLab CI - same scripts, different wrapper
# Migrating from GitHub Actions required only writing this simple config
stages:
  - build  # GitLab uses stages instead of jobs

build:
  stage: build
  script:
    - ./scripts/ci/setup.sh  # Exact same script as GitHub Actions
    - ./scripts/ci/build.sh  # No translation needed
    - ./scripts/ci/test.sh   # Portable across all CI platforms
```

The CI configuration becomes trivial. The real logic lives in `scripts/ci/`, version-controlled and portable.

## Write Scripts That Work Everywhere

### setup.sh

This setup script handles environment initialization in a platform-agnostic way. It detects whether required tools are installed and handles installation if needed, making the build reproducible on any system.

```bash
#!/usr/bin/env bash
# Enable strict mode: exit on error, undefined variables, and pipe failures
set -euo pipefail

# Detect and install Node.js if needed
# This makes the script work on any runner, not just pre-configured ones
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    # Install Node.js 20.x from NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Print versions for debugging and build reproducibility
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Install dependencies using clean install for reproducible builds
# npm ci is faster and stricter than npm install
npm ci

echo "Setup complete"
```

### build.sh

The build script compiles the application and validates the output. Including verification steps ensures builds fail fast if something goes wrong, rather than discovering issues later in the pipeline.

```bash
#!/usr/bin/env bash
# Strict mode ensures script fails immediately on any error
set -euo pipefail

echo "Starting build..."

# Run the project's build command defined in package.json
npm run build

# Verify build output exists - fail fast if build produced nothing
# This catches silent build failures that might otherwise go unnoticed
if [[ ! -d "dist" ]]; then
    echo "ERROR: Build failed - dist directory not found"
    exit 1  # Non-zero exit code signals failure to CI platform
fi

echo "Build complete"
# List build output for visibility in CI logs
ls -la dist/
```

### test.sh

This test script runs the test suite and checks code coverage. By handling coverage thresholds in the script rather than the CI platform, the same quality gates apply everywhere.

```bash
#!/usr/bin/env bash
# Strict mode for reliable error handling
set -euo pipefail

echo "Running tests..."

# Run tests with coverage report generation
# The -- passes additional flags to the underlying test runner
npm test -- --coverage

# Extract overall coverage percentage from the coverage report
# Uses grep with Perl regex to parse the coverage summary JSON
COVERAGE=$(grep -oP 'All files[^|]*\|\s*\K[\d.]+' coverage/coverage-summary.json 2>/dev/null || echo "0")
THRESHOLD=80  # Minimum acceptable coverage percentage

# Compare coverage against threshold using bc for floating point math
if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
    echo "WARNING: Coverage ${COVERAGE}% is below threshold ${THRESHOLD}%"
    # Note: This warns but doesn't fail - adjust based on your needs
fi

echo "Tests complete"
```

## Six Advantages of the Bash-First Approach

### 1. Local Debugging

When CI fails, the feedback loop is brutal: push, wait, read logs, guess, repeat. With bash scripts, you debug locally:

Running a Docker container with your source code mounted lets you reproduce the exact CI environment on your local machine. This eliminates the frustrating cycle of pushing commits just to test CI behavior.

```bash
# Reproduce the exact CI environment locally using Docker
# Mount current directory into the container for access to your code
docker run -it -v $(pwd):/app -w /app ubuntu:22.04 bash

# Run the failing script directly - same as CI would run it
./scripts/ci/build.sh
```

No more "works on my machine but fails in CI" mysteries. The script runs identically everywhere.

### 2. Faster Iteration

Writing vendor-specific YAML means committing and pushing to test every change. With bash scripts:

Bash scripts can be tested immediately without any git operations. Edit the file, run it, and see results in seconds rather than waiting for CI to pick up changes.

```bash
# Edit and test immediately - no git push required
vim scripts/ci/test.sh
./scripts/ci/test.sh  # Run locally to verify changes

# Works? Commit and push with confidence
git add -A && git commit -m "Fix test script" && git push
```

You iterate in seconds, not minutes.

### 3. Reusable Across Projects

Once you have solid CI scripts, they work everywhere:

Copying scripts between projects is trivial because they contain no platform-specific syntax. Minor adjustments for project specifics are usually all that is needed.

```bash
# New project? Copy the scripts from an existing project
cp -r ../other-project/scripts/ci ./scripts/

# Adjust for project specifics (paths, commands, etc.)
vim scripts/ci/build.sh
```

No need to remember the syntax differences between GitHub Actions, GitLab CI, Jenkins, and CircleCI. Your scripts just work.

### 4. Version Control Transparency

Bash scripts diff cleanly. You see exactly what changed:

When reviewing changes to your CI logic, bash script diffs are clear and readable. Every change is visible and understandable.

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

This deployment script demonstrates composition - each step is a focused script that does one thing well. The orchestration is obvious and easy to modify.

```bash
#!/usr/bin/env bash
# scripts/ci/deploy.sh
# Orchestrates the full deployment pipeline by calling focused scripts
set -euo pipefail

# Each script handles one concern - easy to understand and modify
./scripts/ci/build.sh           # Compile the application
./scripts/ci/test.sh            # Run the test suite
./scripts/ci/security-scan.sh   # Check for vulnerabilities
./scripts/ci/docker-build.sh    # Build the container image
./scripts/ci/push-to-registry.sh      # Push to container registry
./scripts/ci/deploy-to-kubernetes.sh  # Deploy to production
```

Each script does one thing well. The composition is obvious. Compare this to 200-line YAML files with nested conditionals and matrix strategies.

## Handling Platform-Specific Features

Some things genuinely require platform integration: caching, artifacts, secrets. Handle these minimally in the CI config and pass them to scripts as environment variables.

### Secrets

Both GitHub Actions and GitLab CI can pass secrets as environment variables. Your scripts read from the environment, remaining platform-agnostic.

```yaml
# GitHub Actions - inject secret as environment variable
env:
  DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}  # GitHub secrets syntax
steps:
  - run: ./scripts/ci/deploy.sh  # Script reads $DEPLOY_TOKEN
```

```yaml
# GitLab CI - same concept, different syntax
variables:
  DEPLOY_TOKEN: $DEPLOY_TOKEN  # GitLab CI/CD variables
script:
  - ./scripts/ci/deploy.sh  # Script uses the same $DEPLOY_TOKEN
```

Your deploy script reads `$DEPLOY_TOKEN` and works on both platforms.

### Caching

Keep caching in the CI config (it is inherently platform-specific) but make it optional:

Caching is one area where platform-specific configuration is acceptable. The key is ensuring your scripts work with or without the cache being present.

```yaml
# GitHub Actions - platform handles caching
- uses: actions/cache@v4
  with:
    path: ~/.npm  # Cache npm's global cache directory
    key: npm-${{ hashFiles('package-lock.json') }}  # Cache key based on lockfile
- run: ./scripts/ci/build.sh  # Script works with or without cache
```

Your build script works with or without the cache. The cache just makes it faster.

### Artifacts

Upload artifacts in the CI config, but let scripts control what gets built:

Scripts create the artifacts in predictable locations. The CI platform configuration simply uploads from those locations.

```bash
# scripts/ci/build.sh creates dist/
# scripts/ci/package.sh creates artifacts/release.tar.gz
```

```yaml
# GitHub Actions - upload artifacts created by scripts
- run: ./scripts/ci/package.sh  # Script creates the artifact
- uses: actions/upload-artifact@v4
  with:
    path: artifacts/  # Upload from the known location
```

The platform handles upload. Your scripts handle creation.

## Migration Becomes Trivial

When you need to move platforms, the process is straightforward:

1. Create the new CI config file (10-20 lines of YAML)
2. Set up secrets in the new platform
3. Push and verify

No logic rewrites. No action-to-orb translations. No debugging platform-specific behavior differences.

Here is a real migration from GitHub Actions to GitLab CI:

This complete GitLab CI configuration replaces a GitHub Actions workflow. The same scripts that worked on GitHub run unchanged - only this simple YAML wrapper was needed.

```yaml
# .gitlab-ci.yml - complete pipeline
# Migration from GitHub Actions took an hour, not a week
stages:
  - build
  - test
  - deploy

variables:
  DOCKER_HOST: tcp://docker:2375  # GitLab-specific Docker config

build:
  stage: build
  script:
    - ./scripts/ci/setup.sh  # Same script from GitHub Actions
    - ./scripts/ci/build.sh  # No changes needed

test:
  stage: test
  script:
    - ./scripts/ci/test.sh  # Runs identically on both platforms

deploy:
  stage: deploy
  script:
    - ./scripts/ci/deploy.sh  # Deployment logic unchanged
  only:
    - main  # Only deploy from main branch
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
