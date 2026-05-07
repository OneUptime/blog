# How to Troubleshoot Quadlet Unit File Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Troubleshooting, Systemd

Description: Learn how to diagnose and fix common Quadlet unit file errors including generation failures, service start issues, and configuration problems.

---

> Quickly diagnose and resolve Quadlet issues by understanding the generation pipeline and using the right debugging tools.

Quadlet transforms files such as `.container`, `.volume`, `.network`, `.pod`, `.image`, `.build`, and `.kube` files into systemd units. When things go wrong, the error can be in the Quadlet file syntax, the generated unit, or the container runtime. This guide walks through the most common issues and how to fix them.

---

## Step 1: Check if Quadlet Generated the Unit

After running `systemctl --user daemon-reload` for rootless containers or `systemctl daemon-reload` for rootful containers, verify the unit was generated:

```bash
# List generated Quadlet units

ls /run/user/$(id -u)/systemd/generator/

# For rootful containers
ls /run/systemd/generator/
```

If your file is missing from this directory, Quadlet failed to process it.

## Step 2: Check Quadlet Generator Logs

```bash
# View Quadlet generator output in the journal
journalctl --user -t quadlet-generator

# For rootful
journalctl -t quadlet-generator
```

## Step 3: Run the Quadlet Generator Manually

```bash
# Dry-run the Quadlet generator to see output and errors
/usr/lib/systemd/system-generators/podman-system-generator --user --dryrun

# This shows the generated units and any error messages
```

## Common Errors and Solutions

### Error: File Not Found

```text
quadlet-generator: error loading "webapp.container": no such file
```

**Fix:** Ensure the file is in the correct directory:

```bash
# Rootless
ls ~/.config/containers/systemd/

# Rootful
ls /etc/containers/systemd/
```

### Error: Invalid Directive

```text
quadlet-generator: unsupported key 'InvalidKey' in group 'Container'
```

**Fix:** Check the directive name for typos. Valid directives are documented in `man quadlet`.

### Error: Image Not Found

```bash
# Check the service status for image errors
systemctl --user status webapp.service

# Verify the image exists or is accessible
podman pull docker.io/myorg/webapp:latest
```

### Error: Port Already in Use

```bash
# Find what is using the port
ss -tlnp | grep :8080

# Change the PublishPort in your Quadlet file
```

### Error: Permission Denied on Volume

```bash
# Check SELinux labels
ls -lZ ~/data/

# Add the :Z or :z suffix to the Volume directive
# Volume=%h/data:/app/data:Z
```

## Step 4: Check the Generated Unit File

```bash
# View the generated systemd unit
systemctl --user cat webapp.service

# Compare with the Quadlet source
cat ~/.config/containers/systemd/webapp.container
```

## Step 5: Test the Container Manually

Extract the podman command from the generated unit and run it manually:

```bash
# Get the ExecStart command
systemctl --user cat webapp.service | grep ExecStart

# Run it manually to see detailed error output
podman run --name test-webapp -p 8080:80 docker.io/myorg/webapp:latest
```

## Summary

Troubleshooting Quadlet involves checking the generation pipeline: verify the file location and syntax, review generator logs, inspect the generated unit, and test the container command manually. Use `--dryrun` with the generator, `journalctl` for logs, and `systemctl cat` to see the generated output.
