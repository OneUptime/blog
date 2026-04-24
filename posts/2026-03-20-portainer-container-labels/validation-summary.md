# Validation Summary: How to Add Labels to Containers in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker
- Docker labels
- Docker Compose
- Traefik
- Prometheus
- Watchtower

## Sources Consulted
- Docker object labels: https://docs.docker.com/engine/manage-resources/labels/
- Docker `container ls` reference: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer add container docs: https://docs.portainer.io/sts/user/docker/containers/add
- Portainer view container docs: https://docs.portainer.io/user/docker/containers/view
- Portainer inspect container docs: https://docs.portainer.io/user/docker/containers/inspect
- Traefik Docker provider routing docs: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Prometheus configuration docs for `docker_sd_configs`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Watchtower container selection docs: https://containrrr.dev/watchtower/container-selection/
- Watchtower arguments docs: https://containrrr.dev/watchtower/arguments/

## Issues Found
- The Portainer UI instructions were too specific to a `Labels` tab. I changed them to refer to the advanced container settings and Labels section so the wording matches current Portainer documentation more closely.
- The container inspection steps described an `Inspect` tab with JSON visible immediately. I changed them to match Portainer's documented flow of selecting `Inspect` and using `Text` for the raw JSON view.
- The Traefik Compose example used a top-level `version: "3.8"` field. Docker now documents the top-level `version` element as obsolete, so I removed it and updated the example comment to `compose.yaml`.
- The Prometheus section originally implied that Prometheus directly scrapes containers based on those labels alone. I changed the wording to clarify that this is a custom label convention used with Prometheus Docker service discovery.
- The Prometheus example included `prometheus.port=9090` without any relabeling rule to rewrite `__address__`, so the example was incomplete. I removed that label and added `expose: "9090"` so Docker SD will discover a scrape target on the metrics port.
- The Watchtower section incorrectly described `com.centurylinklabs.watchtower.scope` as being for image pull credentials. I corrected the explanation so it now reflects Watchtower's documented enable, disable, and scope behavior.
- The Portainer-specific claim about filtering containers by label values in the UI was not supported by the official Portainer docs I checked. I rewrote that step to use the documented Docker CLI label filters instead.

## Review Notes
- Prometheus does not give special built-in meaning to `prometheus.*` container labels. Their behavior comes from the relabeling rules in `prometheus.yml`.
- `traefik.enable=true` is a valid Docker label for Traefik, but it is most meaningful when Traefik is configured with `exposedByDefault=false`.
- `com.centurylinklabs.watchtower.enable=true` is mainly useful when Watchtower is started with `--label-enable`; otherwise Watchtower monitors containers by default unless they are excluded.
