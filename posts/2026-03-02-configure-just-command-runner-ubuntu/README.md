# How to Configure just Command Runner on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Just, Command Runner, Automation, Development

Description: Install and configure the just command runner on Ubuntu, write justfiles for project automation, and use just's powerful recipes, variables, and settings.

---

`just` is a command runner written in Rust that uses a Makefile-inspired syntax called a `justfile`. It is designed specifically as a command runner (not a build system), so it does not track file timestamps or generate build artifacts - it simply runs commands. This focus makes `just` simpler and more predictable than Make for task automation. Its error messages are clear, its recipes support parameters directly, and its documentation is excellent.

## Installing just

### From the Official Binary

```bash
# Install via the install script (recommended)
curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin

# Verify installation
just --version
```

### From cargo (Rust package manager)

```bash
# Install Rust if needed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install just via cargo
cargo install just

# Add ~/.cargo/bin to PATH if needed
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### From Ubuntu Snap

```bash
sudo snap install just --classic
```

### From Prebuilt Binaries

```bash
# Download latest release
JUST_VERSION=$(curl -s https://api.github.com/repos/casey/just/releases/latest | grep tag_name | cut -d'"' -f4)

wget "https://github.com/casey/just/releases/download/${JUST_VERSION}/just-${JUST_VERSION}-x86_64-unknown-linux-musl.tar.gz"

tar -xzf just-*.tar.gz just
sudo mv just /usr/local/bin/
just --version
```

## Creating Your First justfile

Create a file named `justfile` (lowercase, no extension) in your project root:

```just
# justfile - project commands

# Default recipe (runs when you type 'just' alone)
default:
    just --list

# Build the project
build:
    echo "Building..."
    cargo build --release

# Run tests
test:
    cargo test

# Clean build artifacts
clean:
    cargo clean
    rm -rf dist/

# Run the application
run:
    cargo run

# Format code
fmt:
    cargo fmt
    echo "Formatted."

# Lint
lint:
    cargo clippy -- -D warnings
```

Run recipes:

```bash
# Show available recipes
just --list
just -l

# Run the default recipe
just

# Run a specific recipe
just build
just test
just clean

# Dry run - show commands without executing
just --dry-run build
```

## Recipe Parameters

`just` supports recipe parameters - a major advantage over Make:

```just
# Recipe with a required parameter
greet name:
    echo "Hello, {{name}}!"

# Recipe with a default value
server port="8080":
    echo "Starting server on port {{port}}"
    ./server --port {{port}}

# Recipe with multiple parameters
deploy env host:
    echo "Deploying to {{env}} at {{host}}"
    rsync -avz dist/ {{host}}:/var/www/

# Recipe with variadic arguments (captures remaining args)
run *args:
    cargo run -- {{args}}
```

Usage:

```bash
# Pass argument to recipe
just greet Alice
# Output: Hello, Alice!

# Use default value
just server
# Output: Starting server on port 8080

# Override default
just server 9090
# Output: Starting server on port 9090

# Multiple parameters
just deploy production app.example.com

# Variadic arguments
just run --flag1 --flag2 arg1 arg2
```

## Variables and Settings

```just
# justfile with variables

# Variable assignment
app_name := "myapp"
version := "1.0.0"
build_dir := "build"

# Dynamic variable (runs a shell command)
git_hash := `git rev-parse --short HEAD`
today := `date +%Y-%m-%d`

# Settings block controls justfile behavior
set shell := ["bash", "-uc"]    # Use bash with strict mode
set dotenv-load := true          # Load .env file automatically
set export := true               # Export all variables to recipes

build:
    echo "Building {{app_name}} v{{version}} ({{git_hash}})"
    mkdir -p {{build_dir}}
    gcc -o {{build_dir}}/{{app_name}} src/main.c

release:
    echo "Release {{version}} on {{today}}"
    tar -czf {{app_name}}-{{version}}.tar.gz {{build_dir}}/
```

## Conditional Logic and OS Detection

```just
# Detect operating system
os := os()
arch := arch()

# OS-specific commands
open-browser url:
    #!/usr/bin/env bash
    if [[ "{{os()}}" == "linux" ]]; then
        xdg-open {{url}}
    elif [[ "{{os()}}" == "macos" ]]; then
        open {{url}}
    else
        echo "Unsupported OS"
    fi

# Use if expression for inline conditionals
python := if os() == "windows" { "python" } else { "python3" }

test:
    {{python}} -m pytest tests/
```

## Multi-line Recipes

```just
# Multi-line recipe using heredoc or line continuations
setup:
    #!/usr/bin/env bash
    set -euo pipefail

    echo "Setting up development environment..."

    # Install dependencies
    sudo apt-get update
    sudo apt-get install -y git curl wget

    # Clone submodules
    git submodule update --init --recursive

    echo "Setup complete!"

# Recipe with explicit shell shebang (overrides set shell)
python-setup:
    #!/usr/bin/env python3
    import os
    import sys

    print(f"Python version: {sys.version}")
    print(f"Working directory: {os.getcwd()}")
    os.makedirs("build", exist_ok=True)
    print("Build directory created")
```

## Recipe Dependencies

```just
# Recipe dependencies
install: download-deps generate-proto
    echo "All install steps complete"

download-deps:
    go mod download

generate-proto:
    protoc --go_out=. proto/*.proto

# Full CI pipeline with ordered dependencies
ci: lint test build
    echo "CI passed"

lint:
    golangci-lint run ./...

test:
    go test ./... -race

build:
    go build -o bin/app ./cmd/app
```

## A Comprehensive justfile for a Web Project

```just
# justfile for a Node.js/TypeScript web project

set dotenv-load := true

# Variables
node_bin := "./node_modules/.bin"
src_dir := "src"
dist_dir := "dist"
port := env_var_or_default("PORT", "3000")

# Default: show help
default:
    @just --list

# Install dependencies
install:
    npm ci

# Development server with hot reload
dev:
    {{node_bin}}/ts-node-dev --respawn --transpile-only {{src_dir}}/server.ts

# Build for production
build:
    rm -rf {{dist_dir}}
    {{node_bin}}/tsc --outDir {{dist_dir}}
    echo "Build complete: {{dist_dir}}/"

# Run production server
start: build
    node {{dist_dir}}/server.js

# Run tests
test:
    {{node_bin}}/jest --passWithNoTests

# Run tests in watch mode
test-watch:
    {{node_bin}}/jest --watch

# Lint TypeScript
lint:
    {{node_bin}}/eslint {{src_dir}}/ --ext .ts

# Format code
format:
    {{node_bin}}/prettier --write "{{src_dir}}/**/*.ts"

# Type check without emitting
typecheck:
    {{node_bin}}/tsc --noEmit

# Full CI check
ci: install lint typecheck test build
    echo "All CI checks passed"

# Docker operations
docker-build:
    docker build -t {{env_var("IMAGE_NAME")}} .

docker-run:
    docker run -p {{port}}:{{port}} \
        --env-file .env \
        {{env_var("IMAGE_NAME")}}

# Database operations
db-migrate:
    {{node_bin}}/knex migrate:latest

db-rollback:
    {{node_bin}}/knex migrate:rollback

db-seed:
    {{node_bin}}/knex seed:run

# Generate new migration
db-new-migration name:
    {{node_bin}}/knex migrate:make {{name}}

# Clean up
clean:
    rm -rf {{dist_dir}} node_modules .parcel-cache
```

## Shell Completion

```bash
# Generate bash completion
just --completions bash >> ~/.bashrc
source ~/.bashrc

# Generate zsh completion
just --completions zsh >> ~/.zshrc
source ~/.zshrc

# Generate fish completion
just --completions fish > ~/.config/fish/completions/just.fish
```

## Useful just Flags

```bash
# Show all recipes with their documentation
just --list

# Show the justfile that would be run
just --show

# Run recipe in dry-run mode
just --dry-run build

# Use a specific justfile
just --justfile /path/to/other/justfile recipe

# Evaluate a variable
just --evaluate git_hash

# Dump all variables
just --evaluate

# Show recipes that match a pattern
just --list | grep docker
```

## Organizing Large Projects with Modules

```bash
# justfile can import other justfiles (just 1.15+)
# In the main justfile:
```

```just
# Main justfile

# Import sub-justfiles (just 1.15+)
import 'justfiles/docker.just'
import 'justfiles/deploy.just'
import 'justfiles/db.just'

# Local recipes
default:
    @just --list
```

`just` is a pragmatic tool that removes the complexity of Make while keeping what makes Make useful. The parameterized recipes alone make it more ergonomic than Make for most automation tasks, and the `.env` file integration and cross-platform binary make it easy to share consistent workflows across a team.
