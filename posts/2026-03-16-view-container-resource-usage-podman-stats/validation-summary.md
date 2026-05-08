# Validation Summary: How to View Container Resource Usage with podman stats

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containers
- Linux command-line monitoring
- Shell scripting

## Sources Consulted
- Official Podman `podman-stats(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Official Podman command reference for `podman stats` options, examples, and Go template placeholders: https://docs.podman.io/en/latest/markdown/podman-stats.1.html#options

## Issues Found
No technical issues found.

## Review Notes
The commands, `--no-stream` flag, `--format` usage, default output columns, and documented template placeholders such as `.Name`, `.CPUPerc`, `.MemUsage`, `.MemPerc`, `.NetIO`, `.BlockIO`, and `.PIDs` match the official Podman documentation. Podman documentation notes that rootless environments cannot report networking usage statistics, so `NET I/O` may show unavailable values in some rootless setups.
