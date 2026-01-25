# How to Set Up Go CI Pipeline with GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Go, Golang, CI/CD, Testing, DevOps

Description: Learn how to build a comprehensive Go CI pipeline with GitHub Actions. This guide covers testing, linting, code coverage, cross-compilation, and release automation.

---

Go projects benefit from fast, reproducible CI pipelines. GitHub Actions provides excellent Go support with built-in caching, matrix testing across versions, and easy cross-compilation. This guide shows you how to build a production-ready pipeline.

## Pipeline Architecture

```mermaid
flowchart LR
    A[Push/PR] --> B[Setup Go]
    B --> C[Lint with golangci-lint]
    C --> D[Run Tests]
    D --> E[Check Coverage]
    E --> F[Build Binaries]
    F --> G[Release]
```

## Basic Go CI Workflow

Create `.github/workflows/go-ci.yml`:

```yaml
name: Go CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Build
        run: go build -v ./...

      - name: Test
        run: go test -v ./...
```

## Module Caching

Go modules are cached automatically by setup-go:

```yaml
- uses: actions/setup-go@v5
  with:
    go-version: '1.22'
    cache: true
    cache-dependency-path: go.sum
```

For monorepos with multiple modules:

```yaml
- uses: actions/setup-go@v5
  with:
    go-version: '1.22'
    cache: true
    cache-dependency-path: |
      **/go.sum
      go.work.sum
```

## Linting with golangci-lint

Add comprehensive linting:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: golangci-lint
        uses: golangci/golangci-lint-action@v4
        with:
          version: latest
          args: --timeout=5m
```

Configure `.golangci.yml`:

```yaml
linters:
  enable:
    - errcheck
    - govet
    - staticcheck
    - unused
    - gosimple
    - ineffassign
    - typecheck
    - gofmt
    - goimports
    - misspell
    - unconvert
    - gocritic
    - revive

linters-settings:
  errcheck:
    check-type-assertions: true
  govet:
    check-shadowing: true
  revive:
    severity: warning
    rules:
      - name: exported
        severity: warning

issues:
  exclude-rules:
    - path: _test\.go
      linters:
        - errcheck
```

## Testing with Coverage

Add coverage reporting:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Run tests with coverage
        run: |
          go test -v -race -coverprofile=coverage.out -covermode=atomic ./...

      - name: Check coverage threshold
        run: |
          COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')
          echo "Coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage is below 80%"
            exit 1
          fi

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: coverage.out
          token: ${{ secrets.CODECOV_TOKEN }}
```

## Matrix Testing

Test across multiple Go versions:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        go-version: ['1.21', '1.22']
        os: [ubuntu-latest, macos-latest, windows-latest]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: ${{ matrix.go-version }}

      - name: Test
        run: go test -race ./...
```

## Integration Testing with Services

Test with databases and other services:

```yaml
jobs:
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Run integration tests
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb?sslmode=disable
          REDIS_URL: redis://localhost:6379
        run: go test -v -tags=integration ./...
```

## Cross-Compilation

Build for multiple platforms:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - goos: linux
            goarch: amd64
          - goos: linux
            goarch: arm64
          - goos: darwin
            goarch: amd64
          - goos: darwin
            goarch: arm64
          - goos: windows
            goarch: amd64

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Build
        env:
          GOOS: ${{ matrix.goos }}
          GOARCH: ${{ matrix.goarch }}
        run: |
          OUTPUT_NAME=myapp-${{ matrix.goos }}-${{ matrix.goarch }}
          if [ "${{ matrix.goos }}" = "windows" ]; then
            OUTPUT_NAME="${OUTPUT_NAME}.exe"
          fi
          go build -ldflags="-s -w" -o $OUTPUT_NAME ./cmd/myapp

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: myapp-${{ matrix.goos }}-${{ matrix.goarch }}
          path: myapp-*
```

## Release with GoReleaser

Automate releases with GoReleaser:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Run GoReleaser
        uses: goreleaser/goreleaser-action@v5
        with:
          version: latest
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Configure `.goreleaser.yaml`:

```yaml
version: 1

builds:
  - main: ./cmd/myapp
    binary: myapp
    env:
      - CGO_ENABLED=0
    goos:
      - linux
      - darwin
      - windows
    goarch:
      - amd64
      - arm64
    ldflags:
      - -s -w
      - -X main.version={{.Version}}
      - -X main.commit={{.Commit}}

archives:
  - format: tar.gz
    name_template: "{{ .ProjectName }}_{{ .Version }}_{{ .Os }}_{{ .Arch }}"
    format_overrides:
      - goos: windows
        format: zip

checksum:
  name_template: 'checksums.txt'

changelog:
  sort: asc
  filters:
    exclude:
      - '^docs:'
      - '^test:'
      - '^chore:'

release:
  github:
    owner: your-org
    name: your-repo
```

## Security Scanning

Add vulnerability scanning:

```yaml
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Run govulncheck
        run: |
          go install golang.org/x/vuln/cmd/govulncheck@latest
          govulncheck ./...

      - name: Run gosec
        uses: securego/gosec@master
        with:
          args: ./...
```

## Complete Production Pipeline

```yaml
name: Go CI

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  GO_VERSION: '1.22'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - uses: golangci/golangci-lint-action@v4
        with:
          version: latest

  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: Run tests
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb?sslmode=disable
        run: |
          go test -v -race -coverprofile=coverage.out ./...

      - uses: codecov/codecov-action@v4
        with:
          files: coverage.out

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: Vulnerability check
        run: |
          go install golang.org/x/vuln/cmd/govulncheck@latest
          govulncheck ./...

  build:
    runs-on: ubuntu-latest
    needs: [test, security]
    strategy:
      matrix:
        include:
          - goos: linux
            goarch: amd64
          - goos: linux
            goarch: arm64
          - goos: darwin
            goarch: arm64
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: Build
        env:
          GOOS: ${{ matrix.goos }}
          GOARCH: ${{ matrix.goarch }}
          CGO_ENABLED: 0
        run: |
          go build -ldflags="-s -w" -o myapp-${{ matrix.goos }}-${{ matrix.goarch }} ./cmd/myapp

      - uses: actions/upload-artifact@v4
        with:
          name: myapp-${{ matrix.goos }}-${{ matrix.goarch }}
          path: myapp-*

  release:
    if: startsWith(github.ref, 'refs/tags/')
    runs-on: ubuntu-latest
    needs: build
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - uses: goreleaser/goreleaser-action@v5
        with:
          version: latest
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

A comprehensive Go CI pipeline catches bugs early and automates releases. Start with linting and testing, add coverage thresholds, then automate cross-platform releases with GoReleaser. The fast compilation and built-in tooling make Go projects particularly well-suited for efficient CI pipelines.
