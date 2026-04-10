# Validation Summary: How to Use Ceph RBD with Docker Volume Plugin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Docker volume plugins (managed plugin API)
- Docker CLI (`docker plugin`, `docker volume`, `docker run`)
- Rook-Ceph toolbox (for RBD management commands)
- CephX authentication
- ext4 filesystem

## Sources Consulted
- Docker CLI reference for `docker plugin install`: https://docs.docker.com/reference/cli/docker/plugin/install/
- Docker CLI reference for `docker plugin set`: https://docs.docker.com/reference/cli/docker/plugin/set/
- Docker CLI reference for `docker plugin enable`: https://docs.docker.com/reference/cli/docker/plugin/enable/
- Docker managed plugins documentation: https://docs.docker.com/engine/extend/
- Ceph documentation on configuration: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- yp-engineering/rbd-docker-plugin GitHub repository: https://github.com/yp-engineering/rbd-docker-plugin

## Issues Found

### Issue 1: Incorrect plugin install/enable/set ordering
**What was wrong:** The post installed the plugin with `--grant-all-permissions` (which auto-enables it), then ran `docker plugin enable rbd` (which would error since it's already enabled), and then ran `docker plugin set` (which requires the plugin to be disabled). This sequence would fail at both the enable and set steps.

**What was changed:** Added `--disable` flag to `docker plugin install` so the plugin is not auto-enabled. Removed the standalone `docker plugin enable rbd` from the install section. Moved `docker plugin enable rbd` to the end of the configure section, after `docker plugin set`, so the correct order is: install (disabled) -> configure -> enable.

### Issue 2: Non-standard Ceph configuration file path
**What was wrong:** The post wrote the Ceph configuration to `/etc/docker/rbd-plugin.conf`, which is not a standard or recognized Ceph configuration path. Ceph tools and plugins expect the configuration at `/etc/ceph/ceph.conf` by default.

**What was changed:** Changed the config file path from `/etc/docker/rbd-plugin.conf` to `/etc/ceph/ceph.conf`.

## Review Notes
- The `yp-engineering/rbd-docker-plugin` project on GitHub has not been updated since November 2017 and was originally designed as a legacy Docker volume plugin (standalone binary), not a Docker managed plugin. The GHCR image path (`ghcr.io/yp-engineering/rbd-docker-plugin`) may not exist as a published managed plugin. Readers may need to find an alternative maintained RBD Docker volume plugin or build their own.
- The post mixes `kubectl -n rook-ceph exec` commands (Kubernetes) with Docker volume plugin usage (standalone Docker). This is conceptually valid if the Ceph cluster is managed by Rook in Kubernetes but Docker containers run on separate hosts, but it may confuse readers. For standalone Ceph deployments, the `rbd` CLI can be run directly on the host.
- The claim that `docker volume rm` "also removes the RBD image" is plugin-dependent. The yp-engineering plugin only removes the RBD image if started with the `--remove` flag set to `delete`. Readers should verify their plugin's behavior.
- The size value of 10240 for a 10GB volume is correct assuming MB units (10 * 1024 = 10240 MB).
