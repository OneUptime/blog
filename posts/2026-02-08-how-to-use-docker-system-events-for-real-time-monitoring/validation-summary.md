# Validation Summary: How to Use docker system events for Real-Time Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker Engine events
- Bash scripting
- jq
- Prometheus text exposition format
- Docker Compose labels

## Sources Consulted
- Docker CLI reference: docker system events: https://docs.docker.com/reference/cli/docker/system/events/
- Docker Engine API reference: System events endpoint: https://docs.docker.com/reference/api/engine/latest/
- Local Docker CLI help: `docker events --help`
- Local Docker Engine 29.4.2 / API 1.54 event output
- Prometheus exposition formats: https://prometheus.io/docs/instrumenting/exposition_formats/

## Issues Found
- The Image Events list included `build`, but current Docker Engine event documentation lists image events such as `delete`, `import`, `load`, `pull`, `push`, `save`, `tag`, `untag`, and `prune`. Replaced `build` with `load` / `save`.
- The Historical Events section implied arbitrary historical retrieval by time range. Docker documents that only the last 256 logged events are returned, so added that retention caveat.
- The Prometheus example appended one raw `docker_event_total ... 1` line per event, which can create duplicate samples for the same metric and label set in a single exposition. Replaced it with a Bash counter accumulator that rewrites the current Prometheus textfile metric with one sample per label set.

## Review Notes
The Docker CLI examples, filters, Go template fields, JSON event fields, `jq` selectors, and Compose label filtering were consistent with the official Docker documentation and local Docker Engine behavior. The auto-restart example is technically valid, but in production Docker restart policies or an orchestrator are usually preferable for restart management.
