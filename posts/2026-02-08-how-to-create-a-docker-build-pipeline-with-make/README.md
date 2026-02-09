# How to Create a Docker Build Pipeline with Make

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Make, CI/CD, Build Pipeline, DevOps, Automation, Makefile

Description: Use GNU Make to create a complete Docker build pipeline with build, test, push, and deploy targets that work locally and in CI.

---

Every Docker project reaches a point where the build process outgrows simple `docker build` commands. You need to run tests before building, tag images with git commit hashes, push to multiple registries, run security scans, and deploy to staging. Developers start writing shell scripts, then the scripts grow complex and fragile.

GNU Make is a better tool for this job. It has been managing build dependencies since 1976, and it solves the exact problems that Docker build pipelines face: defining tasks, managing dependencies between tasks, and running only what has changed. Make is installed on virtually every Linux and macOS system, requires no additional dependencies, and has a straightforward syntax.

## Why Make for Docker

Make gives you several advantages over shell scripts and ad-hoc commands. First, dependency tracking. If the test target depends on the build target, Make runs build before test automatically. Second, phony targets let you name common operations and run them with `make test` or `make deploy`. Third, variables and conditional logic handle different environments cleanly. Fourth, parallel execution with `make -j` runs independent targets simultaneously.

## Project Structure

Here is a typical project layout with a Makefile managing the Docker pipeline.

```
my-project/
  Dockerfile
  Dockerfile.test
  docker-compose.yml
  Makefile
  src/
  tests/
```

## The Makefile

Here is a complete Makefile for a Docker build pipeline. Each section is explained with comments.

```makefile
# Makefile - Docker build pipeline
# Usage: make [target]
# Run 'make help' to see all available targets

# ============================================================
# Configuration Variables
# ============================================================

# Image name and registry
REGISTRY ?= ghcr.io
REPO ?= myorg/myapp
IMAGE := $(REGISTRY)/$(REPO)

# Version tagging - use git commit hash and branch name
GIT_SHA := $(shell git rev-parse --short HEAD)
GIT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD | sed 's/\//-/g')
BUILD_DATE := $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
VERSION ?= $(GIT_SHA)

# Docker build settings
DOCKER_BUILD_ARGS := \
	--build-arg BUILD_DATE=$(BUILD_DATE) \
	--build-arg VERSION=$(VERSION) \
	--build-arg GIT_SHA=$(GIT_SHA)

DOCKER_BUILDKIT := 1
export DOCKER_BUILDKIT

# Platform settings for multi-arch builds
PLATFORMS ?= linux/amd64,linux/arm64

# Test settings
TEST_IMAGE := $(IMAGE):test-$(GIT_SHA)
COVERAGE_DIR := ./coverage

# ============================================================
# Help Target
# ============================================================

.PHONY: help
help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ============================================================
# Build Targets
# ============================================================

.PHONY: build
build: ## Build the Docker image for local architecture
	docker build \
		$(DOCKER_BUILD_ARGS) \
		-t $(IMAGE):$(VERSION) \
		-t $(IMAGE):$(GIT_BRANCH) \
		-t $(IMAGE):latest \
		.
	@echo "Built $(IMAGE):$(VERSION)"

.PHONY: build-multi
build-multi: ## Build multi-architecture images and push to registry
	docker buildx build \
		$(DOCKER_BUILD_ARGS) \
		--platform $(PLATFORMS) \
		-t $(IMAGE):$(VERSION) \
		-t $(IMAGE):$(GIT_BRANCH) \
		--push \
		.
	@echo "Built and pushed multi-arch $(IMAGE):$(VERSION)"

.PHONY: build-no-cache
build-no-cache: ## Build without Docker layer cache
	docker build \
		--no-cache \
		$(DOCKER_BUILD_ARGS) \
		-t $(IMAGE):$(VERSION) \
		.

# ============================================================
# Test Targets
# ============================================================

.PHONY: test
test: build-test ## Run the test suite in a container
	docker run --rm \
		-v $(COVERAGE_DIR):/app/coverage \
		$(TEST_IMAGE) \
		pytest tests/ -v --cov=src --cov-report=html:/app/coverage/html
	@echo "Tests passed. Coverage report at $(COVERAGE_DIR)/html/index.html"

.PHONY: build-test
build-test: ## Build the test image
	docker build \
		-f Dockerfile.test \
		$(DOCKER_BUILD_ARGS) \
		-t $(TEST_IMAGE) \
		.

.PHONY: test-unit
test-unit: build-test ## Run only unit tests
	docker run --rm $(TEST_IMAGE) pytest tests/unit/ -v

.PHONY: test-integration
test-integration: build-test ## Run integration tests with docker-compose
	docker compose -f docker-compose.test.yml up -d
	docker compose -f docker-compose.test.yml run --rm test pytest tests/integration/ -v
	docker compose -f docker-compose.test.yml down -v

# ============================================================
# Lint and Security Targets
# ============================================================

.PHONY: lint
lint: ## Run linters on the source code
	docker run --rm -v $(PWD):/app -w /app \
		golangci/golangci-lint:latest golangci-lint run

.PHONY: lint-dockerfile
lint-dockerfile: ## Lint the Dockerfile with hadolint
	docker run --rm -i hadolint/hadolint < Dockerfile

.PHONY: scan
scan: build ## Scan the image for vulnerabilities with Trivy
	docker run --rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy:latest image \
		--severity HIGH,CRITICAL \
		--exit-code 1 \
		$(IMAGE):$(VERSION)

.PHONY: scan-config
scan-config: ## Scan Dockerfile and compose files for misconfigurations
	docker run --rm \
		-v $(PWD):/src \
		aquasec/trivy:latest config /src

# ============================================================
# Push Targets
# ============================================================

.PHONY: push
push: build ## Push the image to the registry
	docker push $(IMAGE):$(VERSION)
	docker push $(IMAGE):$(GIT_BRANCH)
	@echo "Pushed $(IMAGE):$(VERSION)"

.PHONY: push-latest
push-latest: build ## Push with the latest tag
	docker push $(IMAGE):latest

.PHONY: login
login: ## Log in to the container registry
	@echo "$(REGISTRY_PASSWORD)" | docker login $(REGISTRY) -u $(REGISTRY_USER) --password-stdin

# ============================================================
# Deploy Targets
# ============================================================

.PHONY: deploy-staging
deploy-staging: test scan push ## Deploy to staging (runs tests and scan first)
	@echo "Deploying $(IMAGE):$(VERSION) to staging..."
	docker compose -f docker-compose.staging.yml pull
	docker compose -f docker-compose.staging.yml up -d
	@echo "Deployed to staging"

.PHONY: deploy-production
deploy-production: ## Deploy to production (requires VERSION to be set explicitly)
	@if [ "$(VERSION)" = "$(GIT_SHA)" ]; then \
		echo "ERROR: Set VERSION explicitly for production deploys (e.g., make deploy-production VERSION=v1.2.3)"; \
		exit 1; \
	fi
	@echo "Deploying $(IMAGE):$(VERSION) to production..."
	docker compose -f docker-compose.production.yml pull
	docker compose -f docker-compose.production.yml up -d
	@echo "Deployed $(VERSION) to production"

# ============================================================
# Utility Targets
# ============================================================

.PHONY: shell
shell: build ## Open a shell in the built image
	docker run --rm -it $(IMAGE):$(VERSION) /bin/sh

.PHONY: logs
logs: ## Show logs from running containers
	docker compose logs -f

.PHONY: clean
clean: ## Remove built images and test artifacts
	docker rmi $(IMAGE):$(VERSION) 2>/dev/null || true
	docker rmi $(IMAGE):$(GIT_BRANCH) 2>/dev/null || true
	docker rmi $(IMAGE):latest 2>/dev/null || true
	docker rmi $(TEST_IMAGE) 2>/dev/null || true
	rm -rf $(COVERAGE_DIR)
	@echo "Cleaned up"

.PHONY: clean-all
clean-all: clean ## Remove all project images and prune dangling images
	docker images $(IMAGE) -q | xargs -r docker rmi -f
	docker image prune -f
	@echo "Deep cleaned"

.PHONY: info
info: ## Show build information
	@echo "Registry:  $(REGISTRY)"
	@echo "Image:     $(IMAGE)"
	@echo "Version:   $(VERSION)"
	@echo "Git SHA:   $(GIT_SHA)"
	@echo "Branch:    $(GIT_BRANCH)"
	@echo "Date:      $(BUILD_DATE)"
	@echo "Platforms: $(PLATFORMS)"
```

## Using the Makefile

Common workflows with this Makefile.

```bash
# See all available targets with descriptions
make help

# Build the image
make build

# Run all tests
make test

# Run linting and security scanning
make lint
make scan

# Full CI pipeline: test, scan, and push
make push

# Deploy to staging (automatically runs tests and scans first)
make deploy-staging

# Deploy a specific version to production
make deploy-production VERSION=v1.2.3

# Quick iteration: build and open a shell
make shell

# Show current build info
make info

# Clean up everything
make clean-all
```

## The Test Dockerfile

Create a separate Dockerfile for the test environment.

```dockerfile
# Dockerfile.test - Test environment
FROM python:3.12-slim

WORKDIR /app

# Install test dependencies
COPY requirements.txt requirements-test.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-test.txt

# Copy source and test code
COPY src/ ./src/
COPY tests/ ./tests/

# Default command runs the test suite
CMD ["pytest", "tests/", "-v"]
```

## CI Integration

The Makefile works identically in CI. Here is a GitHub Actions workflow that uses it.

```yaml
# .github/workflows/ci.yml - CI pipeline using Make
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to registry
        if: github.event_name != 'pull_request'
        run: make login
        env:
          REGISTRY_USER: ${{ github.actor }}
          REGISTRY_PASSWORD: ${{ secrets.GITHUB_TOKEN }}

      - name: Lint Dockerfile
        run: make lint-dockerfile

      - name: Run tests
        run: make test

      - name: Security scan
        run: make scan

      - name: Push image
        if: github.ref == 'refs/heads/main'
        run: make push
```

## Advanced Makefile Patterns

Add these patterns for more sophisticated pipelines.

```makefile
# Run tests in parallel
.PHONY: test-parallel
test-parallel: build-test
	$(MAKE) -j2 test-unit test-integration

# Conditional logic based on branch
.PHONY: ci
ci: test scan ## Full CI pipeline
ifeq ($(GIT_BRANCH),main)
	$(MAKE) push push-latest
	$(MAKE) deploy-staging
else
	@echo "Branch $(GIT_BRANCH) - skipping push and deploy"
endif

# Wait for a service to be healthy
.PHONY: wait-healthy
wait-healthy:
	@echo "Waiting for service to be healthy..."
	@for i in $$(seq 1 30); do \
		curl -sf http://localhost:8080/health > /dev/null 2>&1 && break; \
		echo "Attempt $$i/30..."; \
		sleep 2; \
	done
```

## Cleanup

```bash
make clean-all
```

## Conclusion

GNU Make provides a battle-tested, dependency-aware framework for Docker build pipelines. The Makefile in this guide handles building, testing, scanning, pushing, and deploying, all with proper dependency ordering and clear target names. It works identically on developer laptops and in CI systems with no additional tools required. For monitoring the applications you deploy through these pipelines, [OneUptime](https://oneuptime.com) provides uptime monitoring, alerting, and incident management to ensure your deployments stay healthy in production.
