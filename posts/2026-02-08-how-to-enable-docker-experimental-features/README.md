# How to Enable Docker Experimental Features

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Experimental, DevOps, Docker CLI, Docker Daemon

Description: Learn how to enable and use Docker's experimental features in both the CLI and the daemon for access to cutting-edge functionality.

---

Docker ships with a set of experimental features that are not yet considered stable for general use. These features let you try out new functionality before it lands in a stable release. Some experimental features eventually become standard, while others are modified or removed based on community feedback.

Experimental features exist in two places: the Docker CLI (client side) and the Docker daemon (server side). Each has its own toggle, and you may need to enable one or both depending on the feature you want to use.

This guide covers how to enable experimental features on both sides, what features are available, and how to work with them safely.

## What Are Docker Experimental Features?

Experimental features are capabilities that Docker's developers have built but have not yet committed to supporting long-term. They carry a few caveats:

- They may change behavior between releases without notice
- They may be removed entirely in future versions
- They may have bugs or incomplete implementations
- They should not be used in production without careful evaluation

That said, experimental features often represent the future direction of Docker. Testing them early gives you a head start on upcoming changes and lets you provide feedback to the Docker team.

## Checking Current Experimental Status

Before making changes, check the current experimental status of your Docker installation.

This command shows both client and server experimental status:

```bash
# Check if experimental features are currently enabled
docker version
```

Look for the `Experimental` field in both the Client and Server sections. If you see `false` for both, experimental features are disabled.

You can also check with:

```bash
# Quick check for experimental in a filtered view
docker version --format '{{.Client.Experimental}}'
docker version --format '{{.Server.Experimental}}'
```

## Enabling Experimental Features in the Docker CLI

The Docker CLI has its own configuration file where you can enable experimental features. This is separate from the daemon configuration.

### Method 1: Environment Variable

The quickest way to enable CLI experimental features is through an environment variable:

```bash
# Enable experimental CLI features for the current session
export DOCKER_CLI_EXPERIMENTAL=enabled

# Verify it worked
docker version --format '{{.Client.Experimental}}'
```

To make this permanent, add the export to your shell profile:

```bash
# Add to your shell profile for permanent activation
echo 'export DOCKER_CLI_EXPERIMENTAL=enabled' >> ~/.bashrc
source ~/.bashrc
```

### Method 2: CLI Configuration File

You can also enable experimental features in the Docker CLI configuration file at `~/.docker/config.json`.

```bash
# Create or update the Docker CLI config
mkdir -p ~/.docker

# If the file doesn't exist, create it with experimental enabled
cat > ~/.docker/config.json <<EOF
{
  "experimental": "enabled"
}
EOF
```

If you already have a `config.json` with other settings (like authentication credentials), edit the file and add the `"experimental": "enabled"` key to the existing JSON object. Be careful not to overwrite your existing settings.

Check that the change took effect:

```bash
# Verify CLI experimental is enabled
docker version --format '{{.Client.Experimental}}'
```

## Enabling Experimental Features in the Docker Daemon

The daemon-side experimental features are controlled through the Docker daemon configuration file.

### Method 1: Daemon Configuration File

Edit or create `/etc/docker/daemon.json`:

```bash
# Enable experimental features in the Docker daemon
sudo tee /etc/docker/daemon.json <<EOF
{
  "experimental": true
}
EOF
```

If you have existing daemon configuration, add `"experimental": true` to the JSON object alongside your other settings.

Restart the Docker daemon to apply the change:

```bash
# Restart Docker to apply daemon configuration
sudo systemctl restart docker

# Verify the daemon experimental flag
docker version --format '{{.Server.Experimental}}'
```

### Method 2: Daemon Startup Flag

You can also pass the experimental flag directly to the Docker daemon at startup. This is done by editing the systemd service file.

```bash
# Create an override for the Docker service
sudo mkdir -p /etc/systemd/system/docker.service.d

sudo tee /etc/systemd/system/docker.service.d/experimental.conf <<EOF
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd --experimental
EOF

# Reload systemd and restart Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

The first empty `ExecStart=` line clears the default ExecStart before setting the new one. This is required by systemd.

## Enabling Experimental Features in Docker Desktop

If you are running Docker Desktop on macOS or Windows, the process is simpler. Open Docker Desktop, navigate to Settings (or Preferences), and look for the "Experimental features" toggle. Enable it and click "Apply & Restart."

Docker Desktop manages both the CLI and daemon experimental flags through this single toggle.

## Notable Experimental Features

Here are some of the experimental features that have been available over the years. The exact list changes with each Docker release.

### Squash Builds

The `--squash` flag for `docker build` collapses all layers created during a build into a single layer. This reduces image size but eliminates the caching benefits of multiple layers.

```bash
# Build an image with all layers squashed into one
docker build --squash -t myapp:squashed .
```

### Checkpoint and Restore

Docker checkpointing uses CRIU (Checkpoint/Restore In Userspace) to save the state of a running container and restore it later:

```bash
# Create a checkpoint of a running container
docker checkpoint create my-container checkpoint1

# Restore the container from the checkpoint
docker start --checkpoint checkpoint1 my-container
```

This feature requires CRIU to be installed on the host:

```bash
# Install CRIU on Ubuntu/Debian
sudo apt install -y criu
```

### BuildKit Features

Some BuildKit features are first released as experimental. BuildKit itself has become the default builder, but specific features like inline cache metadata and remote cache backends started as experimental.

```bash
# Use BuildKit with experimental features
DOCKER_BUILDKIT=1 docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t myapp .
```

### Containerd Image Store

Docker has been working on switching to containerd for image storage. This experimental feature replaces Docker's built-in image storage with containerd's:

```bash
# Enable containerd image store (experimental daemon feature)
{
  "experimental": true,
  "features": {
    "containerd-snapshotter": true
  }
}
```

## Verifying Experimental Features Are Working

After enabling experimental features, verify specific commands are available:

```bash
# List all available commands - experimental ones should now appear
docker --help

# Try an experimental command (if available in your version)
docker manifest inspect nginx:latest
```

The `docker manifest` commands were experimental for a long time before becoming stable. Your version may have different experimental features available.

## Disabling Experimental Features

To disable experimental features, reverse the steps above.

For the CLI:

```bash
# Unset the environment variable
unset DOCKER_CLI_EXPERIMENTAL

# Or update config.json
cat > ~/.docker/config.json <<EOF
{
  "experimental": "disabled"
}
EOF
```

For the daemon:

```bash
# Remove or set experimental to false in daemon.json
sudo tee /etc/docker/daemon.json <<EOF
{
  "experimental": false
}
EOF

# Restart Docker
sudo systemctl restart docker
```

## Safety Considerations

When working with experimental features, keep these guidelines in mind:

1. **Test in isolation**: Use a development or staging environment, not production
2. **Pin your Docker version**: Experimental feature behavior can change between versions
3. **Read the release notes**: Check what is new and what has changed in each release
4. **Have a rollback plan**: Know how to disable experimental features if something breaks
5. **Monitor for deprecation**: Features can be removed without the usual deprecation cycle

You can check Docker release notes at the official documentation to see which experimental features are available in your version:

```bash
# Check your Docker version
docker version --format '{{.Server.Version}}'
```

## Summary

Docker's experimental features give you early access to capabilities that are still being refined. Enable them separately for the CLI and daemon using configuration files, environment variables, or startup flags. Notable experimental features include squash builds, checkpoint/restore, and the containerd image store. Always test experimental features in non-production environments and be prepared for breaking changes between Docker releases.
