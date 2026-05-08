# Validation Summary: How to Set CPU Limits for a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Linux cgroups CPU controls
- CPU quota, period, shares, and cpuset options
- NUMA memory node pinning

## Sources Consulted
- Podman `run` official documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman `update` official documentation: https://docs.podman.io/en/stable/markdown/podman-update.1.html
- Podman `stats` official documentation: https://docs.podman.io/en/stable/markdown/podman-stats.1.html
- Podman `inspect` official documentation: https://docs.podman.io/en/stable/markdown/podman-inspect.1.html
- Podman `container inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- BusyBox `sleep` official documentation: https://busybox.net/downloads/BusyBox.html

## Issues Found
- The description claimed the post covered real-time scheduling options, but the post does not cover Podman's `--cpu-rt-period` or `--cpu-rt-runtime` flags. Updated the description to mention only CPU quotas, shares, and pinning options.
- The introduction said the guide covered all CPU limiting options available in Podman, but it covers the common quota, share, cpuset, and NUMA options rather than every CPU-related flag. Changed this to "the most common CPU limiting options."
- Several Alpine examples used `sleep infinity`. Alpine uses BusyBox by default, and BusyBox `sleep` accepts numeric durations with optional `s`, `m`, `h`, or `d` suffixes, not `infinity`. Replaced those Alpine examples with `sleep 1d`.

## Review Notes
Podman's CPU resource flags are documented as unsupported on cgroups v1 rootless systems and may require appropriate host permissions. The examples are otherwise valid, but examples using fixed CPU IDs such as `4-7` assume the host has those CPUs available.
