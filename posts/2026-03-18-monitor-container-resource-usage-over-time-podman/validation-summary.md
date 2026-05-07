# Validation Summary: How to Monitor Container Resource Usage Over Time with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Bash
- jq
- Prometheus node_exporter textfile collector
- Container CPU, memory, network, and block I/O monitoring

## Sources Consulted
- Podman `podman-stats` official documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman `podman-run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Prometheus node_exporter official README, Textfile Collector section: https://github.com/prometheus/node_exporter#textfile-collector

## Issues Found
- The `podman stats --format json` parsing examples used non-documented JSON fields such as `mem_limit`, `net_input`, `net_output`, `block_input`, and `block_output`. Podman documents `mem_usage`, `netio`, and `blocki` as combined fields in JSON output. Updated the collector and dashboard examples to parse the documented fields and split combined values where needed.
- The alert script compared CPU and memory strings directly after removing `%`, which can fail when Podman reports unavailable stats as `--`. Added numeric sanitization so unavailable values become `0` before `awk` comparisons.
- The Prometheus exporter could emit invalid metric values when Podman reports `--`. Updated the jq expression to strip `%` and emit `0` for non-numeric values.
- The post described network usage monitoring without noting Podman's documented rootless limitation. Added a short caveat that rootless environments may not be able to report network usage statistics in `podman stats`.

## Review Notes
Podman was not installed in the local review environment, so CLI behavior was verified against official Podman documentation and jq filters were tested with sample JSON matching the documented output.
