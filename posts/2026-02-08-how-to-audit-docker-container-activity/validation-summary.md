# Validation Summary: How to Audit Docker Container Activity

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker daemon configuration and logging drivers
- systemd and journald
- Linux audit framework (`auditd`, `auditctl`, `ausearch`, `aureport`)
- Falco runtime security rules
- Bash, `jq`, and `curl`
- Filebeat and Elasticsearch

## Sources Consulted
- Docker CLI reference for `docker system events`: https://docs.docker.com/reference/cli/docker/system/events/
- Docker daemon logs documentation: https://docs.docker.com/engine/daemon/logs/
- Docker `json-file` logging driver documentation: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- Falco container deployment documentation: https://falco.org/docs/setup/container/
- Falco rules documentation: https://falco.org/docs/concepts/rules/
- Falco default/custom rules documentation: https://falco.org/docs/concepts/rules/default-custom/
- Falco default macros documentation: https://falco.org/docs/reference/rules/default-macros/
- Falco supported fields documentation: https://falco.org/docs/reference/rules/supported-fields/
- Elastic Filebeat `filestream` input documentation: https://www.elastic.co/guide/en/beats/filebeat/8.19/filebeat-input-filestream.html
- Local `docker events --help`, `journalctl --help`, `systemctl --version`, and live Docker event output

## Issues Found
- Docker events were described as records. Updated the wording to say Docker emits lifecycle events, and added the documented limitation that only the last 256 events are returned for historical queries. This matters for audit durability.
- The daemon logging snippet claimed to increase verbosity but used Docker's default `info` level. Changed `log-level` to `debug`.
- The Filebeat example used the older `log` input JSON settings. Updated it to the current `filestream` input with an `ndjson` parser, matching Elastic's current documented syntax.

## Review Notes
- The Docker exec event filter is valid: Docker treats repeated filters with the same key as OR, and live output confirmed `exec_create` and `exec_start` include `Actor.Attributes.execID`.
- The Falco custom rules rely on default macros such as `spawned_process`, `open_read`, `outbound`, and `container`, which are available when Falco loads its default rules before `/etc/falco/rules.d`.
- The Falco Docker Compose example is broadly consistent with privileged container deployment, but production deployments should pin the Falco image tag and choose the driver mode deliberately.
