# How to Set Up Make/Makefile for Project Automation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Make, Makefile, Build Automation, Development

Description: Learn how to write effective Makefiles on Ubuntu for automating build processes, running tests, managing deployments, and simplifying complex multi-step workflows.

---

Make is one of the oldest and most widely used build automation tools. Originally designed for compiling C programs, it has evolved into a general-purpose task runner that appears in projects written in every language. The Makefile sits at the root of countless open-source projects, and knowing how to read and write them is a practical skill for any developer or sysadmin on Ubuntu.

## Installing Make

```bash
# Install make and common build tools
sudo apt update
sudo apt install make build-essential -y

# Verify installation
make --version
```

## Makefile Basics

A Makefile consists of **rules** with this structure:

```makefile
target: prerequisites
	command
	command
```

- **target**: The name of the thing to build, or a task name
- **prerequisites**: Files or targets that must exist before building this target
- **command**: Shell commands to run (must be indented with a TAB, not spaces)

The TAB requirement is the #1 source of Makefile errors. Configure your editor to insert real tabs in `.mk` and `Makefile` files.

## A Simple First Makefile

Create a file named `Makefile` (capital M, no extension):

```makefile
# Simple project Makefile

# Build the project
build:
	echo "Building project..."
	mkdir -p build
	gcc -o build/app src/main.c

# Run tests
test:
	echo "Running tests..."
	./scripts/run_tests.sh

# Clean build artifacts
clean:
	echo "Cleaning..."
	rm -rf build/

# Install the built application
install: build
	cp build/app /usr/local/bin/

# Default target (first target is the default)
all: build test
```

Run targets:

```bash
# Run the default target (all)
make

# Run a specific target
make build
make test
make clean
```

## Variables in Makefiles

Variables make Makefiles reusable and readable:

```makefile
# Variable definitions
CC = gcc
CFLAGS = -Wall -Wextra -O2
LDFLAGS =
SRC_DIR = src
BUILD_DIR = build
BINARY = $(BUILD_DIR)/myapp

# List source files
SOURCES = $(wildcard $(SRC_DIR)/*.c)
OBJECTS = $(SOURCES:$(SRC_DIR)/%.c=$(BUILD_DIR)/%.o)

# Build target using variables
$(BINARY): $(OBJECTS)
	$(CC) $(LDFLAGS) -o $@ $^

# Compile each source file
$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

# Automatic variables:
# $@  = name of the target
# $<  = first prerequisite
# $^  = all prerequisites
# $*  = stem of the target (for pattern rules)
```

## Phony Targets

Declare targets that are not actual files with `.PHONY`:

```makefile
# Declare non-file targets as phony
# Without this, if a file named "clean" exists, make clean does nothing
.PHONY: all build test clean install deploy help

all: build test

build:
	@echo "Building..."    # @ suppresses command echo

test:
	@echo "Testing..."

clean:
	@rm -rf build/
	@echo "Cleaned."
```

## A Practical Makefile for a Python Project

```makefile
# Python project Makefile

PYTHON = python3
PIP = pip3
VENV = .venv
VENV_BIN = $(VENV)/bin

.PHONY: all install install-dev test lint format clean run docs help

# Default target
all: install lint test

# Install production dependencies
install:
	$(PIP) install -r requirements.txt

# Install development dependencies
install-dev:
	$(PIP) install -r requirements-dev.txt
	pre-commit install

# Create and set up virtual environment
venv:
	$(PYTHON) -m venv $(VENV)
	$(VENV_BIN)/pip install --upgrade pip
	$(VENV_BIN)/pip install -r requirements.txt
	@echo "Activate with: source $(VENV)/bin/activate"

# Run tests
test:
	$(PYTHON) -m pytest tests/ -v --tb=short

# Run tests with coverage
coverage:
	$(PYTHON) -m pytest tests/ --cov=src --cov-report=html
	@echo "Coverage report: htmlcov/index.html"

# Lint code
lint:
	$(PYTHON) -m flake8 src/ tests/
	$(PYTHON) -m mypy src/ --ignore-missing-imports

# Format code
format:
	$(PYTHON) -m black src/ tests/
	$(PYTHON) -m isort src/ tests/

# Run the application
run:
	$(PYTHON) -m src.main

# Build documentation
docs:
	$(MAKE) -C docs html

# Clean build artifacts
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf .pytest_cache/ .mypy_cache/ htmlcov/ dist/ build/ *.egg-info

# Help target - lists available targets
help:
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'
```

## A Makefile for Docker Projects

```makefile
# Docker project Makefile

APP_NAME = myapp
IMAGE_NAME = myapp
IMAGE_TAG = $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
REGISTRY = registry.example.com
FULL_IMAGE = $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)

# Docker Compose file
COMPOSE_FILE = docker-compose.yml

.PHONY: build push pull up down logs clean deploy

# Build Docker image
build:
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .
	docker tag $(IMAGE_NAME):$(IMAGE_TAG) $(IMAGE_NAME):latest

# Push to registry
push: build
	docker tag $(IMAGE_NAME):$(IMAGE_TAG) $(FULL_IMAGE)
	docker push $(FULL_IMAGE)

# Start services with Docker Compose
up:
	docker-compose -f $(COMPOSE_FILE) up -d

# Stop services
down:
	docker-compose -f $(COMPOSE_FILE) down

# View logs
logs:
	docker-compose -f $(COMPOSE_FILE) logs -f

# Remove containers and images
clean:
	docker-compose -f $(COMPOSE_FILE) down --rmi local -v
	docker image prune -f

# Deploy to production
deploy: push
	ssh prod-server "docker pull $(FULL_IMAGE) && docker-compose up -d"

# Show current image tag
version:
	@echo $(IMAGE_TAG)
```

## Conditional Logic in Makefiles

```makefile
# Detect operating system
OS := $(shell uname -s)

ifeq ($(OS), Linux)
    OPEN_CMD = xdg-open
else ifeq ($(OS), Darwin)
    OPEN_CMD = open
else
    OPEN_CMD = start
endif

# Conditional compilation flags
DEBUG ?= 0
ifeq ($(DEBUG), 1)
    CFLAGS += -g -DDEBUG
    BUILD_TYPE = debug
else
    CFLAGS += -O2
    BUILD_TYPE = release
endif

build:
	@echo "Building $(BUILD_TYPE) build for $(OS)"
	$(CC) $(CFLAGS) -o app src/main.c

# Use: make DEBUG=1 to enable debug build
```

## Including Other Makefiles

Large projects split Makefiles into modules:

```makefile
# Main Makefile
include mk/build.mk
include mk/test.mk
include mk/deploy.mk

# Or conditionally include based on environment
-include .env.mk    # - means ignore if file doesn't exist
```

## Automatic Dependency Generation

For C/C++ projects, automatically track header dependencies:

```makefile
CC = gcc
CFLAGS = -Wall -MMD -MP    # -MMD generates .d dependency files
BUILD_DIR = build
SOURCES = $(wildcard src/*.c)
OBJECTS = $(SOURCES:src/%.c=$(BUILD_DIR)/%.o)
DEPS = $(OBJECTS:.o=.d)

app: $(OBJECTS)
	$(CC) -o $@ $^

$(BUILD_DIR)/%.o: src/%.c
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

# Include generated dependency files
# - prefix ignores missing .d files on first build
-include $(DEPS)

clean:
	rm -rf $(BUILD_DIR)

.PHONY: clean
```

## Useful Makefile Patterns

```makefile
# Print all variable values (debugging)
print-%:
	@echo $* = $($*)
# Usage: make print-CFLAGS

# Create directory if it doesn't exist
$(BUILD_DIR):
	mkdir -p $@

# Timestamp-based targets (only rebuild if source is newer)
output.txt: input.txt
	process_data.py $< > $@

# Run a command for each file
%.html: %.md
	pandoc $< -o $@

convert-all: $(patsubst %.md,%.html,$(wildcard docs/*.md))

# Default variables with ?= (can be overridden from command line)
PORT ?= 8080
HOST ?= localhost
run:
	./server --port $(PORT) --host $(HOST)
# Usage: make run PORT=9090
```

## Running Makefiles from Other Directories

```bash
# Run make in a specific directory
make -C /path/to/project build

# Run a specific Makefile (not named "Makefile")
make -f custom.mk target

# Run make with extra variables
make BUILD_TYPE=release JOBS=8 build

# Dry run - show what would be executed without running it
make --dry-run build
make -n build
```

## Debugging Makefiles

```bash
# Print all variables and their values
make -p 2>&1 | head -50

# Trace execution
make --trace target

# Print each recipe before executing
make SHELL='sh -x' target

# Debug specific variable
make print-SOURCES
```

Make's simplicity is its strength. It models dependencies between files and tasks cleanly, handles parallel execution with `-j`, and integrates with any build system or scripting language. The Makefile format may look dated, but it solves real problems reliably.
