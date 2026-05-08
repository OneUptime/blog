# Validation Summary: How to Pull All Tags of an Image with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container images
- Container registries
- Docker Hub
- Quay.io
- Bash scripting

## Sources Consulted
- Podman `pull` official documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman `search` official documentation: https://docs.podman.io/en/stable/markdown/podman-search.1.html
- Podman `images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `rmi` official documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-rmi.1.html
- Quay registry v2 tag API checks for example repositories: https://quay.io/v2/coreos/etcd/tags/list and https://quay.io/v2/prometheus/prometheus/tags/list

## Issues Found
- The tag-count example used the default table output from `podman search --list-tags`, so `wc -l` would count the header row as a tag. Changed it to use Podman's documented Go-template formatting with `--format "{{.Tag}}"`.
- The tag-filtering scripts parsed the second table column with `awk`. This works with the documented default table output, but Podman officially exposes `.Tag` for `--list-tags`; changed the scripts to use `--format "{{.Tag}}"` directly.
- The "semantic version ranges" wording overstated the behavior of the regex, which only filters tags matching a major/minor version pattern. Updated the heading text and echo messages to describe the actual filtering.

## Review Notes
The local environment did not have the `podman` binary installed, so command execution was verified against official Podman documentation rather than local `--help` output. The post's warning about disk space and bandwidth is appropriate because `podman pull --all-tags` pulls all tagged images in the repository.
