# Validation Summary: How to Configure Default Pull Policy in containers.conf

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- containers.conf
- Container image pull policies
- Linux shell commands

## Sources Consulted
- Podman latest `podman-create(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman stable `podman-pull(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Official containers/common `containers.conf(5)` documentation: https://github.com/containers/container-libs/blob/main/common/docs/containers.conf.5.md

## Issues Found
- The post stated that `containers.conf` supports four default pull policy values, including `newer`. The official `containers.conf(5)` documentation lists `pull_policy` values as `always`, `missing`, and `never`; `newer` is documented for the `podman run` / `podman create` `--pull` flag. Updated the post to distinguish default `containers.conf` policy values from per-command `--pull=newer` usage.
- The "Using newer" section configured `pull_policy = "newer"` in `containers.conf`. Replaced that snippet with a valid `podman run --pull=newer` example and adjusted the explanation to describe digest-based freshness checks.
- The "Choosing the Right Policy" and summary sections recommended `pull_policy = "newer"` as a default configuration option. Updated those recommendations to use `missing` as the default and `--pull=newer` when an explicit registry freshness check is needed.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation rather than local `--help` output.
