# Validation Summary: How to Configure Network Timeout Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python requests
- urllib3 retries
- Go net/http
- PostgreSQL and psycopg2
- Redis and redis-py
- NGINX
- HAProxy
- Kubernetes Services, Ingress, and probes
- ingress-nginx
- HTTPX
- Prometheus metrics and alerting

## Sources Consulted
- Requests advanced usage documentation: https://requests.readthedocs.io/en/latest/user/advanced/
- HTTPX timeout documentation: https://www.python-httpx.org/advanced/timeouts/
- Redis redis-py production usage documentation: https://redis.io/docs/latest/develop/clients/redis-py/produsage/
- redis-py connection pool documentation: https://redis.readthedocs.io/en/stable/connections.html
- Go net/http package documentation: https://pkg.go.dev/net/http
- PostgreSQL client connection defaults: https://www.postgresql.org/docs/current/runtime-config-client.html
- PostgreSQL libpq connection parameters: https://www.postgresql.org/docs/current/libpq-connect.html
- psycopg2 connection pool documentation: https://www.psycopg.org/docs/pool.html
- NGINX ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- HAProxy configuration manual: https://docs.haproxy.org/2.4/configuration.html
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The Redis pool example used `redis.ConnectionPool` with `timeout=10` and described it as a timeout for waiting for a connection from the pool. In redis-py, that waiting behavior belongs to `BlockingConnectionPool`; the standard `ConnectionPool` raises when exhausted and passes extra keyword arguments to the connection class. Changed the example to `redis.BlockingConnectionPool`.
- The ingress-nginx example included `nginx.ingress.kubernetes.io/upstream-keepalive-connections` and `nginx.ingress.kubernetes.io/upstream-keepalive-timeout` as Ingress annotations. ingress-nginx documents proxy timeout annotations for Ingress resources, but upstream keepalive settings are ConfigMap options. Removed those invalid annotations from the Ingress example.
- The Go example said `http.Client.Timeout` overrides individual timeouts. Go documents it as a total request time limit that includes connection time, redirects, and reading the response body. Updated the comment to match that behavior.

## Review Notes
- Requests read timeouts and NGINX proxy read timeouts are inactivity timeouts between bytes or read operations, not necessarily total response-duration limits.
- The payment API example correctly warns that a timeout does not prove a payment failed; production code should use idempotency keys and a real status lookup.
