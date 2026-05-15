# How to Create Custom RHEL Blueprints with Packages and Customizations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Image Builder, Blueprints, Customization, Automation, Linux

Description: Create detailed RHEL Image Builder blueprints with custom packages, user accounts, services, firewall rules, and filesystem configurations.

---

Image Builder blueprints define the content and configuration of custom RHEL images. Blueprints use the TOML format and support a wide range of customizations beyond just package lists.

## Blueprint Structure

A blueprint with several common customization types:

```toml
# full-server.toml

name = "full-server"
description = "Fully customized RHEL server image"
version = "2.0.0"

# Package selection
[[packages]]
name = "httpd"
version = "2.4.*"

[[packages]]
name = "postgresql-server"
version = "*"

[[packages]]
name = "vim-enhanced"
version = "*"

[[packages]]
name = "tmux"
version = "*"

[[packages]]
name = "git"
version = "*"

# Package groups
[[groups]]
name = "development"

# Hostname and timezone
[customizations]
hostname = "app-server"

[customizations.timezone]
timezone = "America/New_York"
ntpservers = ["time.example.com"]

[customizations.locale]
languages = ["en_US.UTF-8"]
keyboard = "us"

# User accounts
[[customizations.user]]
name = "appuser"
description = "Application user"
home = "/home/appuser"
shell = "/bin/bash"
groups = ["wheel"]
uid = 1001
password = "$6$rhelblueprint$IrzFK7KpGLxqvv0i0gYZ90CA5nFzhgFshOmebAZcabionkpBBsJt03b4B0K22tdvc6u/jJAiS2kZ6RBMyzHqM0"

[[customizations.user]]
name = "deploy"
description = "Deployment user"
groups = ["wheel"]
key = "ssh-ed25519 AAAAC3NzaC1... deploy@workstation"

# Service configuration
[customizations.services]
enabled = ["httpd", "postgresql", "firewalld", "sshd"]
disabled = []

# Firewall configuration
[customizations.firewall]
ports = ["22:tcp", "80:tcp", "443:tcp", "5432:tcp"]

# Filesystem customization
[[customizations.filesystem]]
mountpoint = "/var"
minsize = "10 GiB"

[[customizations.filesystem]]
mountpoint = "/home"
minsize = "20 GiB"

[[customizations.filesystem]]
mountpoint = "/var/log"
minsize = "5 GiB"
```

## Managing Blueprints

```bash
# Push the blueprint
composer-cli blueprints push full-server.toml

# List all blueprints
composer-cli blueprints list

# Show blueprint details
composer-cli blueprints show full-server

# Check dependency resolution
composer-cli blueprints depsolve full-server

# Export a blueprint to edit later
composer-cli blueprints save full-server
# Saves as full-server.toml in current directory
```

## Versioning Blueprints

Update a blueprint by changing the version and pushing again:

```bash
# Edit the version in the TOML file
# version = "2.1.0"

# Push the updated blueprint
composer-cli blueprints push full-server.toml

# View changes (shows available package versions)
composer-cli blueprints changes full-server
```

## Freezing Package Versions

Inspect or save a frozen blueprint with resolved package versions for reproducible builds:

```bash
# Show resolved package versions
composer-cli blueprints freeze full-server

# Show the frozen blueprint with exact versions
composer-cli blueprints freeze show full-server

# Save the frozen blueprint to a TOML file
composer-cli blueprints freeze save full-server
```

Building from the frozen blueprint helps produce consistent images as long as the referenced package versions remain available in your repositories, which is important for production environments where consistency matters.
