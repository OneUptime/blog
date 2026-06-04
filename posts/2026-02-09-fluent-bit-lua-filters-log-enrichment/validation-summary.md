# Validation Summary: How to Build Log Enrichment Pipelines with Fluent Bit Lua Filters in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Fluent Bit
- Fluent Bit Lua filter
- Fluent Bit Tail input
- Fluent Bit Loki output
- Kubernetes ConfigMaps and DaemonSets
- Lua
- Kubernetes container logs

## Sources Consulted
- Fluent Bit current Lua filter official documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/lua
- Fluent Bit 2.1 Lua filter official documentation: https://docs.fluentbit.io/manual/2.1/pipeline/filters/lua
- Fluent Bit Tail input official documentation: https://docs.fluentbit.io/manual/data-pipeline/inputs/tail
- Fluent Bit Kubernetes filter official documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Fluent Bit Loki output official documentation: https://docs.fluentbit.io/manual/pipeline/outputs/loki
- Fluent Bit official GitHub releases: https://github.com/fluent/fluent-bit/releases

## Issues Found
- The DaemonSet example pinned `fluent/fluent-bit:2.2`, which is outdated for a 2026 Kubernetes tutorial. Updated it to `fluent/fluent-bit:5.0.6`, matching the current official release stream checked during review.
- The basic Lua filter comments described return code `0` as "keep record" while returning `2`. Fluent Bit documents `0` as no modification, `1` as timestamp and record modified, `2` as record modified with timestamp unchanged, and `-1` as drop. Updated the comments to match the documented Lua filter API.
- The Tail input example used `Parser docker` for Kubernetes container logs. Current Fluent Bit Kubernetes examples use `multiline.parser docker, cri` for `/var/log/containers/*.log`, which handles both Docker and CRI/containerd log formats. Updated the example accordingly.
- The Kubernetes tag parsing example reversed pod and namespace and omitted the container ID portion of the standard `/var/log/containers/<pod>_<namespace>_<container>-<id>.log` filename-derived tag. Updated the Lua pattern and variable order.
- The Kubernetes tag parsing pattern did not allow hyphens in container names. Updated it to capture the container name before the final container ID suffix.
- The deployment-name extraction only returned the first hyphen-delimited token, which is incorrect for common hyphenated Deployment names. Updated it to derive the Deployment name from the common `deployment-hash-suffix` pod-name pattern.
- The conditional filtering example checked only a top-level `namespace` field, while the earlier enrichment code stores the namespace under `record["kubernetes"]["namespace"]` and also sets `environment`. Updated the filter to check the enriched Kubernetes namespace and production environment.
- The multiline example implemented buffering in a Lua filter, which can duplicate the first line, delay the current first line until a later event, and never flush the final buffered record. Replaced it with Fluent Bit's documented Tail `multiline.parser` configuration.

## Review Notes
- The post is technically relevant and remains a useful Fluent Bit Lua filter guide after the corrections.
- Stateful Lua examples such as rolling error-rate fields work only within the current Fluent Bit process and should not be treated as durable metrics across restarts or replicas.
