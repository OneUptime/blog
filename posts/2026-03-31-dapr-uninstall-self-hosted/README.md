# How to Uninstall Dapr from Self-Hosted Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Self-Hosted, Uninstall, Docker, Cleanup

Description: Learn how to cleanly uninstall Dapr from a self-hosted environment, removing containers, binaries, and configuration files completely.

---

## What Gets Installed in Self-Hosted Mode

When you run `dapr init`, Dapr installs the following in self-hosted mode:

- Dapr placement service container
- Dapr scheduler service container
- Zipkin container (for tracing)
- Redis container (for state and pub/sub)
- Dapr binaries in `~/.dapr/bin/`
- Default component configurations in `~/.dapr/components/`

## Basic Uninstall

To remove Dapr from self-hosted mode, run:

```bash
dapr uninstall
```

This removes the Dapr placement container and the Dapr binaries. It does not remove the Redis, Zipkin, or Scheduler containers, since you may be using them for other purposes.

## Removing All Configuration Files

The basic uninstall does not remove configuration files or the Redis, Zipkin, and Scheduler containers. To remove everything, use:

```bash
dapr uninstall --all
```

This removes:
- All Dapr containers (placement, scheduler, Redis, Zipkin)
- `~/.dapr/bin/` - runtime binaries
- `~/.dapr/components/` - default components
- `~/.dapr/config.yaml` - default configuration

## Slim Mode Uninstall

If you initialized Dapr without Docker using `dapr init --slim`, uninstall using the standard command:

```bash
dapr uninstall
```

Since no containers were created in slim mode, this removes only the runtime binaries. There is no `--slim` flag for the uninstall command.

## Manual Cleanup

If the uninstall command fails, clean up manually:

```bash
# Stop and remove Dapr containers
docker stop dapr_placement dapr_scheduler dapr_redis dapr_zipkin
docker rm dapr_placement dapr_scheduler dapr_redis dapr_zipkin

# Remove Dapr directory
rm -rf ~/.dapr

# Remove CLI binary (macOS/Linux)
sudo rm /usr/local/bin/dapr
```

On Windows:

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.dapr"
```

## Verifying Removal

```bash
# Confirm containers are gone
docker ps -a | grep dapr

# Confirm binary is removed
which dapr
```

## Summary

Uninstall Dapr from self-hosted mode using `dapr uninstall` to remove the placement container and binaries, or `dapr uninstall --all` to remove all containers and the `~/.dapr` configuration directory. For slim installations without Docker, the standard `dapr uninstall` command works since no containers need to be removed.
