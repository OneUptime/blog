# How to Implement GitHub Actions Composite Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Composite Actions, CI/CD, DevOps, Automation

Description: Learn how to create reusable GitHub Actions composite actions to share workflow logic across repositories and reduce duplication.

---

Composite actions let you bundle multiple workflow steps into a single reusable action. Instead of copying YAML between repos, you define it once and call it everywhere.

## What Are Composite Actions

Composite actions are custom GitHub Actions written entirely in YAML. Unlike JavaScript or Docker actions, they run steps directly in the workflow runner. This makes them lightweight, fast to execute, and simple to maintain.

Key benefits:
- No runtime dependencies (no Node.js or Docker required)
- Share common CI/CD patterns across repositories
- Version and release like any other code
- Test locally with act or similar tools

## Creating Your First Composite Action

Every composite action needs an `action.yml` file at the root of the action directory. Here is a minimal example that sets up a Node.js environment and installs dependencies.

```yaml
# action.yml - Define a composite action for Node.js setup
name: 'Setup Node Project'
description: 'Install Node.js and project dependencies with caching'

# Define inputs that callers can pass to this action
inputs:
  node-version:
    description: 'Node.js version to use'
    required: false
    default: '20'
  package-manager:
    description: 'Package manager (npm, yarn, pnpm)'
    required: false
    default: 'npm'

# Define outputs that callers can use after this action runs
outputs:
  cache-hit:
    description: 'Whether dependencies were restored from cache'
    value: ${{ steps.cache-deps.outputs.cache-hit }}

# The runs block defines this as a composite action
runs:
  using: 'composite'
  steps:
    # Set up the specified Node.js version
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}

    # Cache node_modules based on lockfile hash
    - name: Cache dependencies
      id: cache-deps
      uses: actions/cache@v4
      with:
        path: node_modules
        key: ${{ runner.os }}-${{ inputs.package-manager }}-${{ hashFiles('**/package-lock.json', '**/yarn.lock', '**/pnpm-lock.yaml') }}

    # Install dependencies if cache missed
    - name: Install dependencies
      if: steps.cache-deps.outputs.cache-hit != 'true'
      shell: bash
      run: |
        if [ "${{ inputs.package-manager }}" = "yarn" ]; then
          yarn install --frozen-lockfile
        elif [ "${{ inputs.package-manager }}" = "pnpm" ]; then
          pnpm install --frozen-lockfile
        else
          npm ci
        fi
```

## Input and Output Parameters

Inputs let callers customize behavior. Outputs pass data back to the calling workflow.

```yaml
# action.yml - Action with multiple inputs and outputs
name: 'Build and Test'
description: 'Build application and run tests with coverage'

inputs:
  working-directory:
    description: 'Directory containing the project'
    required: false
    default: '.'
  test-command:
    description: 'Command to run tests'
    required: false
    default: 'npm test'
  coverage-threshold:
    description: 'Minimum coverage percentage required'
    required: false
    default: '80'

outputs:
  coverage-percentage:
    description: 'Actual test coverage percentage'
    value: ${{ steps.coverage.outputs.percentage }}
  build-artifact:
    description: 'Path to build output'
    value: ${{ steps.build.outputs.artifact-path }}

runs:
  using: 'composite'
  steps:
    - name: Build
      id: build
      shell: bash
      working-directory: ${{ inputs.working-directory }}
      run: |
        npm run build
        # Set output using GITHUB_OUTPUT file
        echo "artifact-path=${{ inputs.working-directory }}/dist" >> $GITHUB_OUTPUT

    - name: Run tests with coverage
      id: coverage
      shell: bash
      working-directory: ${{ inputs.working-directory }}
      run: |
        ${{ inputs.test-command }} -- --coverage
        # Parse coverage from report and set as output
        COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
        echo "percentage=$COVERAGE" >> $GITHUB_OUTPUT

    - name: Check coverage threshold
      shell: bash
      run: |
        if (( $(echo "${{ steps.coverage.outputs.percentage }} < ${{ inputs.coverage-threshold }}" | bc -l) )); then
          echo "Coverage ${{ steps.coverage.outputs.percentage }}% is below threshold ${{ inputs.coverage-threshold }}%"
          exit 1
        fi
```

## Using Shell Steps Effectively

Shell steps are the core of composite actions. Always specify the shell explicitly for cross-platform compatibility.

```yaml
runs:
  using: 'composite'
  steps:
    # Bash step for Unix-like systems
    - name: Unix setup
      shell: bash
      run: |
        echo "Running on $RUNNER_OS"
        chmod +x ./scripts/setup.sh
        ./scripts/setup.sh

    # PowerShell step for Windows compatibility
    - name: Windows setup
      if: runner.os == 'Windows'
      shell: pwsh
      run: |
        Write-Host "Running on Windows"
        .\scripts\setup.ps1

    # Python for complex logic
    - name: Process data
      shell: python
      run: |
        import json
        import os

        data = {"status": "success", "runner": os.environ.get("RUNNER_OS")}

        # Write to GITHUB_OUTPUT for use in later steps
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write(f"result={json.dumps(data)}\n")
```

## Referencing Other Actions

Composite actions can call other actions, including other composite actions. This enables powerful composition patterns.

```yaml
# action.yml - Compose multiple actions together
name: 'Full CI Pipeline'
description: 'Complete CI pipeline with lint, test, build, and security scan'

inputs:
  node-version:
    required: false
    default: '20'

runs:
  using: 'composite'
  steps:
    # Use the official checkout action
    - name: Checkout code
      uses: actions/checkout@v4

    # Call another composite action from the same repository
    - name: Setup project
      uses: ./.github/actions/setup-node
      with:
        node-version: ${{ inputs.node-version }}

    # Call a third-party action
    - name: Lint code
      uses: oxsecurity/megalinter@v7
      with:
        flavor: javascript

    # Call an action from another repository
    - name: Security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ inputs.snyk-token }}

    # Run custom shell commands
    - name: Build
      shell: bash
      run: npm run build
```

## Sharing Across Repositories

There are three ways to share composite actions across repositories.

**Option 1: Dedicated action repository**

Create a repository specifically for your action. Callers reference it by owner/repo.

```yaml
# In your workflow file
steps:
  - uses: your-org/setup-node-action@v1
    with:
      node-version: '20'
```

**Option 2: Monorepo with multiple actions**

Store multiple actions in subdirectories of one repository.

```
your-org/actions/
  setup-node/
    action.yml
  deploy-aws/
    action.yml
  notify-slack/
    action.yml
```

```yaml
# Reference a specific action from the monorepo
steps:
  - uses: your-org/actions/setup-node@v1
  - uses: your-org/actions/deploy-aws@v1
```

**Option 3: Same repository**

For repository-specific actions, store them in `.github/actions/`.

```yaml
# Reference action from the same repository
steps:
  - uses: ./.github/actions/my-action
```

## Versioning and Releases

Use semantic versioning with Git tags to manage releases.

```bash
# Create initial release
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0

# Create major version tag that tracks latest v1.x
git tag -fa v1 -m "Update v1 tag"
git push origin v1 --force
```

Callers can pin to specific versions:

```yaml
steps:
  # Pin to exact version for reproducibility
  - uses: your-org/action@v1.2.3

  # Pin to major version for automatic minor/patch updates
  - uses: your-org/action@v1

  # Pin to commit SHA for maximum security
  - uses: your-org/action@a1b2c3d4e5f6
```

## Testing Composite Actions

Test your actions locally using `act` or by creating a test workflow.

```yaml
# .github/workflows/test-action.yml
name: Test Composite Action

on:
  push:
    paths:
      - 'action.yml'
      - '.github/workflows/test-action.yml'
  pull_request:
    paths:
      - 'action.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Test the action from this repository
      - name: Test action
        uses: ./
        with:
          node-version: '20'

      # Verify the action worked correctly
      - name: Verify setup
        run: |
          node --version | grep "v20"
          test -d node_modules
```

For more comprehensive testing, create a matrix that tests multiple scenarios:

```yaml
jobs:
  test-matrix:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: ['18', '20', '22']
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: ./
        with:
          node-version: ${{ matrix.node }}
      - run: node --version
```

## Publishing to the Marketplace

To publish your action to the GitHub Marketplace:

1. Ensure `action.yml` has required metadata:

```yaml
name: 'Your Action Name'
description: 'A clear description of what the action does'
author: 'Your Name'

# Branding for marketplace listing
branding:
  icon: 'check-circle'
  color: 'green'

inputs:
  # ... your inputs

runs:
  using: 'composite'
  steps:
    # ... your steps
```

2. Create a release through the GitHub UI
3. Select "Publish this release to the GitHub Marketplace"
4. Add categories and a README with usage examples

## Best Practices and Patterns

**Keep actions focused**

Each action should do one thing well. Create separate actions for setup, build, test, and deploy rather than one monolithic action.

**Document inputs and outputs**

Include clear descriptions for all inputs and outputs. Add a comprehensive README with examples.

**Handle errors gracefully**

```yaml
- name: Graceful error handling
  shell: bash
  run: |
    set -euo pipefail  # Exit on error, undefined vars, pipe failures

    if ! command -v required-tool &> /dev/null; then
      echo "::error::required-tool is not installed"
      exit 1
    fi
```

**Use step IDs for conditional logic**

```yaml
- name: Check condition
  id: check
  shell: bash
  run: |
    if [ -f "package.json" ]; then
      echo "has-package=true" >> $GITHUB_OUTPUT
    else
      echo "has-package=false" >> $GITHUB_OUTPUT
    fi

- name: Run only if package.json exists
  if: steps.check.outputs.has-package == 'true'
  shell: bash
  run: npm install
```

**Provide sensible defaults**

Make common use cases work without configuration. Power users can override defaults as needed.

**Version your dependencies**

Pin action versions you depend on to avoid breaking changes:

```yaml
steps:
  - uses: actions/checkout@v4.1.1  # Pin to specific version
  - uses: actions/cache@v4.0.0
```

---

Composite actions turn repeated workflow logic into maintainable, versioned, shareable components. Start by extracting common patterns from your existing workflows, then evolve them based on team needs.

Monitor your CI/CD pipelines with [OneUptime](https://oneuptime.com) to track build times, failure rates, and deployment frequency across all your repositories.
