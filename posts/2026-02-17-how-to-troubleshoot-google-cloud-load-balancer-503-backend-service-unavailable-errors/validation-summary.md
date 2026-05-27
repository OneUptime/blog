# Validation Summary: Troubleshoot Google Cloud Load Balancer 503 Backend Service Unavailable Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Load Balancing
- Google Cloud backend services
- Google Cloud health checks
- Google Cloud firewall rules
- Google Cloud URL maps
- Google Cloud CLI
- Cloud Logging
- Cloud Service Mesh circuit breakers

## Sources Consulted
- Google Cloud Load Balancing troubleshooting for external Application Load Balancers: https://cloud.google.com/load-balancing/docs/https/troubleshooting-ext-https-lbs
- Google Cloud Load Balancing logging and `statusDetails`: https://cloud.google.com/load-balancing/docs/https/https-logging-monitoring
- Google Cloud Load Balancing firewall rules: https://cloud.google.com/load-balancing/docs/firewall-rules
- Google Cloud Load Balancing health checks: https://cloud.google.com/load-balancing/docs/health-checks
- Google Cloud backend services overview: https://cloud.google.com/load-balancing/docs/backend-service
- Google Cloud URL maps overview and defaults: https://cloud.google.com/load-balancing/docs/url-map
- Compute Engine URL map REST resource: https://cloud.google.com/compute/docs/reference/rest/v1/urlMaps
- `gcloud compute backend-services update-backend` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update-backend
- `gcloud compute backend-services update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Cloud Service Mesh advanced traffic management circuit breakers: https://cloud.google.com/service-mesh/legacy/load-balancing-apis/configure-advanced-traffic-management

## Issues Found
- The opening explanation stated that a 503 means the load balancer could not even attempt to send the request to a backend. Updated it to reflect official logging behavior: load-balancer-generated 503s can come from backend selection, health, capacity, or backend connection failures, while backend-generated 5xx responses are identified by `response_sent_by_backend`.
- The cause list and URL map section implied that a URL map can simply have no matching backend and return 503. Updated this because URL maps use a default backend service, backend bucket, redirect, or route action when no host/path rule matches; the practical 503 risk is routing to an unintended or unhealthy default backend.
- The backend service inspection command requested a top-level `capacityScaler` field. Updated the projection to fields that exist at the backend service level; `capacityScaler` is per backend under `backends[]`.
- The capacity section described `maxConnections` and `maxRate` as hard rejection limits. Updated the text because backend balancing mode target capacities guide traffic distribution and zone preference; insufficient healthy capacity should be addressed by raising targets or scaling out.
- The circuit breaker section used `--connection-draining-timeout=300` as a circuit breaker fix. Replaced it with the documented export/edit/import workflow for backend service `circuitBreakers` values and clarified that this applies where circuit breaker policies are supported, such as Cloud Service Mesh.
- The logging section listed `no_healthy_backends` and `rate_limited` as `statusDetails` examples. Replaced them with documented load balancer failure strings, including `failed_to_pick_backend` and `failed_to_connect_to_backend`.

## Review Notes
The examples assume a global Application Load Balancer using instance group backends. Regional load balancers, serverless NEGs, hybrid NEGs, and passthrough Network Load Balancers have different firewall, backend, and health check details that would need separate handling in a broader guide.
