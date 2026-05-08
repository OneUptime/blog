# Validation Summary: How to View Image History and Layers with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container images
- Containerfile / Dockerfile image builds
- Shell pipelines

## Sources Consulted
- Podman `podman-history` official documentation: https://docs.podman.io/en/latest/markdown/podman-history.1.html
- Podman `podman-inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman `podman-system-df` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `podman-build` official documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html

## Issues Found
- The introduction stated that each Containerfile instruction creates a layer. This is not precise because metadata instructions can appear as zero-byte history entries rather than filesystem layers. Updated the explanation to distinguish filesystem-changing instructions from zero-byte history entries.
- The sample `podman history` output used `0B` and simplified `CREATED BY` values. Current Podman documentation shows human-readable zero-byte sizes as `0 B` and `CREATED BY` entries commonly include `/bin/sh -c #(nop)` for metadata instructions. Updated the sample to match documented output more closely.
- Size arithmetic examples used default human-readable `.Size` values with `bc`, which would fail for values such as `45.14 MB`. Updated those commands to use `--human=false`, which returns raw byte counts suitable for arithmetic.
- Large-layer sorting and zero-size filtering examples assumed human-readable sizes and `0B`. Updated them to use raw byte output with numeric sorting and exact zero filtering.
- The analysis script counted content layers and large layers using human-readable size strings. Updated it to use raw byte output and an explicit 100 MiB threshold for large layers.

## Review Notes
Podman was not installed in the local environment, so commands could not be executed directly. Validation was performed against current official Podman documentation. The post remains technically relevant and the reviewed commands and flags are current according to the consulted documentation.
