# How to Handle Provider Releases and CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, CI/CD, GitHub Actions, Release Management

Description: Learn how to set up a complete CI/CD pipeline for custom Terraform providers including automated testing, building, signing, and releasing using GitHub Actions and GoReleaser.

---

A reliable CI/CD pipeline is essential for maintaining a professional Terraform provider. It ensures that every change is tested, every release is built consistently, and every binary is properly signed. Without automation, releasing becomes error-prone and time-consuming, and regressions slip through.

In this guide, we will build a complete CI/CD pipeline for a Terraform provider using GitHub Actions, covering pull request testing, release automation, documentation validation, and quality gates.

## CI/CD Pipeline Overview

A well-structured provider pipeline has these stages:

1. **Pull Request Checks** - Run on every PR to catch issues early
2. **Merge Checks** - Run after merge to ensure main branch stability
3. **Release Pipeline** - Triggered by Git tags to build and publish releases
4. **Documentation Pipeline** - Validates and generates provider docs

## Pull Request Testing Workflow

This workflow runs on every pull request to validate changes:

```yaml
# .github/workflows/test.yml
name: Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  # Build and basic validation
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version-file: 'go.mod'
          cache: true

      - name: Build provider
        run: go build -v ./...

      - name: Run linter
        uses: golangci/golangci-lint-action@v4
        with:
          version: latest

  # Unit tests
  unit-tests:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version-file: 'go.mod'
          cache: true

      - name: Run unit tests
        run: go test ./... -v -coverprofile=coverage.out -timeout 10m

      - name: Check coverage
        run: |
          # Parse coverage percentage
          COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')
          echo "Coverage: ${COVERAGE}%"

          # Fail if coverage is below threshold
          if (( $(echo "$COVERAGE < 60" | bc -l) )); then
            echo "Coverage ${COVERAGE}% is below the 60% threshold"
            exit 1
          fi

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: coverage.out

  # Acceptance tests (only on main branch or when labeled)
  acceptance-tests:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main' || contains(github.event.pull_request.labels.*.name, 'run-acceptance-tests')
    timeout-minutes: 120
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version-file: 'go.mod'
          cache: true

      - name: Run acceptance tests
        env:
          TF_ACC: "1"
          EXAMPLE_API_KEY: ${{ secrets.EXAMPLE_API_KEY }}
          EXAMPLE_API_URL: ${{ secrets.EXAMPLE_API_URL }}
        run: go test ./internal/provider/ -v -timeout 120m -parallel 4

  # Validate documentation
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version-file: 'go.mod'
          cache: true

      - name: Install tfplugindocs
        run: go install github.com/hashicorp/terraform-plugin-docs/cmd/tfplugindocs@latest

      - name: Generate documentation
        run: tfplugindocs generate

      - name: Check for drift
        run: |
          if ! git diff --exit-code docs/; then
            echo "Documentation is out of date. Run 'tfplugindocs generate' and commit the changes."
            exit 1
          fi

      - name: Validate documentation
        run: tfplugindocs validate
```

## Release Workflow

This workflow is triggered by Git tags and builds release binaries:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  # Verify tests pass before releasing
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version-file: 'go.mod'
          cache: true

      - name: Run unit tests
        run: go test ./... -v -timeout 10m

  # Build and publish the release
  goreleaser:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for changelog generation

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version-file: 'go.mod'
          cache: true

      - name: Import GPG key
        id: import_gpg
        uses: crazy-max/ghaction-import-gpg@v6
        with:
          gpg_private_key: ${{ secrets.GPG_PRIVATE_KEY }}
          passphrase: ${{ secrets.GPG_PASSPHRASE }}

      - name: Run GoReleaser
        uses: goreleaser/goreleaser-action@v5
        with:
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GPG_FINGERPRINT: ${{ steps.import_gpg.outputs.fingerprint }}

      - name: Upload release artifacts
        uses: actions/upload-artifact@v4
        with:
          name: release-artifacts
          path: dist/
```

## GoReleaser Configuration

Configure GoReleaser for cross-platform builds:

```yaml
# .goreleaser.yml
version: 2

before:
  hooks:
    - go mod tidy
    - go generate ./...

builds:
  - env:
      - CGO_ENABLED=0
    mod_timestamp: '{{ .CommitTimestamp }}'
    flags:
      - -trimpath
    ldflags:
      - '-s -w -X main.version={{.Version}}'
    goos:
      - freebsd
      - windows
      - linux
      - darwin
    goarch:
      - amd64
      - '386'
      - arm
      - arm64
    ignore:
      - goos: darwin
        goarch: '386'
      - goos: windows
        goarch: arm
      - goos: windows
        goarch: arm64
    binary: '{{ .ProjectName }}_v{{ .Version }}'

archives:
  - format: zip
    name_template: '{{ .ProjectName }}_{{ .Version }}_{{ .Os }}_{{ .Arch }}'

checksum:
  name_template: '{{ .ProjectName }}_{{ .Version }}_SHA256SUMS'
  algorithm: sha256

signs:
  - artifacts: checksum
    args:
      - "--batch"
      - "--local-user"
      - "{{ .Env.GPG_FINGERPRINT }}"
      - "--output"
      - "${signature}"
      - "--detach-sign"
      - "${artifact}"

release:
  extra_files:
    - glob: 'terraform-registry-manifest.json'
      name_template: '{{ .ProjectName }}_{{ .Version }}_manifest.json'

changelog:
  sort: asc
  use: github
  filters:
    exclude:
      - '^docs:'
      - '^test:'
      - '^ci:'
      - '^chore:'
  groups:
    - title: Features
      regexp: '^feat'
    - title: Bug Fixes
      regexp: '^fix'
    - title: Other Changes
      order: 999
```

## Linting Configuration

Set up golangci-lint for code quality:

```yaml
# .golangci.yml
run:
  timeout: 5m
  modules-download-mode: readonly

linters:
  enable:
    - errcheck
    - gosimple
    - govet
    - ineffassign
    - staticcheck
    - unused
    - gofmt
    - goimports
    - misspell
    - unconvert

linters-settings:
  errcheck:
    check-blank: true
  gofmt:
    simplify: true

issues:
  exclude-rules:
    # Test files can have longer functions
    - path: _test\.go
      linters:
        - funlen
```

## Automated Dependency Updates

Keep dependencies up to date with Dependabot:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "gomod"
    directory: "/"
    schedule:
      interval: "weekly"
    reviewers:
      - "your-team"
    labels:
      - "dependencies"
    open-pull-requests-limit: 10

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "ci"
```

## Creating a Release

The complete release workflow:

```bash
# 1. Ensure all tests pass on main
git checkout main
git pull origin main

# 2. Update the changelog
# Edit CHANGELOG.md with the new version's changes

# 3. Commit the changelog
git add CHANGELOG.md
git commit -m "Prepare release v1.2.0"
git push origin main

# 4. Create and push the tag
git tag v1.2.0
git push origin v1.2.0

# 5. GitHub Actions takes over:
#    - Runs tests
#    - Builds binaries for all platforms
#    - Signs the checksum file
#    - Creates a GitHub release
#    - Terraform Registry picks up the new release
```

## Monitoring Release Health

Add a workflow that checks the health of your latest release:

```yaml
# .github/workflows/release-check.yml
name: Release Health Check

on:
  schedule:
    # Run daily
    - cron: '0 8 * * *'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Verify Registry listing
        run: |
          # Check that the provider is accessible on the registry
          RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://registry.terraform.io/v1/providers/example/example/versions")
          if [ "$RESPONSE" != "200" ]; then
            echo "Registry returned status $RESPONSE"
            exit 1
          fi

      - name: Verify download works
        run: |
          # Test that terraform init can download the provider
          mkdir test-dir && cd test-dir
          cat > main.tf << 'EOF'
          terraform {
            required_providers {
              example = {
                source = "example/example"
              }
            }
          }
          EOF
          terraform init
```

## Best Practices

**Run unit tests on every PR.** They are fast and catch most regressions.

**Run acceptance tests selectively.** Use labels or branch rules to trigger acceptance tests, since they are slow and use real resources.

**Automate everything.** Manual release steps are error-prone. Automate building, signing, and publishing.

**Use branch protection.** Require passing tests before merging to main.

**Pin action versions.** Use specific commit SHAs for GitHub Actions to prevent supply chain attacks.

**Monitor after release.** Verify that the Registry picked up your release and that downloads work.

**Keep the pipeline fast.** Cache Go modules and build artifacts to speed up CI runs.

## Conclusion

A well-designed CI/CD pipeline gives you confidence that every release is tested, signed, and published correctly. By automating testing, building, and releasing with GitHub Actions and GoReleaser, you can focus on building great provider features instead of worrying about the release process.

For more on the release process, see our guides on [publishing to the Terraform Registry](https://oneuptime.com/blog/post/2026-02-23-how-to-publish-custom-terraform-providers-to-registry/view) and [signing custom providers](https://oneuptime.com/blog/post/2026-02-23-how-to-sign-custom-terraform-providers/view).
