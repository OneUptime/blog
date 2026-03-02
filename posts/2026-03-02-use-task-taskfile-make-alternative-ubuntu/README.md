# How to Use Task (Taskfile) as a Make Alternative on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Task, Taskfile, Build Automation, Development

Description: Install and use Task (Taskfile) on Ubuntu as a modern Make alternative with YAML syntax, dependency management, and cross-platform task automation.

---

Task is a task runner written in Go that uses YAML for task definitions instead of Makefile syntax. It addresses several frustrations with Make: no TAB indentation requirements, clear variable syntax, built-in cross-platform support, and readable YAML that is familiar to anyone who has worked with CI/CD configuration files. Task is a solid choice for projects that need build automation without the complexity of Make's macro language.

## Why Task Instead of Make

- YAML configuration is familiar and clearly structured
- No TAB vs spaces issues
- Variables use Go template syntax (`{{.VAR}}`) which is explicit
- Built-in support for running tasks in parallel
- Works identically on Linux, macOS, and Windows (Go binary)
- Task dependencies are easier to express
- Better error messages

## Installing Task on Ubuntu

### Using the Official Install Script

```bash
# Download and run the install script (installs to /usr/local/bin by default)
sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin

# Verify installation
task --version
```

### Using snap

```bash
sudo snap install task --classic
```

### Manual Installation

```bash
# Find the latest version at: https://github.com/go-task/task/releases/latest
TASK_VERSION="3.35.1"

wget "https://github.com/go-task/task/releases/download/v${TASK_VERSION}/task_linux_amd64.tar.gz"
tar -xzf task_linux_amd64.tar.gz

sudo mv task /usr/local/bin/
sudo chmod +x /usr/local/bin/task

task --version
```

## Creating Your First Taskfile

Create a file named `Taskfile.yml` or `Taskfile.yaml` in your project root:

```yaml
# Taskfile.yml - project task definitions
version: '3'

# Global variables
vars:
  APP_NAME: myapp
  BUILD_DIR: build
  GO_VERSION: '1.21'

# Task definitions
tasks:
  # Default task (runs when you type 'task' without arguments)
  default:
    cmds:
      - task: build
      - task: test

  # Build the application
  build:
    desc: Build the application binary
    cmds:
      - echo "Building {{.APP_NAME}}..."
      - mkdir -p {{.BUILD_DIR}}
      - go build -o {{.BUILD_DIR}}/{{.APP_NAME}} ./cmd/...
    sources:
      - "**/*.go"
    generates:
      - "{{.BUILD_DIR}}/{{.APP_NAME}}"

  # Run tests
  test:
    desc: Run all tests
    cmds:
      - go test ./... -v

  # Clean build artifacts
  clean:
    desc: Remove build artifacts
    cmds:
      - rm -rf {{.BUILD_DIR}}
      - echo "Cleaned."

  # Run the application
  run:
    desc: Run the application
    deps: [build]    # Build first, then run
    cmds:
      - ./{{.BUILD_DIR}}/{{.APP_NAME}}
```

Run tasks:

```bash
# Run the default task
task

# Run a specific task
task build
task test
task clean

# List all available tasks with descriptions
task --list
task -l
```

## Variables and Environment

```yaml
version: '3'

vars:
  # Static variable
  APP_NAME: myapp

  # Dynamic variable (command output)
  GIT_TAG:
    sh: git describe --tags --always --dirty 2>/dev/null || echo "dev"

  # Conditional variable with default
  PORT: '{{.PORT | default "8080"}}'

env:
  # Environment variables available to all tasks
  GO111MODULE: "on"
  CGO_ENABLED: "0"

tasks:
  build:
    desc: Build with version info
    vars:
      # Task-local variable
      BUILD_TIME:
        sh: date -u +%Y-%m-%dT%H:%M:%SZ
    cmds:
      - echo "Building version {{.GIT_TAG}} at {{.BUILD_TIME}}"
      - go build -ldflags "-X main.version={{.GIT_TAG}}" -o app ./...

  server:
    desc: Start the server
    env:
      # Task-specific environment variable
      DEBUG: "true"
    cmds:
      - ./app --port {{.PORT}}
```

## Task Dependencies

```yaml
version: '3'

tasks:
  # tasks listed in 'deps' run before the current task
  deploy:
    desc: Build and deploy the application
    deps: [build, test]    # Both run before deploy
    cmds:
      - echo "Deploying..."
      - rsync -av build/ user@prod:/app/

  # Dependencies can also be written as a list of objects
  docker-push:
    desc: Build Docker image and push
    deps:
      - task: docker-build
      - task: lint
    cmds:
      - docker push myapp:latest

  docker-build:
    cmds:
      - docker build -t myapp:latest .

  lint:
    cmds:
      - golangci-lint run
```

## Running Tasks in Parallel

```yaml
version: '3'

tasks:
  # Run lint and test in parallel, then build
  ci:
    desc: Run CI pipeline
    deps:
      - task: lint
      - task: test    # lint and test run simultaneously
    cmds:
      - task: build

  # Run multiple commands in parallel within a single task
  parallel-commands:
    desc: Run commands in parallel
    cmds:
      - parallel: true
      - npm run build:frontend
      - go build ./...
      - docker-compose build
```

## A Full Python Project Taskfile

```yaml
# Taskfile.yml for a Python project
version: '3'

vars:
  PYTHON: python3
  VENV: .venv
  VENV_BIN: "{{.VENV}}/bin"
  SRC: src
  TESTS: tests

tasks:
  default:
    deps: [install-dev, lint, test]

  # Set up virtual environment
  venv:
    desc: Create Python virtual environment
    cmds:
      - "{{.PYTHON}} -m venv {{.VENV}}"
      - "{{.VENV_BIN}}/pip install --upgrade pip"
    status:
      # Only run if .venv does not exist
      - test -d {{.VENV}}

  # Install dependencies
  install:
    desc: Install production dependencies
    deps: [venv]
    cmds:
      - "{{.VENV_BIN}}/pip install -r requirements.txt"

  install-dev:
    desc: Install development dependencies
    deps: [venv]
    cmds:
      - "{{.VENV_BIN}}/pip install -r requirements-dev.txt"
      - "{{.VENV_BIN}}/pre-commit install"

  # Run tests
  test:
    desc: Run test suite
    deps: [install-dev]
    cmds:
      - "{{.VENV_BIN}}/pytest {{.TESTS}}/ -v --tb=short"

  # Coverage report
  coverage:
    desc: Run tests with coverage
    deps: [install-dev]
    cmds:
      - "{{.VENV_BIN}}/pytest {{.TESTS}}/ --cov={{.SRC}} --cov-report=html"
      - echo "Report at htmlcov/index.html"

  # Lint and format
  lint:
    desc: Run linters
    deps: [install-dev]
    cmds:
      - "{{.VENV_BIN}}/flake8 {{.SRC}}/ {{.TESTS}}/"
      - "{{.VENV_BIN}}/mypy {{.SRC}}/"

  format:
    desc: Format code with black and isort
    deps: [install-dev]
    cmds:
      - "{{.VENV_BIN}}/black {{.SRC}}/ {{.TESTS}}/"
      - "{{.VENV_BIN}}/isort {{.SRC}}/ {{.TESTS}}/"

  # Clean up
  clean:
    desc: Remove generated files
    cmds:
      - find . -type f -name "*.pyc" -delete
      - find . -type d -name "__pycache__" -exec rm -rf {} +
      - rm -rf .pytest_cache/ htmlcov/ dist/ *.egg-info

  clean-venv:
    desc: Remove virtual environment
    deps: [clean]
    cmds:
      - rm -rf {{.VENV}}
```

## Using the `status` Clause to Skip Tasks

```yaml
version: '3'

tasks:
  download-deps:
    desc: Download vendor dependencies
    cmds:
      - go mod download
    # Only run if go.sum has changed since last download
    sources:
      - go.mod
      - go.sum
    generates:
      - vendor/**/*

  generate-proto:
    desc: Generate protobuf code
    cmds:
      - protoc --go_out=. proto/*.proto
    # Skip if generated files are newer than source
    sources:
      - proto/*.proto
    generates:
      - "*.pb.go"

  check-tools:
    desc: Verify required tools are installed
    cmds:
      - which docker
      - which kubectl
      - which helm
    # Status check: skip if all commands succeed
    status:
      - which docker
      - which kubectl
      - which helm
```

## Taskfile Includes

Split large Taskfiles into modules:

```yaml
# Taskfile.yml
version: '3'

includes:
  build: ./taskfiles/Build.yml
  deploy: ./taskfiles/Deploy.yml
  test: ./taskfiles/Test.yml
```

```yaml
# taskfiles/Build.yml
version: '3'

tasks:
  docker:
    cmds:
      - docker build -t app:latest .

  binary:
    cmds:
      - go build -o bin/app ./...
```

Run with namespace:

```bash
task build:docker
task build:binary
task deploy:production
```

## Shell Completion

```bash
# Add bash completion
task --completion bash >> ~/.bashrc
source ~/.bashrc

# Add zsh completion
task --completion zsh >> ~/.zshrc
source ~/.zshrc
```

## Comparing Task and Make

| Feature | Make | Task |
|---|---|---|
| Syntax | Custom + TAB required | YAML |
| Variables | Macro-based | Go templates |
| Cross-platform | Limited | Full (Go binary) |
| Parallel tasks | `-j` flag | `parallel: true` or `deps` |
| Conditional run | Timestamp-based | `status` or `sources` |
| Shell | sh | Any configured shell |
| Installation | Usually pre-installed | Single binary download |

Task handles the most common build automation needs with cleaner syntax than Make. For pure C/C++ compilation where Make's pattern rules and auto-dependency tracking shine, Make still has advantages. For everything else - deployment scripts, test runners, multi-language projects - Task's readability wins.
