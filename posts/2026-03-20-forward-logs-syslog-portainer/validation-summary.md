# Validation Summary: How to Forward Container Logs to Syslog via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine logging drivers
- Docker Compose / Portainer stack YAML
- Syslog / RFC 5424
- rsyslog
- OpenSSL

## Sources Consulted
- Docker Docs: Syslog logging driver - https://docs.docker.com/engine/logging/drivers/syslog/
- Docker Docs: Customize log driver output - https://docs.docker.com/engine/logging/log_tags/
- Docker Docs: Compose file `services.logging` - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose `version` top-level element (obsolete) - https://docs.docker.com/reference/compose-file/version-and-name/
- rsyslog Docs: Using Rsyslog Docker Containers - https://www.rsyslog.com/doc/installation/rsyslog_docker.html
- rsyslog Docs: Rsyslog Containers / user-focused images - https://www.rsyslog.com/doc/containers/index.html
- rsyslog Docs: Property Replacer - https://www.rsyslog.com/doc/configuration/property_replacer.html
- rsyslog Docs: rsyslog Properties (`app-name`, `syslogtag`, `programname`) - https://www.rsyslog.com/doc/configuration/properties.html
- rsyslog Docs: `dynaFile` parameter - https://www.rsyslog.com/doc/reference/parameters/omfile-dynafile.html
- rsyslog Docs: imtcp module - https://www.rsyslog.com/doc/configuration/modules/imtcp.html
- rsyslog Docs: Reliable Forwarding - https://www.rsyslog.com/doc/tutorials/reliable_forwarding.html
- rsyslog Docs: TLS quick guide - https://www.rsyslog.com/doc/tutorials/tls.html
- rsyslog Docs: TLS mismatch FAQ / per-input TLS parameters - https://www.rsyslog.com/doc/faq/imtcp-tls-gibberish.html
- RFC 5424: The Syslog Protocol - https://www.rfc-editor.org/rfc/rfc5424

## Issues Found
- The `daemon.json` example contained a `//` comment inside a JSON block. JSON comments are invalid, so the example would not work as written. The comment was removed.
- The global and per-container tag patterns were inconsistent with the rsyslog routing example. The tags were normalized to `docker/{{.Name}}`, and the rsyslog template/filter were updated to route on RFC 5424 `APP-NAME` consistently.
- The rsyslog dynafile example extracted the wrong field from the tag and would not produce the `tail` path shown later in the post. The template was corrected to use the second slash-delimited `APP-NAME` field, matching the verification example.
- The per-container logging example used `syslog-hostname`, which is not a supported Docker syslog log-driver option. It was removed.
- A comment described `syslog-facility` as controlling facility and severity. Docker exposes `syslog-facility` there, not severity. The comment was corrected.
- The Compose examples used top-level `version: "3.8"`. Current Docker Compose treats `version` as obsolete and only informative. Those lines were removed.
- The rsyslog container example used `rsyslog/syslog_appliance_alpine:latest`, which is part of rsyslog’s deprecated historical appliance work rather than the current official user-focused images. It was replaced with `rsyslog/rsyslog`.
- The plain rsyslog server example exposed port `6514/tcp` without configuring a TLS listener in that step. The unused port mapping was removed from the basic deployment example.
- The SIEM forwarding example wrote to `/var/log/docker/all.log`, which did not match the mounted rsyslog volume path used elsewhere. It was changed to `/var/log/rsyslog/all.log`.
- The SIEM forwarding example enabled `queue.saveOnShutdown` without a queue filename/work directory setup for disk assistance. A work directory and queue filename were added to make the reliability example coherent.
- The TLS section mixed unsupported/incomplete rsyslog configuration: it loaded `gtls` incorrectly, referenced a CA file that was never created, and assumed client certs without generating or mounting them. The section was rewritten to use a valid TLS-enabled `imtcp` configuration, a self-signed server certificate with SAN, a CA copy for Docker trust, and the necessary rsyslog container port/certificate mount.
- The verification example used a tag/path combination that no longer matched the corrected rsyslog routing logic and did not force RFC 5424 formatting. The test command and `tail` path were updated accordingly.
- The conclusion said RFC 5424 "includes structured data" for the container metadata in this setup and that TCP "ensures delivery". Docker’s syslog driver provides standardized RFC 5424 header fields, but not the structured-data claim made here, and TCP only improves delivery guarantees relative to UDP. That language was corrected.

## Review Notes
- The post is technically valid after correction, but it assumes a Linux Docker host where `/etc/docker/daemon.json` and absolute host certificate paths are available.
- The title references Portainer, but the implementation uses Compose-style stack definitions. That is still compatible with Portainer stack deployments and does not require further correction.
