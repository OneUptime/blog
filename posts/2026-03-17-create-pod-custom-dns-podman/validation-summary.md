# Validation Summary: How to Create a Pod with Custom DNS in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman pods
- Container DNS configuration
- `/etc/resolv.conf`
- DNS search domains and resolver options
- Alpine Linux container commands

## Sources Consulted
- Podman stable `podman-pod-create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Linux `resolv.conf(5)` manual page: https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
No technical issues found.

## Review Notes
The documented `--dns`, `--dns-search`, and `--dns-option` flags are valid for `podman pod create`, and Podman documents these settings as writing to the pod-level `/etc/resolv.conf` shared by containers in the pod. Podman was not installed in the local review environment, so commands were verified against official documentation rather than executed locally.
