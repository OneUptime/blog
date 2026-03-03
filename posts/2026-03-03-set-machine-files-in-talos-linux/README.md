# How to Set Machine Files in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Machine Configuration, File, Kubernetes, System Administration

Description: Learn how to create and manage files on Talos Linux nodes using the machine files configuration for custom configs and scripts.

---

Talos Linux is an immutable operating system, which means you cannot just SSH into a node and create files wherever you want. The filesystem is read-only by design. But there are plenty of legitimate reasons to place files on a node - custom CA certificates, configuration files for system extensions, scripts that run at specific lifecycle stages, or data files that services depend on. The `machine.files` section of the Talos configuration gives you a controlled way to write files to the filesystem.

This guide explains how to use `machine.files` effectively, covering syntax, permissions, common use cases, and important gotchas.

## The Machine Files Configuration

The `machine.files` field accepts a list of file definitions. Each definition specifies the file content, the destination path, the permissions, and the operation type. Here is the basic structure:

```yaml
# Write a simple file to the filesystem
machine:
  files:
    - content: |
        Hello from Talos Linux
      permissions: 0o644
      path: /var/etc/hello.txt
      op: create
```

This creates a file at `/var/etc/hello.txt` with the content "Hello from Talos Linux", readable by everyone but only writable by root. The `op` field determines what happens if the file already exists.

## File Operations

Talos supports three file operations: `create`, `append`, and `overwrite`.

The `create` operation writes the file only if it does not already exist. If the file is already there, Talos leaves it alone:

```yaml
# Only create if the file doesn't exist
machine:
  files:
    - content: |
        initial-config-value=true
      permissions: 0o644
      path: /var/etc/myapp/config.ini
      op: create
```

The `append` operation adds content to the end of an existing file, or creates it if it does not exist:

```yaml
# Append content to an existing file
machine:
  files:
    - content: |
        extra-line=added-by-talos
      permissions: 0o644
      path: /var/etc/myapp/config.ini
      op: append
```

The `overwrite` operation replaces the file contents regardless of what was there before:

```yaml
# Always overwrite with fresh content
machine:
  files:
    - content: |
        version=2.0
        mode=production
      permissions: 0o644
      path: /var/etc/myapp/config.ini
      op: overwrite
```

In most cases, `create` is the safest choice. Use `overwrite` when you need to ensure the file always matches your desired state.

## File Permissions

Permissions are specified in octal notation with the `0o` prefix. Common permission values include:

```yaml
machine:
  files:
    # World-readable file
    - content: "public info"
      permissions: 0o644
      path: /var/etc/public.txt
      op: create

    # Owner-only readable (useful for secrets)
    - content: "secret data"
      permissions: 0o600
      path: /var/etc/secret.txt
      op: create

    # Executable script
    - content: |
        #!/bin/bash
        echo "Running custom script"
      permissions: 0o755
      path: /var/etc/scripts/custom.sh
      op: create
```

Getting permissions right matters for security. Files containing sensitive information like certificates or keys should use `0o600` so that only root can read them.

## Where to Place Files

Talos has a mostly read-only filesystem. You cannot write to arbitrary locations. The `/var/` directory is the writable area, and that is where your custom files should go. Specifically, `/var/etc/` is the conventional location for custom configuration files.

```yaml
# Place files in the writable /var directory tree
machine:
  files:
    - content: |
        # Custom resolv.conf override
        nameserver 10.0.0.53
        nameserver 10.0.0.54
        search cluster.local
      permissions: 0o644
      path: /var/etc/resolv.conf
      op: create
```

Some system paths are bind-mounted from `/var/etc/` to their expected locations. For example, Talos can pick up custom DNS configuration from `/var/etc/resolv.conf`. Check the Talos documentation for your specific version to see which paths support this.

## Practical Use Case: Custom CA Certificates

One of the most common uses of machine files is deploying custom CA certificates so that the node can trust internal services:

```yaml
# Deploy a custom CA certificate
machine:
  files:
    - content: |
        -----BEGIN CERTIFICATE-----
        MIIBnDCCAUKgAwIBAgIUbE7kNPOm... (your CA cert here)
        -----END CERTIFICATE-----
      permissions: 0o644
      path: /var/etc/ssl/certs/internal-ca.pem
      op: create
```

After placing the CA certificate, you might also need to configure Talos to trust it system-wide. This is typically done through the `machine.certSANs` or the registry TLS configuration rather than just placing the file.

## Practical Use Case: Containerd Configuration

If you need to customize the container runtime behavior, you can drop configuration files for containerd:

```yaml
# Custom containerd configuration snippet
machine:
  files:
    - content: |
        [plugins."io.containerd.grpc.v1.cri"]
          enable_unprivileged_ports = true
          enable_unprivileged_icmp = true
      permissions: 0o644
      path: /var/cri/conf.d/20-custom.toml
      op: create
```

This lets you tune containerd without modifying the base Talos image. The exact paths and supported configuration options depend on your Talos version.

## Practical Use Case: Udev Rules via Files

While Talos has a dedicated `machine.udev` section, you can also manage udev rules through machine files if you need more control:

```yaml
# Custom udev rule file
machine:
  files:
    - content: |
        # Set specific permissions for a USB device
        SUBSYSTEM=="usb", ATTR{idVendor}=="1234", ATTR{idProduct}=="5678", MODE="0666"
      permissions: 0o644
      path: /var/etc/udev/rules.d/99-custom.rules
      op: create
```

## Multiple Files in One Configuration

You can define as many files as you need in a single configuration:

```yaml
# Deploy multiple files at once
machine:
  files:
    - content: |
        LOG_LEVEL=info
        LOG_FORMAT=json
      permissions: 0o644
      path: /var/etc/myapp/logging.conf
      op: create

    - content: |
        max_connections=100
        timeout=30
      permissions: 0o644
      path: /var/etc/myapp/database.conf
      op: create

    - content: |
        #!/bin/bash
        # Health check script
        curl -sf http://localhost:8080/health || exit 1
      permissions: 0o755
      path: /var/etc/scripts/healthcheck.sh
      op: create
```

## Applying and Verifying

Apply the configuration as usual:

```bash
# Apply the config with file definitions
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file worker.yaml
```

Then verify the files were created:

```bash
# List files in the target directory
talosctl list --nodes 192.168.1.100 /var/etc/myapp/

# Read the contents of a specific file
talosctl read --nodes 192.168.1.100 /var/etc/myapp/logging.conf
```

## Updating Files

When you update the content of a file in your machine config and reapply, the behavior depends on the `op` field. If you used `create`, the file will not be updated because it already exists. Switch to `overwrite` if you need the new content to replace the old:

```yaml
# Update a file by switching to overwrite
machine:
  files:
    - content: |
        LOG_LEVEL=debug
        LOG_FORMAT=json
      permissions: 0o644
      path: /var/etc/myapp/logging.conf
      op: overwrite
```

This is a common source of confusion. People update their config, reapply it, and wonder why the file content did not change. The answer is usually that they are using `create` instead of `overwrite`.

## Important Limitations

Machine files are not a replacement for ConfigMaps or Secrets in Kubernetes. They are for node-level configuration, not application-level configuration. If your application running in a pod needs a config file, use Kubernetes-native mechanisms. Machine files are for the OS layer and system services.

Also, keep file sizes reasonable. The machine configuration has an overall size limit, and embedding large binary files as base64-encoded content is not practical. For large files, consider hosting them on an internal HTTP server and downloading them with an init container or a DaemonSet.

The `machine.files` feature is a powerful tool for customizing Talos Linux nodes within the constraints of its immutable design. Use it for system-level configuration, certificates, and small data files that need to exist on the node before Kubernetes even starts.
