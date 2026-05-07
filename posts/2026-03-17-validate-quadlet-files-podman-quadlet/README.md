# How to Validate Quadlet Files with podman quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Validation, Systemd

Description: Learn how to validate Quadlet container files before deployment using the Podman Quadlet generator dry-run mode.

---

> Catch configuration errors early by validating your Quadlet files with the generator's dry-run mode before deploying them to systemd.

Quadlet files need to be syntactically correct and reference valid directives for the systemd generator to process them. Validating files before placing them in the systemd directory saves time and prevents service failures.

---

## Using the Generator Dry-Run

The Quadlet generator can run in dry-run mode to validate files without installing them:

```bash
# Validate all Quadlet files in the standard directory

/usr/lib/systemd/system-generators/podman-system-generator --user --dryrun
```

This outputs the generated systemd units to stdout and errors to stderr.

## Validating a Specific Directory

Point the generator at a custom directory for testing:

```bash
# Create a test directory
mkdir -p /tmp/quadlet-test

# Copy your Quadlet file for validation
cp myapp.container /tmp/quadlet-test/

# Run the generator against the test directory
QUADLET_UNIT_DIRS=/tmp/quadlet-test \
  /usr/lib/systemd/system-generators/podman-system-generator --user --dryrun
```

## Checking for Syntax Errors

The generator reports errors for invalid directives:

```bash
# A file with a typo
cat > /tmp/quadlet-test/bad.container << 'CONTAINEREOF'
[Unit]
Description=Bad container

[Container]
Imagee=docker.io/library/nginx:latest
PublishPort=8080:80
CONTAINEREOF

# Validate - this will show errors
QUADLET_UNIT_DIRS=/tmp/quadlet-test \
  /usr/lib/systemd/system-generators/podman-system-generator --user --dryrun 2>&1
```

## Reviewing Generated Output

Check what systemd unit the generator produces:

```bash
# Run dry-run and review the output
/usr/lib/systemd/system-generators/podman-system-generator --user --dryrun 2>/dev/null

# The output shows the full systemd unit file
# Verify the ExecStart line has the correct podman command
```

## Validating with systemd-analyze

After generating the unit, use systemd-analyze to verify:

```bash
# Verify the generated unit file syntax
systemd-analyze --user --generators=true verify webapp.service

# Check for dependency issues
systemd-analyze --user dot webapp.service
```

## Pre-Deployment Validation Script

Create a simple validation script:

```bash
#!/bin/bash
# validate-quadlet.sh - Validate Quadlet files before deployment

QUADLET_DIR="${1:-$HOME/.config/containers/systemd}"
GENERATOR="/usr/lib/systemd/system-generators/podman-system-generator"

echo "Validating Quadlet files in $QUADLET_DIR..."

# Run the generator in dry-run mode
output=$(QUADLET_UNIT_DIRS="$QUADLET_DIR" $GENERATOR --user --dryrun 2>&1)
exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo "Validation FAILED:"
    echo "$output" | grep -i error
    exit 1
fi

echo "Validation passed. Generated units:"
echo "$output" | grep "^---"
```

## Summary

Validate Quadlet files before deployment using the generator's `--dryrun` mode. Point it at test directories with `QUADLET_UNIT_DIRS`, check for syntax errors in stderr output, and review the generated systemd units in stdout. Combine with `systemd-analyze verify` for comprehensive validation of the final unit files.
