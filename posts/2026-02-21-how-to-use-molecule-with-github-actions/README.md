# How to Use Molecule with GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, GitHub Actions, CI/CD, DevOps

Description: Set up automated Molecule testing for Ansible roles in GitHub Actions with matrix builds, caching, and multi-platform validation pipelines.

---

Running Molecule tests locally is good. Running them automatically on every push and pull request is better. GitHub Actions provides a natural home for Molecule CI because it offers free Linux runners with Docker pre-installed. This post walks through setting up Molecule in GitHub Actions, from a basic single-scenario pipeline to an advanced matrix build that tests across multiple platforms and Ansible versions.

## Basic GitHub Actions Workflow

Start with a minimal workflow that runs Molecule on every push and pull request.

```yaml
# .github/workflows/molecule.yml - basic Molecule CI
name: Molecule Test

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  molecule:
    runs-on: ubuntu-latest
    steps:
      - name: Check out code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install ansible-core molecule molecule-plugins[docker] ansible-lint yamllint

      - name: Run Molecule tests
        run: molecule test
        env:
          PY_COLORS: "1"
          ANSIBLE_FORCE_COLOR: "1"
```

This installs Molecule, runs the full test lifecycle, and reports the result. The color environment variables make the output readable in GitHub's log viewer.

## Adding Dependency Caching

Installing Python packages on every run is slow. Cache them.

```yaml
# .github/workflows/molecule.yml - with pip caching
name: Molecule Test

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  molecule:
    runs-on: ubuntu-latest
    steps:
      - name: Check out code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"
          cache-dependency-path: |
            requirements-dev.txt

      - name: Install dependencies
        run: pip install -r requirements-dev.txt

      - name: Run Molecule tests
        run: molecule test
        env:
          PY_COLORS: "1"
          ANSIBLE_FORCE_COLOR: "1"
```

Create the requirements file for consistent dependency versions.

```
# requirements-dev.txt - pinned development dependencies
ansible-core>=2.15,<2.17
molecule>=6.0,<7.0
molecule-plugins[docker]>=23.0
ansible-lint>=6.0
yamllint>=1.0
```

## Matrix Builds for Multiple Platforms

Test across different operating systems using a build matrix.

```yaml
# .github/workflows/molecule.yml - matrix build across platforms
name: Molecule Test

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"
      - run: pip install ansible-core ansible-lint yamllint
      - name: Run yamllint
        run: yamllint .
      - name: Run ansible-lint
        run: ansible-lint .

  molecule:
    needs: lint
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        distro:
          - ubuntu2204
          - ubuntu2004
          - debian12
          - rocky9
          - rocky8
    steps:
      - name: Check out code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install dependencies
        run: pip install ansible-core molecule molecule-plugins[docker]

      - name: Run Molecule on ${{ matrix.distro }}
        run: molecule test -- --limit ${{ matrix.distro }}
        env:
          PY_COLORS: "1"
          ANSIBLE_FORCE_COLOR: "1"
```

The `fail-fast: false` setting ensures all matrix combinations run even if one fails. This way you see all failures at once instead of stopping at the first one.

## Testing Multiple Ansible Versions

Verify your role works with different Ansible versions.

```yaml
# .github/workflows/molecule.yml - matrix with Ansible versions
jobs:
  molecule:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        distro:
          - ubuntu2204
          - rocky9
        ansible-version:
          - "2.15"
          - "2.16"
          - "2.17"
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install Ansible ${{ matrix.ansible-version }}
        run: |
          pip install "ansible-core~=${{ matrix.ansible-version }}.0" \
                      molecule molecule-plugins[docker]

      - name: Show Ansible version
        run: ansible --version

      - name: Run Molecule on ${{ matrix.distro }}
        run: molecule test -- --limit ${{ matrix.distro }}
        env:
          PY_COLORS: "1"
          ANSIBLE_FORCE_COLOR: "1"
```

## Testing Multiple Scenarios

If your role has multiple Molecule scenarios, test each one.

```yaml
# .github/workflows/molecule.yml - test multiple scenarios
jobs:
  molecule:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        scenario:
          - default
          - tls
          - cluster
          - minimal
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install dependencies
        run: pip install ansible-core molecule molecule-plugins[docker]

      - name: Run Molecule scenario ${{ matrix.scenario }}
        run: molecule test --scenario-name ${{ matrix.scenario }}
        env:
          PY_COLORS: "1"
          ANSIBLE_FORCE_COLOR: "1"
```

## Full Production Workflow

Here is a complete workflow that combines linting, multi-platform testing, and status badges.

```yaml
# .github/workflows/molecule.yml - production-ready CI pipeline
name: Molecule CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    # Run weekly to catch dependency breakages
    - cron: "0 6 * * 1"

env:
  PY_COLORS: "1"
  ANSIBLE_FORCE_COLOR: "1"

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install linting tools
        run: pip install ansible-core ansible-lint yamllint

      - name: Run yamllint
        run: yamllint .

      - name: Run ansible-lint
        run: ansible-lint .

  molecule:
    name: "Molecule (${{ matrix.distro }}, Ansible ${{ matrix.ansible }})"
    needs: lint
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        distro:
          - ubuntu2204
          - ubuntu2004
          - debian12
          - rocky9
          - rocky8
        ansible:
          - "2.16"
        include:
          # Test latest Ansible only on Ubuntu 22.04
          - distro: ubuntu2204
            ansible: "2.17"

    steps:
      - name: Check out code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install dependencies
        run: |
          pip install "ansible-core~=${{ matrix.ansible }}.0" \
                      molecule molecule-plugins[docker] \
                      ansible-lint

      - name: Install Galaxy dependencies
        run: |
          if [ -f requirements.yml ]; then
            ansible-galaxy collection install -r requirements.yml --force
          fi

      - name: Run Molecule
        run: molecule test -- --limit ${{ matrix.distro }}

      - name: Upload Molecule logs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: molecule-logs-${{ matrix.distro }}-ansible-${{ matrix.ansible }}
          path: |
            ~/.cache/molecule/
            /tmp/molecule-*

  report:
    name: Test Results
    needs: molecule
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Check molecule results
        run: |
          if [ "${{ needs.molecule.result }}" != "success" ]; then
            echo "Molecule tests failed"
            exit 1
          fi
          echo "All Molecule tests passed"
```

## Handling Secrets and Private Registries

If your role needs secrets (API keys, registry credentials), use GitHub Actions secrets.

```yaml
      - name: Login to private registry
        run: |
          docker login registry.example.com \
            -u "${{ secrets.REGISTRY_USER }}" \
            -p "${{ secrets.REGISTRY_PASSWORD }}"

      - name: Run Molecule with secrets
        run: molecule test
        env:
          VAULT_PASSWORD: ${{ secrets.ANSIBLE_VAULT_PASSWORD }}
          API_KEY: ${{ secrets.TEST_API_KEY }}
```

For Ansible Vault encrypted files, create the vault password file dynamically.

```yaml
      - name: Create vault password file
        run: echo "${{ secrets.ANSIBLE_VAULT_PASSWORD }}" > .vault-password

      - name: Run Molecule
        run: molecule test
        env:
          ANSIBLE_VAULT_PASSWORD_FILE: .vault-password

      - name: Clean up vault password
        if: always()
        run: rm -f .vault-password
```

## Caching Docker Images

Docker image pulls can be slow. Cache them between runs.

```yaml
      - name: Cache Docker images
        uses: actions/cache@v4
        with:
          path: /tmp/docker-images
          key: docker-images-${{ hashFiles('molecule/default/molecule.yml') }}

      - name: Load cached Docker images
        run: |
          if [ -d /tmp/docker-images ]; then
            for image in /tmp/docker-images/*.tar; do
              docker load -i "$image" || true
            done
          fi

      - name: Run Molecule
        run: molecule test

      - name: Save Docker images for cache
        if: always()
        run: |
          mkdir -p /tmp/docker-images
          docker images --format '{{.Repository}}:{{.Tag}}' | \
            grep geerlingguy | while read img; do
              filename=$(echo "$img" | tr '/:' '_')
              docker save -o "/tmp/docker-images/${filename}.tar" "$img" || true
            done
```

## Adding a Status Badge

Add a badge to your README showing the test status.

```markdown
![Molecule CI](https://github.com/username/role-name/actions/workflows/molecule.yml/badge.svg)
```

## Debugging Failed CI Runs

When tests fail in CI but pass locally, here are common causes:

1. **Different Docker versions.** GitHub runners use a specific Docker version. Check `docker --version` output.

2. **Network restrictions.** Some Docker images may fail to pull due to rate limits or network issues.

3. **Timing issues.** Services might need more time to start on CI runners, which are sometimes slower than local machines.

4. **Missing Galaxy dependencies.** If you rely on collections, make sure they are installed before running Molecule.

Add debugging steps to your workflow.

```yaml
      - name: Debug information
        if: failure()
        run: |
          echo "=== Docker version ==="
          docker version
          echo "=== Docker containers ==="
          docker ps -a
          echo "=== Docker logs ==="
          docker ps -a -q | xargs -I {} docker logs {} 2>&1 | tail -50
          echo "=== Molecule list ==="
          molecule list || true
```

## Practical Tips

1. **Run lint as a separate job.** Lint is fast and does not need Docker. Running it first with `needs: lint` on the molecule job saves time when there are syntax errors.

2. **Use `fail-fast: false`.** You want to see all failures, not just the first one. This is especially important for matrix builds.

3. **Schedule weekly runs.** Upstream image changes or dependency updates can break your tests. A weekly scheduled run catches these regressions.

4. **Upload artifacts on failure.** Molecule logs and container output help debug CI-only failures.

5. **Keep the matrix manageable.** Every matrix combination is a separate job. Five distros times three Ansible versions is 15 jobs. Be intentional about what you test.

6. **Test PRs, not just main.** Running tests on pull requests catches issues before they merge. This is the whole point of CI.

Molecule in GitHub Actions gives you automated confidence that your Ansible roles work across platforms. Set it up once, tune it as needed, and let CI catch the bugs before your users do.
