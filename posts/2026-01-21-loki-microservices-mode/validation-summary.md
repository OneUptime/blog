# Validation Summary: How to Set Up Loki in Microservices Mode

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Grafana Loki microservices mode
- Loki distributors, ingesters, queriers, query frontend, query scheduler, compactor, ruler, and index gateway
- Loki TSDB storage with S3-compatible object storage
- Kubernetes Deployments, StatefulSets, Services, ConfigMaps, probes, and persistent volume claims
- NGINX reverse proxy configuration
- Prometheus metrics and LogQL dashboard queries

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki deployment modes: https://grafana.com/docs/loki/latest/get-started/deployment-modes/
- Grafana Loki components reference: https://grafana.com/docs/loki/latest/get-started/components/
- Grafana Loki microservices Helm installation guide: https://grafana.com/docs/loki/latest/setup/install/helm/install-microservices/
- Grafana Loki large production deployment guidance: https://grafana.com/docs/loki/latest/operations/scalability/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki Docker installation documentation: https://grafana.com/docs/loki/latest/setup/install/docker/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The post pinned all Loki workloads to `grafana/loki:2.9.4`, which is outdated for a 2026 deployment guide. Updated the examples to `grafana/loki:3.7.0`, matching the current Loki documentation examples and verified Docker image.
- The sample Loki configuration used fields rejected by Loki 3.7.0: `limits_config.enforce_metric_name`, `ingester.max_transfer_retries`, and `compactor.shared_store`. Removed those fields after verifying the corrected configuration with `grafana/loki:3.7.0 -verify-config=true`.
- The guide deployed a separate query scheduler but did not configure the query frontend and querier worker to use it. Added `frontend.scheduler_address` and `frontend_worker.scheduler_address`, matching Loki's production guidance for separate query schedulers.
- The index gateway was deployed but the TSDB shipper client was not configured to use it. Added `storage_config.tsdb_shipper.index_gateway_client.server_address`.
- The query frontend used `downstream_url` for the querier even though the guide also deploys a query scheduler. Replaced it with `tail_proxy_url` so tail traffic can still be proxied to queriers while scheduled queries use the query scheduler.
- The NGINX gateway routed the `querier` upstream to the query frontend. Updated the `querier` upstream to `loki-querier:3100` so `/loki/api/v1/tail`, which Loki documents as a querier endpoint in microservices mode, reaches the correct component.
- The memberlist troubleshooting command attempted to fetch `http://localhost:7946/memberlist`, but memberlist port 7946 is a gossip TCP port, not an HTTP endpoint. Replaced it with a temporary `kubectl run` diagnostic pod that checks TCP connectivity to `loki-memberlist:7946`.

## Review Notes
- The corrected Loki configuration was validated with `grafana/loki:3.7.0 -verify-config=true` for the `distributor`, `ingester`, `query-frontend`, `querier`, `query-scheduler`, `compactor`, `index-gateway`, and `ruler` targets.
- The NGINX configuration was validated with `nginx:1.25-alpine nginx -t` using local host mappings for the Kubernetes service DNS names.
- `auth_enabled: true` means clients must send an `X-Scope-OrgID` tenant header or use an authenticating gateway in front of Loki. The post's configuration is valid, but production deployments should document tenant authentication and authorization explicitly.
- The article uses raw Kubernetes manifests. Grafana's official documentation generally recommends the Loki Helm chart for production Kubernetes deployments because it wires component services, caches, and operational defaults together.
