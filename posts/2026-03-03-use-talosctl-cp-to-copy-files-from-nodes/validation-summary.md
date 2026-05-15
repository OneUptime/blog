# Validation Summary: How to Use talosctl cp to Copy Files from Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Linux procfs files
- tar/gzip archive extraction
- Shell scripting

## Sources Consulted
- Talos CLI reference for `talosctl copy`, `talosctl read`, `talosctl logs`, `talosctl dmesg`, `talosctl memory`, `talosctl mounts`, and `talosctl disks`: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos overview describing API-managed, immutable, minimal design: https://docs.siderolabs.com/talos/v1.13/overview/what-is-talos
- Talos FAQ describing no SSH/shell and API-driven management: https://docs.siderolabs.com/talos/v1.12/troubleshooting/faqs
- Talos source for the `copy` command, confirming the `cp` alias and local-directory extraction behavior: https://raw.githubusercontent.com/siderolabs/talos/main/cmd/talosctl/cmd/talos/copy.go
- Talos archiver source, confirming `.tar.gz` archive behavior and relative path extraction: https://raw.githubusercontent.com/siderolabs/talos/main/pkg/archiver/archiver.go

## Issues Found
- The post treated the local path for `talosctl cp` as a destination file path. Talos `copy`/`cp` extracts a `.tar.gz` archive into a local directory, so examples such as `./audit.log` would create or require a directory rather than write a single file. Updated the basic copy example and syntax to use a local directory.
- Several examples used `talosctl cp` where the intended result was raw file content in a local file. Replaced those with `talosctl read ... > file`, which matches the Talos CLI reference for reading individual files.
- The kernel log example copied `/proc/kmsg` as if it were a normal file. Replaced it with `talosctl dmesg`, the Talos command documented for retrieving kernel logs.
- The piped-output section said `talosctl cp ... -` sends file content to stdout. In Talos, `-` sends the `.tar.gz` archive to stdout. Updated the text and examples to use `talosctl read` for piping file content, and corrected the archive extraction example to use `tar xzf`.

## Review Notes
The `talosctl cp` name is technically valid because the current Talos source defines `cp` as an alias for `copy`, although the published CLI reference documents the command as `talosctl copy`. Future updates could mention both names explicitly, but the current post remains accurate after clarifying the archive and raw-read distinction.
