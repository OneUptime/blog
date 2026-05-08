# Validation Summary: How to Filter Images by Name with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container images
- Shell commands and Bash scripting
- Regular expressions

## Sources Consulted
- Podman `podman-images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman-image-exists` official documentation: https://docs.podman.io/en/latest/markdown/podman-image-exists.1.html

## Issues Found
- The post described `--filter reference=` patterns as glob or wildcard patterns, but the current Podman documentation says the `reference` filter accepts regular expressions. I changed the description and section heading from glob/wildcard language to regular expression language.
- Several `reference` filter examples used shell-style glob patterns such as `*nginx*`, `node*`, `python:*slim*`, and `*/nginx:*`. I changed them to valid regular expressions such as `.*nginx.*`, `node.*`, `python:.*slim.*`, and `(^|/)nginx:`.
- The `grep` examples searched the default `podman images` table output for `:tag` patterns, but the default table separates repository and tag into different columns. I changed those examples to use `--format "{{.Repository}}:{{.Tag}}"` before piping to `grep`.

## Review Notes
- Podman was not installed in the local environment, so command behavior was verified against the official Podman documentation rather than local `--help` output.
