# Validation Summary: Monitor Drone Queue Depth and Running Jobs with Built-In Prometheus Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Drone CI server metrics
- Prometheus scraping and HTTP authorization
- PromQL
- Prometheus alerting rules
- CI/CD queue monitoring and diagnosis

## Sources Consulted

- Drone Server Metrics: https://docs.drone.io/server/metrics/
- Drone Build API: https://docs.drone.io/api/builds/
- Drone Build Create API: https://docs.drone.io/api/builds/build_create/
- Drone Docker Pipeline configuration: https://docs.drone.io/yaml/docker/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus metric and label naming: https://prometheus.io/docs/practices/naming/

## Issues Found

- The example alert was named `DroneQueueGrowing`, but its expression only detects a pending-job count above a fixed threshold for a sustained period; it does not calculate whether the queue is growing. Renamed the alert to `DroneQueueBacklog` so its name accurately describes its behavior.

## Review Notes

- The four Drone queue metrics are documented by Drone, including the distinction between builds and pipeline jobs.
- The Prometheus `authorization` block with `type: Bearer` and `credentials_file` is current and valid.
- The alert thresholds are explicitly presented as examples and require environment-specific tuning.
- The HA warning is appropriately conditional because metric duplication depends on the deployment and scraping topology.
