# How to Fix Podman Registry Mirror Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Registry, Mirror, DevOps

Description: Learn how to configure Podman registry mirrors to speed up image pulls, work around rate limits, and use private registries with the registries.conf configuration file.

---

> Podman registry mirrors redirect image pulls to alternate registries, speeding up downloads and avoiding rate limits. This guide covers how to configure mirrors correctly using registries.conf with practical examples for common scenarios.

Pulling container images from public registries like Docker Hub can be slow, unreliable, or throttled by rate limits. Registry mirrors solve this by redirecting pull requests to a closer or faster copy of the same images. Podman uses a configuration file called `registries.conf` to define these mirrors, but the syntax and behavior can be confusing.

This guide covers the modern version 2 `registries.conf` format. If you are still using the old version 1 format, this guide will help you migrate.

---

## Understanding registries.conf

Podman reads registry configuration from these locations:

1. `$HOME/.config/containers/registries.conf` if it exists, otherwise `/etc/containers/registries.conf`
2. If the system-wide main file is used, `/etc/containers/registries.conf.d/*.conf` and then `$HOME/.config/containers/registries.conf.d/*.conf`
3. If the per-user main file is used, only `$HOME/.config/containers/registries.conf.d/*.conf`

The modern format uses TOML syntax with `[[registry]]` sections:

```toml
[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "mirror.example.com"
```

This tells Podman: when pulling an image with the prefix `docker.io`, try `mirror.example.com` first, then fall back to `docker.io`.

## Fix 1: Configure a Basic Docker Hub Mirror

The most common use case is mirroring Docker Hub. Create or edit your configuration file:

For rootless Podman:

```bash
mkdir -p ~/.config/containers/
```

Edit `~/.config/containers/registries.conf`:

```toml
unqualified-search-registries = ["docker.io"]

[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "your-mirror.example.com"
```

Test the configuration:

```bash
podman pull docker.io/library/alpine:latest
```

Podman will try `your-mirror.example.com/library/alpine:latest` first. If that fails, it falls back to `docker.io`.

## Fix 2: Set Up Multiple Mirrors with Fallback

You can configure multiple mirrors. Podman tries them in order:

```toml
[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "mirror1.example.com"

[[registry.mirror]]
location = "mirror2.example.com"

[[registry.mirror]]
location = "mirror3.example.com"
```

Podman tries mirror1 first, then mirror2, then mirror3, and finally the original `docker.io` location.

## Fix 3: Configure Mirrors for Multiple Registries

You can mirror different registries independently:

```toml
unqualified-search-registries = ["docker.io"]

# Docker Hub mirror

[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "docker-hub-mirror.example.com"

# GitHub Container Registry mirror
[[registry]]
prefix = "ghcr.io"
location = "ghcr.io"

[[registry.mirror]]
location = "ghcr-mirror.example.com"

# Quay.io mirror
[[registry]]
prefix = "quay.io"
location = "quay.io"

[[registry.mirror]]
location = "quay-mirror.example.com"
```

## Fix 4: Use an Insecure Mirror (HTTP)

If your mirror runs on HTTP instead of HTTPS (common in development environments), you need to mark it as insecure:

```toml
[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "192.168.1.100:5000"
insecure = true
```

You can also mark an entire registry as insecure:

```toml
[[registry]]
prefix = "my-internal-registry.local:5000"
location = "my-internal-registry.local:5000"
insecure = true
```

Without `insecure = true`, Podman will refuse to connect over HTTP.

## Fix 5: Redirect All Pulls Through a Mirror

To force all Docker Hub pulls through your mirror without fallback:

```toml
[[registry]]
prefix = "docker.io"
location = "your-mirror.example.com"
```

Notice that there is no `[[registry.mirror]]` section and the `location` points directly to the mirror. This means Podman replaces `docker.io` entirely with your mirror. If the mirror is down, pulls will fail rather than falling back.

## Fix 6: Handle Short Image Names

When you run `podman pull nginx` without specifying a registry, Podman uses the `unqualified-search-registries` list to determine which registries to search:

```toml
unqualified-search-registries = ["docker.io", "quay.io", "registry.access.redhat.com"]
```

Podman uses short-name resolution for these names. Depending on your `short-name-mode` setting and whether the command is running in a terminal, Podman may prompt you to choose a registry or may try the configured registries in order. To avoid ambiguity, always use fully qualified image names:

```bash
# Ambiguous - could come from any search registry
podman pull nginx

# Explicit - always pulls from Docker Hub
podman pull docker.io/library/nginx:latest
```

If you want to eliminate the prompt that asks which registry to use:

```toml
# Only search Docker Hub for unqualified names
unqualified-search-registries = ["docker.io"]
```

## Fix 7: Block Registries

You can block specific registries entirely:

```toml
[[registry]]
prefix = "docker.io"
location = "docker.io"
blocked = true
```

This prevents any pulls from Docker Hub. Use this in environments where you want to force all images to come from your internal registry.

Do not combine `blocked = true` with a redirect for the same prefix. If you want users to pull from an internal registry instead of Docker Hub, use a redirect without blocking:

```toml
[[registry]]
prefix = "docker.io"
location = "internal-mirror.company.com"
```

## Fix 8: Configure Authentication for Mirrors

If your mirror requires authentication, configure credentials separately. Podman uses `auth.json` for credentials:

```bash
podman login your-mirror.example.com
```

On Linux, this stores credentials in `$XDG_RUNTIME_DIR/containers/auth.json` by default. If you want credentials to persist across reboots, specify the persistent auth file explicitly:

```bash
podman login --authfile ~/.config/containers/auth.json your-mirror.example.com
```

You can also create the auth file manually:

```bash
mkdir -p ~/.config/containers/

cat > ~/.config/containers/auth.json << 'EOF'
{
    "auths": {
        "your-mirror.example.com": {
            "auth": "dXNlcm5hbWU6cGFzc3dvcmQ="
        }
    }
}
EOF
```

Generate the base64 value:

```bash
echo -n "username:password" | base64
```

## Fix 9: Use Drop-In Configuration Files

Instead of modifying the main `registries.conf`, you can add drop-in files for modular configuration:

```bash
sudo mkdir -p /etc/containers/registries.conf.d/
```

Create `/etc/containers/registries.conf.d/010-mirror.conf`:

```toml
[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "mirror.company.com"
```

Drop-in files are merged with the main configuration. This is useful for configuration management tools like Ansible or Puppet.

## Fix 10: Verify and Debug Mirror Configuration

After configuring mirrors, verify the configuration is correct:

```bash
# Check for syntax errors
podman info | grep -A 20 registries

# Pull an image and watch which registry is used
podman pull --log-level=debug docker.io/library/alpine:latest 2>&1 | grep -i "mirror\|trying\|pulling"

# List configured search registries
podman info --format '{{range .Registries.Search}}{{println .}}{{end}}'
```

Common issues and their fixes:

```bash
# Error: toml: expected character =
# Fix: Check TOML syntax, ensure proper quoting and section headers

# Error: dial tcp: lookup mirror.example.com: no such host
# Fix: Verify DNS resolution for the mirror hostname
nslookup mirror.example.com

# Error: tls: failed to verify certificate
# Fix: Either add the CA certificate or mark as insecure
# Add CA: copy cert to /etc/pki/ca-trust/source/anchors/ and run update-ca-trust
# Or mark insecure in registries.conf
```

## Migrating from Old Format

The old version 1 format looked like this:

```toml
[registries.search]
registries = ['docker.io']
```

Version 1 does not support registry mirrors, longest-prefix matches, or location rewriting. Convert it to the new TOML format and add the mirror configuration there:

```toml
unqualified-search-registries = ["docker.io"]

[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "mirror.example.com"
```

Podman logs a deprecation warning if you use the old format. Migrate as soon as possible since the old format does not support registry mirrors, longest-prefix matches, or location rewriting.

## Conclusion

Podman registry mirrors are configured through `registries.conf` using the TOML-based format. Define mirrors under `[[registry.mirror]]` sections for fallback behavior, or change the `location` directly for hard redirects. Use `insecure = true` for HTTP mirrors, configure multiple mirrors for redundancy, and use drop-in files for modular configuration management. Always verify your configuration with `podman info` and test with `--log-level=debug` to confirm mirrors are being used as expected.
