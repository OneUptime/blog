# Validation Summary: How to View Podman System Information with podman info

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman CLI
- Go templates
- JSON and `jq`
- Shell scripting
- Container registries

## Sources Consulted
- Podman `podman-info` man page: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman-info` source markdown: https://raw.githubusercontent.com/containers/podman/main/docs/source/markdown/podman-info.1.md
- Podman `Info`, `HostInfo`, `SecurityInfo`, and `StoreInfo` struct definitions: https://raw.githubusercontent.com/containers/podman/main/libpod/define/info.go

## Issues Found
- The post said the default `podman info` output centered on three main sections, but the official documentation shows additional top-level sections including `plugins` and `version`. I corrected the description to match the documented output shape.
- The registry example used `{{.Registries.Search}}`, but Podman documents `registries` as a map and shows extracting the search registries with `{{index .Registries "search"}}`. I updated the command so the template matches the documented structure.
- The Go-template example used `{{.Host.Os}}`, but the current `HostInfo` struct exposes the field as `OS`. I corrected the example to `{{.Host.OS}}`.
- The host-filtering example claimed to show only the host section, but `grep -A 50` only shows the beginning of that section on current documented output. I corrected the comment to describe the command accurately.

## Review Notes
`podman info` output is version-dependent and may gain additional fields over time, but the commands and field paths used in the revised post align with the current official Podman documentation and source definitions as of May 7, 2026.
