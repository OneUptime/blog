# How to Create Makefiles for OpenTofu Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Makefile, Automation, DevOps, CLI, Infrastructure as Code

Description: Learn how to create Makefiles that simplify OpenTofu workflows by providing short, memorable commands for common infrastructure operations.

## Introduction

Makefiles provide a simple, universal interface for complex command sequences. They allow team members to run `make plan` instead of memorizing long `tofu` command arguments with variable files and backend configs. This guide shows how to write effective Makefiles for OpenTofu projects.

## Basic Makefile

```makefile
# Makefile

# OpenTofu project automation

# ─── Variables ────────────────────────────────────────────────────────────────
ENVIRONMENT ?= dev
REGION      ?= us-east-1
PLAN_FILE   := $(ENVIRONMENT).tfplan
VARS_FILE   := environments/$(ENVIRONMENT).tfvars

# Shell configuration
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

# Default target
.DEFAULT_GOAL := help

# ─── Help ─────────────────────────────────────────────────────────────────────
.PHONY: help
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' | sort

# ─── Setup ────────────────────────────────────────────────────────────────────
.PHONY: init
init: ## Initialize OpenTofu with environment-specific S3 backend settings
	tofu init \
	  -backend-config="bucket=my-state-$(ENVIRONMENT)" \
	  -backend-config="key=$(ENVIRONMENT)/terraform.tfstate" \
	  -backend-config="region=$(REGION)" \
	  -upgrade

.PHONY: init-reconfigure
init-reconfigure: ## Re-initialize and reconfigure S3 backend settings
	tofu init -reconfigure \
	  -backend-config="bucket=my-state-$(ENVIRONMENT)" \
	  -backend-config="key=$(ENVIRONMENT)/terraform.tfstate" \
	  -backend-config="region=$(REGION)"

# ─── Core Workflow ────────────────────────────────────────────────────────────
.PHONY: validate
validate: ## Validate configuration syntax and internal consistency
	tofu validate

.PHONY: fmt
fmt: ## Format all .tf and .tofu files
	tofu fmt -recursive

.PHONY: fmt-check
fmt-check: ## Check formatting without making changes (for CI)
	tofu fmt -recursive -check -diff

.PHONY: plan
plan: validate ## Run OpenTofu plan and save to file
	tofu plan \
	  -var-file=$(VARS_FILE) \
	  -out=$(PLAN_FILE)

.PHONY: apply
apply: ## Apply the saved plan
	@test -f $(PLAN_FILE) || (echo "Run 'make plan' first"; exit 1)
	tofu apply $(PLAN_FILE)
	@rm -f $(PLAN_FILE)

.PHONY: apply-auto
apply-auto: validate ## Plan and apply without a saved plan (non-prod only)
	@[ "$(ENVIRONMENT)" != "prod" ] || (echo "Cannot auto-apply to prod"; exit 1)
	tofu apply -var-file=$(VARS_FILE) -auto-approve

.PHONY: destroy
destroy: ## Destroy all resources (with confirmation)
	@read -p "Destroy $(ENVIRONMENT)? Type 'yes' to confirm: " confirm; \
	  [ "$$confirm" = "yes" ] || exit 1
	tofu destroy -var-file=$(VARS_FILE)

# ─── State ────────────────────────────────────────────────────────────────────
.PHONY: state-list
state-list: ## List all resources in state
	tofu state list

.PHONY: output
output: ## Show all outputs
	tofu output -json | jq .

# ─── Tools ────────────────────────────────────────────────────────────────────
.PHONY: lint
lint: ## Run tflint on all configurations
	tflint --recursive

.PHONY: security-scan
security-scan: ## Run tfsec security scan
	tfsec .

.PHONY: docs
docs: ## Generate terraform-docs documentation
	terraform-docs markdown table --output-file README-terraform.md .

.PHONY: clean
clean: ## Remove local plan files and .terraform directories
	find . -name "*.tfplan" -delete
	find . -name ".terraform" -type d -exec rm -rf {} + 2>/dev/null || true
```

## Running Makefile Targets

```bash
# Initialize for staging
make init ENVIRONMENT=staging

# Plan and apply
make plan ENVIRONMENT=staging
make apply ENVIRONMENT=staging

# One-liner for non-prod auto-apply
make apply-auto ENVIRONMENT=dev

# List all available targets
make help
```

## CI/CD Integration

```yaml
# .github/workflows/opentofu.yml
- name: OpenTofu Plan
  run: make plan ENVIRONMENT=staging
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

- name: OpenTofu Apply
  run: make apply ENVIRONMENT=staging
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Summary

Makefiles provide a discoverable, self-documenting interface for OpenTofu operations. With `make help` showing all available targets, new team members can immediately understand available operations. The Makefile enforces consistent arguments and prevents common mistakes like applying to prod without a plan file.
