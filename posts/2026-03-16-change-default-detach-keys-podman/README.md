# How to Change the Default Detach Keys in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Configuration, Detach Keys

Description: Learn how to change the default detach key sequence in Podman globally through configuration files or per-command with the --detach-keys flag.

---

> Customizing detach keys prevents conflicts with your terminal shortcuts and makes container workflows more comfortable.

The default detach key sequence in Podman is `Ctrl+P, Ctrl+Q`. While this works, it can conflict with terminal shortcuts, especially in editors like nano or bash where Ctrl+P moves to the previous line. This guide shows you how to change the detach keys both globally and per-command.

---

## The Default Detach Sequence

By default, Podman uses the same detach keys as Docker:

```bash
# The default: Ctrl+P followed by Ctrl+Q

# This can conflict with:
# - Bash readline: Ctrl+P = previous command in history
# - Nano editor: Ctrl+P = previous line
# - Screen/tmux: may have overlapping bindings
```

## Per-Command Detach Keys

Override the detach keys for a single attach or run command:

```bash
# Start a container
podman run -d --name my-app alpine /bin/sh -c "while true; do sleep 1; done"

# Attach with custom detach keys
podman attach --detach-keys="ctrl-x" my-app
# Now press Ctrl+X to detach

# Use a two-key sequence
podman attach --detach-keys="ctrl-a,ctrl-d" my-app
# Press Ctrl+A then Ctrl+D to detach

# Use Ctrl+] (common alternative)
podman attach --detach-keys="ctrl-]" my-app
```

The same flag works with `podman run`:

```bash
# Run with custom detach keys
podman run -dit --detach-keys="ctrl-x" --name temp alpine /bin/sh
# Now Ctrl+X detaches from this container
```

## Available Key Formats

The detach keys support several formats:

```bash
# Single control character
--detach-keys="ctrl-a"
--detach-keys="ctrl-x"
--detach-keys="ctrl-]"
--detach-keys="ctrl-\\"

# Two-key sequence (separated by comma)
--detach-keys="ctrl-a,ctrl-d"
--detach-keys="ctrl-x,ctrl-x"
--detach-keys="ctrl-a,d"

# Single letter (not recommended, can be typed accidentally)
--detach-keys="q"
```

## Global Configuration

To change the default detach keys for all Podman commands, edit the Podman configuration file:

```bash
# Create the config directory if it does not exist
mkdir -p ~/.config/containers
```

Edit or create `~/.config/containers/containers.conf` and add this under `[engine]`:

```toml
[engine]
detach_keys = "ctrl-]"
```

Now all `podman attach` and `podman run` commands will use `Ctrl+]` by default:

```bash
# Verify the configuration
podman info >/dev/null && echo "Configuration file is valid"

# Test it - attach will now use ctrl-] by default
podman attach my-app
# Press Ctrl+] to detach
```

## Configuration File Locations

Podman reads configuration from several locations in order of precedence:

```bash
# User-specific configuration (highest priority)
~/.config/containers/containers.conf

# System-wide configuration
/etc/containers/containers.conf

# Default configuration (lowest priority, built-in)
/usr/share/containers/containers.conf
```

Check the current active configuration:

```bash
# View the current configuration
cat ~/.config/containers/containers.conf 2>/dev/null || echo "No user config found"

# Check system config
cat /etc/containers/containers.conf 2>/dev/null | grep -A2 "detach_keys" || echo "No system detach_keys config"
```

## Popular Detach Key Choices

Here are some commonly used alternatives:

```bash
# Screen-style: Ctrl+A, D
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
detach_keys = "ctrl-a,d"
EOF

# Escape key style: Ctrl+]
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
detach_keys = "ctrl-]"
EOF

# Tmux-style: Ctrl+B, D
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
detach_keys = "ctrl-b,d"
EOF
```

## Overriding Global Settings Per Command

Even with a global configuration, you can override per command:

```bash
# Global config uses ctrl-]
# But for this one command, use ctrl-x
podman attach --detach-keys="ctrl-x" my-app
```

## Verifying Your Detach Keys

Test your configuration:

```bash
# Start a container with output
podman run -d --name test-detach alpine /bin/sh -c "while true; do echo tick; sleep 1; done"

# Attach and test your detach keys
podman attach test-detach
# Try your configured detach key sequence
# If successful, you will return to your host shell

# Verify the container is still running
podman ps --filter name=test-detach
```

## Resetting to Default

To go back to the default `Ctrl+P, Ctrl+Q`:

```bash
# Remove the detach_keys line from config
# Or set it explicitly to the default
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
detach_keys = "ctrl-p,ctrl-q"
EOF

# Or remove the config file entirely to use defaults
# rm ~/.config/containers/containers.conf
```

## Cleanup

```bash
podman stop my-app temp test-detach 2>/dev/null
podman rm my-app temp test-detach 2>/dev/null
```

## Summary

Change Podman's default detach keys by editing `~/.config/containers/containers.conf` and setting `detach_keys` under the `[engine]` section. For one-off changes, use the `--detach-keys` flag on `podman attach` or `podman run`. Popular alternatives to the default `Ctrl+P, Ctrl+Q` include `Ctrl+]` and screen-style `Ctrl+A, D`.
