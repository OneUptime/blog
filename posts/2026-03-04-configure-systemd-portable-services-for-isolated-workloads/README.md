# How to Configure systemd Portable Services for Isolated Workloads on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, System Administration, Containers, Linux

Description: Learn how to configure systemd Portable Services for Isolated Workloads on RHEL with step-by-step instructions, configuration examples, and best practices.

---

systemd portable services provide a way to run application bundles in isolated environments without full container runtimes. A portable service is a disk image that contains an application and its dependencies, attached to the host's systemd instance.

## Prerequisites

- RHEL with systemd 250 or later
- Root or sudo access
- `systemd-portable` package installed

## What Are Portable Services

Portable services bundle an application, its libraries, and unit files into a single disk image. When attached, systemd integrates the image's services as if they were native, but the file system and resources are isolated.

## Step 1: Install Required Packages

```bash
sudo dnf install -y systemd-container
```

## Step 2: Create a Portable Service Image

Build a minimal directory tree:

```bash
mkdir -p /tmp/myportable/usr/lib/systemd/system
mkdir -p /tmp/myportable/usr/local/bin
mkdir -p /tmp/myportable/etc
```

Create the service unit inside the image:

```bash
cat > /tmp/myportable/usr/lib/systemd/system/myportable.service << 'EOF'
[Unit]
Description=My Portable Service

[Service]
Type=simple
ExecStart=/usr/local/bin/myapp
DynamicUser=yes
EOF
```

Copy your application binary:

```bash
cp /path/to/myapp /tmp/myportable/usr/local/bin/
```

Create an `os-release` file:

```bash
cat > /tmp/myportable/etc/os-release << 'EOF'
ID=rhel
VERSION_ID=9
EOF
```

## Step 3: Create the Disk Image

```bash
mksquashfs /tmp/myportable myportable_1.0.raw -noappend
```

## Step 4: Attach the Portable Service

```bash
sudo portablectl attach myportable_1.0.raw
```

This copies the unit files from the image into the host systemd configuration.

## Step 5: Start the Service

```bash
sudo systemctl start myportable.service
systemctl status myportable.service
```

## Step 6: List and Detach

```bash
portablectl list
sudo portablectl detach myportable_1.0.raw
```

## Security Profiles

Portable services support security profiles that restrict what the service can access:

```bash
sudo portablectl attach --profile=strict myportable_1.0.raw
```

Available profiles include `default`, `strict`, `trusted`, and `nonetwork`.

## Conclusion

systemd portable services offer a lightweight alternative to containers for deploying isolated applications on RHEL. They leverage systemd's native features for security and resource management while packaging applications in self-contained images.
