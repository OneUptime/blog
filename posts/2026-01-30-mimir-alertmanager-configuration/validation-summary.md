# Validation Summary: How to Create Mimir Alertmanager Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Mimir
- Mimir Alertmanager
- Prometheus Alertmanager configuration
- Alertmanager notification templates
- Alertmanager API and silences
- amtool
- S3/object storage

## Sources Consulted
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir Alertmanager architecture: https://grafana.com/docs/mimir/latest/references/architecture/components/alertmanager/
- Grafana Mimir HTTP API reference: https://grafana.com/docs/mimir/latest/references/http-api/
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/
- Prometheus Alertmanager management API: https://prometheus.io/docs/alerting/latest/management_api/

## Issues Found
- The runtime configuration used `alertmanager.enabled`, which is not a Mimir Alertmanager configuration field. Replaced it with `target: all,alertmanager`, which is the documented way to include the optional Alertmanager component in a single-binary deployment.
- The runtime configuration used `max_config_size_bytes`, which is not a current Mimir Alertmanager field. Replaced it with `max_recv_msg_size`, the documented maximum accepted HTTP request body size.
- The runtime examples used an `alertmanager.cluster` block with `peers`, `listen_address`, and `peers_pattern`. Replaced those with the top-level `memberlist.join_members` configuration used by Mimir's hash-ring/memberlist gossip setup, and made the ring KV store use `memberlist` consistently in the example.
- Alertmanager route examples used deprecated `match` and `match_re` fields. Replaced them with `matchers` using current matcher syntax.
- Alertmanager inhibition examples used deprecated `source_match`, `target_match`, and `target_match_re` fields. Replaced them with `source_matchers` and `target_matchers`.
- The first routing tree said first match wins while also claiming platform critical alerts reach a nested platform route. Changed the top-level critical route to `continue: true` and updated the comment and flow diagram so the described routing behavior is possible.
- The Slack notification template used a `default` function that is not listed in Alertmanager's notification template functions. Replaced it with explicit `if`/`else` checks.
- The webhook HTTP client example used `bearer_token`, which is deprecated in Prometheus common HTTP client configuration. Replaced it with `authorization.credentials`.

## Review Notes
The post remains a technically relevant implementation guide. Local validation with `amtool` or `mimirtool` was not performed because neither binary is installed in this workspace; the review was completed against official Grafana Mimir and Prometheus Alertmanager documentation.
