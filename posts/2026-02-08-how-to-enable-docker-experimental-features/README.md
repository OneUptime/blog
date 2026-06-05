# How to Enable Docker Experimental Features

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Experimental, DevOps, Docker CLI, Docker Daemon

Description: Learn how to enable and use Docker's experimental features in both the CLI and the daemon for access to cutting-edge functionality.

---

Docker ships with a set of experimental features that are not yet considered stable for general use. These features let you try out new functionality before it lands in a stable release. Some experimental features eventually become standard, while others are modified or removed based on community feedback.

Experimental features exist in two places: the Docker CLI (client side) and the Docker daemon (server side). In current Docker releases, CLI experimental features are enabled by default. Daemon-side experimental features still have their own toggle, and you may need to enable the daemon setting depending on the feature you want to use.

This guide covers the current CLI behavior, how to enable daemon-side experimental features, what features are available, and how to work with them safely.

## What Are Docker Experimental Features?

Experimental features are capabilities that Docker's developers have built but have not yet committed to supporting long-term. They carry a few caveats:

- They may change behavior between releases without notice
- They may be removed entirely in future versions
- They may have bugs or incomplete implementations
- They should not be used in production without careful evaluation

That said, experimental features often represent the future direction of Docker. Testing them early gives you a head start on upcoming changes and lets you provide feedback to the Docker team.

## Checking Current Experimental Status

Before making changes, check the current experimental status of your Docker installation.

This command shows the daemon experimental status in the Server section:

```bash
# Check if experimental features are currently enabled

docker version
```

Look for the `Experimental` field in the Server section. In Docker 23.0 and later, Docker no longer prints an `Experimental` field for the client because CLI experimental features are enabled by default.

You can also check with:

```bash
# Quick check for daemon experimental mode
docker version --format '{{.Server.Experimental}}'
```

## Enabling Experimental Features in the Docker CLI

Starting with Docker 20.10, experimental Docker CLI features are enabled by default and require no configuration. The old CLI-specific toggle is separate from the daemon configuration, but it is no longer functional in current Docker releases.

### Legacy Method 1: Environment Variable

In older Docker CLI versions, you could enable CLI experimental features through an environment variable:

```bash
# Legacy Docker CLI versions only
export DOCKER_CLI_EXPERIMENTAL=enabled
```

This environment variable was deprecated in Docker 19.03 and removed in Docker 23.0. Do not rely on it for current Docker installations.

If you are using a legacy Docker CLI where this variable still works, you can make it permanent by adding the export to your shell profile:

```bash
# Legacy Docker CLI versions only
echo 'export DOCKER_CLI_EXPERIMENTAL=enabled' >> ~/.bashrc
source ~/.bashrc
```

### Legacy Method 2: CLI Configuration File

Older Docker CLI versions also supported the `"experimental": "enabled"` field in the Docker CLI configuration file at `~/.docker/config.json`.

```bash
# Legacy Docker CLI versions only
mkdir -p ~/.docker

# If the file doesn't exist, create it with experimental enabled
cat > ~/.docker/config.json <<EOF
{
  "experimental": "enabled"
}
EOF
```

If you already have a `config.json` with other settings (like authentication credentials), edit the file and add the `"experimental": "enabled"` key to the existing JSON object. Be careful not to overwrite your existing settings. This field is deprecated and no longer functional in Docker 23.0 and later.

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

If you are running Docker Desktop on macOS or Windows, open Docker Desktop, navigate to Settings, and use the Docker Engine tab to edit the daemon JSON configuration. Add `"experimental": true` to the JSON object and apply the change.

Docker Desktop also has a Beta features tab for Docker Desktop-specific preview functionality. That is separate from enabling the Docker Engine daemon's experimental mode.

## Notable Experimental Features

Here are some of the experimental features that have been available over the years. The exact list changes with each Docker release.

### Squash Builds

The `--squash` flag for `docker build` collapses the new layers created during a build into a single new layer. This can reduce image size in some cases, but the resulting image cannot take advantage of layer sharing with other images and may use more space or pull less efficiently.

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

Some BuildKit features are first released as experimental. BuildKit itself has become the default builder, but specific features, such as experimental Dockerfile build checks, may still require feature-specific opt-ins.

```bash
# Enable all experimental Dockerfile build checks for this build
docker build --check --build-arg "BUILDKIT_DOCKERFILE_CHECK=experimental=all" .
```

### Containerd Image Store

Docker has been switching to containerd for image storage. The containerd image store is the default storage backend for fresh Docker Engine 29.0 and later installations. If you upgraded from an earlier version, you can enable it manually:

```bash
# Enable containerd image store
{
  "features": {
    "containerd-snapshotter": true
  }
}
```

Docker Engine also has an experimental automatic migration feature for switching to the containerd image store under certain conditions. That feature uses `"containerd-migration": true`.

## Verifying Experimental Features Are Working

After enabling experimental features, verify specific commands are available in your Docker version:

```bash
# List all available commands
docker --help

# Try an experimental command (if available in your version)
docker manifest inspect nginx:latest
```

The `docker manifest` command is still marked experimental in the Docker CLI reference. Your version may have different experimental features available.

## Disabling Experimental Features

To disable experimental features, reverse the steps above.

For the CLI:

```bash
# Legacy Docker CLI versions only: unset the environment variable
unset DOCKER_CLI_EXPERIMENTAL

# Or update config.json on legacy Docker CLI versions
cat > ~/.docker/config.json <<EOF
{
  "experimental": "disabled"
}
EOF
```

In Docker 23.0 and later, the CLI environment variable and config field are no longer functional because CLI experimental features are enabled by default.

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
