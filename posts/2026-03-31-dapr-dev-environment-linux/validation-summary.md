# Validation Summary: How to Set Up Dapr Development Environment on Linux

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Dapr (CLI, runtime, SDKs)
- Docker / Docker Engine
- Linux (Ubuntu/Debian, Fedora/RHEL)
- Python (Dapr Python SDK)
- Node.js (Dapr JS SDK)
- Go (Dapr Go SDK)
- systemd

## Sources Consulted
- Dapr CLI GitHub repository (dapr/cli) — confirmed `master` branch and install script URL
- Dapr Python SDK API — verified `DaprClient`, `save_state`, `get_state`, and `StateResponse.data` usage
- Dapr official documentation for `dapr init` behavior (containers pulled: dapr runtime, Redis, Zipkin)
- Dapr HTTP API reference — verified `/v1.0/metadata` and `/v1.0/healthz` endpoints on default port 3500
- Docker official documentation for Fedora installation (https://docs.docker.com/engine/install/fedora/)
- PEP 668 — externally managed Python environments on modern Ubuntu (23.04+)
- Go modules documentation — `go get` requires module context since Go 1.17+

## Issues Found

### 1. Fedora Docker installation command was incorrect
- **What was wrong:** `sudo dnf install -y docker` does not install Docker Engine on Fedora. The `docker` package in Fedora repos is either absent or a podman-docker compatibility shim, which does not work with `dapr init`.
- **What was changed:** Replaced with the official Docker CE installation steps: adding Docker's repository via `dnf config-manager` and installing `docker-ce`, `docker-ce-cli`, and `containerd.io`.
- **Why:** Dapr requires actual Docker Engine for `dapr init` to work in self-hosted mode.

### 2. Python pip install fails on modern Ubuntu without a virtual environment
- **What was wrong:** `pip3 install dapr flask` run outside a virtual environment fails on Ubuntu 23.04+ due to PEP 668 (externally managed environments), producing an "externally-managed-environment" error.
- **What was changed:** Added `python3-venv` to the apt install, and wrapped the pip install in a virtual environment (`python3 -m venv dapr-env && source dapr-env/bin/activate`).
- **Why:** Modern Ubuntu enforces PEP 668 which prevents system-wide pip installs to avoid conflicts with apt-managed Python packages.

### 3. Go SDK install fails without a Go module context
- **What was wrong:** `go get github.com/dapr/go-sdk/client` run outside of a Go module fails with "go.mod file not found in current directory or any parent directory."
- **What was changed:** Added `mkdir myapp && cd myapp && go mod init myapp` before the `go get` command to create a proper Go module context.
- **Why:** Since Go 1.17+, `go get` only works within a Go module. Libraries are added as project dependencies, not installed globally.

## Review Notes
- The NodeSource installation script (`setup_20.x`) for Node.js is a legacy method that NodeSource has been migrating away from. It may still work but could break in the future. A future update could switch to the newer NodeSource installation method or use `nvm`.
- The `dapr run` commands work without a `--` separator between Dapr flags and the app command, but the official Dapr docs now recommend using `--` for clarity (e.g., `dapr run --app-id python-demo -- python3 app.py`).
- The systemd service example is fine for development but would not be the recommended approach for production (Kubernetes with Dapr sidecar injection is the production pattern).
- The Python sample's `print(f"Value: {result.data}")` will print `Value: b'world'` (bytes representation) since `StateResponse.data` returns `bytes`. This is technically correct but could surprise readers expecting plain string output.
