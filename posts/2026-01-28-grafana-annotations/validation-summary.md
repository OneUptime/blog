# Validation Summary: How to Implement Grafana Annotations

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana annotations and Annotations HTTP API
- Grafana dashboard annotation queries
- Prometheus, PromQL, and recording rules
- Prometheus Alertmanager webhook receivers
- Loki annotation queries
- GitHub Actions
- GitLab CI
- Kubernetes Python client
- Flask, FastAPI, httpx, Redis, and Python datetime handling
- Bash, curl, and jq

## Sources Consulted
- Grafana Annotations HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/annotations/
- Grafana annotation visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/annotate-visualizations/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- Kubernetes Python client API reference: https://github.com/kubernetes-client/python/blob/master/kubernetes/README.md

## Issues Found
- The Alertmanager webhook example posted Alertmanager's webhook payload directly to Grafana's `/api/annotations` endpoint. Grafana expects an annotation JSON body, so the example now sends Alertmanager webhooks to the Flask annotation handler shown in the post.
- The Alertmanager route used the older `match` syntax. Updated it to `matchers` with `severity="critical"` to match current Alertmanager configuration guidance and UTF-8 matcher recommendations.
- The Prometheus deployment annotation example used a `deployment_timestamp` recording rule based on `timestamp(...)`, which would reflect sample timestamps rather than deployment events. Replaced it with `changes(kube_deployment_metadata_generation{namespace="production"}[5m])`, which represents deployment generation changes.
- The GitHub Actions and GitLab CI examples built JSON using shell string interpolation, which can break when commit messages or variables contain quotes or newlines. Updated both to build payloads with `jq -n` and pass an explicit millisecond timestamp.
- Python examples used `datetime.utcnow()`, which is deprecated in modern Python. Updated them to `datetime.now(timezone.utc)`.
- The FastAPI/Pydantic event model used a mutable dictionary literal as the default for optional metadata. Changed it to `None`.
- The dashboard tag-filtering example used a non-standard `filter` object. Updated it to Grafana's tag annotation query shape with `target.tags`, `target.matchAny`, and `type: "tags"`.
- The dashboard configuration example implied annotations are enabled through per-panel `options.annotations`. Grafana annotation queries are configured at the dashboard level and shown on supported visualization types, so the example was corrected accordingly.
- The custom annotation color snippet was marked as JSON but contained `//` comments, making it invalid JSON. Removed the comments.
- Removed a `step` field from the generic annotation performance snippet because annotation query options are data-source-specific and `limit` is the generally applicable control shown in Grafana annotation query exports.

## Review Notes
- The CI examples now depend on `jq` being available in the runner environment.
- Grafana dashboard JSON for annotation queries can vary across Grafana versions and data source plugins; the corrected examples use current documented behavior and common exported fields, but generated dashboard JSON should still be tested by importing it into the target Grafana version.
