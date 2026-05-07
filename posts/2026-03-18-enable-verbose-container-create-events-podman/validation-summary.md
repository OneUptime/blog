# Validation Summary: How to Enable Verbose Container Create Events in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- containers.conf
- Podman events
- journald
- jq
- SQLite
- Bash

## Sources Consulted
- Podman official documentation: `podman-events(1)` - https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman official documentation: `podman-container-inspect(1)` - https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman official documentation: `podman-run(1)` secrets option - https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Red Hat documentation: Using Podman events for auditing - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/

## Issues Found
- The post used Docker-style JSON paths such as `.Actor.Attributes.name`, `.Actor.Attributes.image`, and `.time`. Podman event JSON uses documented top-level fields such as `.Name`, `.Image`, `.Time`, `.Attributes`, and `.ContainerInspectData`. Updated the jq examples and shell scripts to use Podman's event fields.
- The examples that read recent historical events omitted `--stream=false`. Podman events stream by default, so those commands would continue waiting for new events instead of exiting after the matching historical events. Added `--stream=false` to non-monitoring examples.
- The post implied `podman info --format '{{.Host.EventLogger}}'` verified verbose create-event configuration. That only reports the event logger backend, not whether inspect data is attached to create events. Replaced those checks with commands that create a test container and print `{{.ContainerInspectData}}`.
- The post described verbose create events without a version caveat. Official Red Hat documentation states this auditing capability begins with Podman v4.4. Added the Podman 4.4 and later qualification.
- The label extraction example looked for synthetic `label_` attributes under `.Actor.Attributes`. Verbose Podman create events include inspect data, so labels should be read from `.ContainerInspectData.Config.Labels`. Updated the audit script accordingly.
- The SQLite example manually interpolated JSON into an SQL statement after escaping only single quotes. Updated the example to use SQLite CLI parameters so event JSON, image names, and container names are stored more safely.
- The security snippet attempted to chmod `{{.Store.EventsLogFilePath}}`, which is not a reliable generic Podman info field and does not apply to the default journald event logger. Replaced it with accurate guidance to restrict the file events log when using the file logger or restrict journal access when using journald.

## Review Notes
Podman was not installed in the local environment, so commands could not be executed here. The review was performed against official Podman documentation and Red Hat's Podman auditing documentation.
