# Validation Summary: How to Monitor Image Events with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container image events
- Podman CLI filtering and formatting
- Bash scripting
- `jq`
- Webhook forwarding with `curl`

## Sources Consulted
- Podman events documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman pull documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman untag documentation: https://docs.podman.io/en/v5.3.1/markdown/podman-untag.1.html
- Podman rmi documentation: https://docs.podman.io/en/v4.4/markdown/podman-rmi.1.html
- Podman system df documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman images documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html

## Issues Found
- The post listed and filtered for an image event status named `build`, but current Podman `podman events` documentation does not list `build` as an image event status. I removed it from the event list, changed the build section to monitor image events that occur during builds, and updated the summary to list supported image event statuses.
- Several JSON-processing snippets used Docker-style event paths such as `.Actor.Attributes.name`, `.Actor.ID`, and lowercase `.time`. Podman's JSON Lines examples and format placeholders use top-level fields such as `.Status`, `.Time`, `.Name`, `.Image`, and `.ID`. I updated the `jq` expressions accordingly.
- The `podman untag myalpine:v2` example could remove all names from the referenced local image when no tag name argument is supplied. I changed it to `podman untag alpine:latest myalpine:v2`, matching the documented `podman untag image [name[:tag]...]` form.
- The tag-monitoring example started two background `podman events` processes without stopping them. I added PID capture, a short startup delay, and cleanup with `kill`.

## Review Notes
`podman` was not installed in the review environment, so command behavior was validated against official Podman documentation rather than local execution. The examples require `jq` for JSON parsing, and webhook forwarding requires `curl`.
