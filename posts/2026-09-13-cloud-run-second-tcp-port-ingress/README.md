# Route Multiple Endpoints Through One Cloud Run Service Port

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Run, Google Cloud, Networking, Docker, Serverless

Description: Understand Cloud Run service ingress, route compatible HTTP endpoints through one listener, and separate protocols that need direct TCP access.

---

A container listens on ports 8080 and 9000. Both work with local Docker port publishing, but only one is reachable after deployment to a Cloud Run service. Adding another `EXPOSE` line does not publish another external endpoint.

Cloud Run service ingress routes requests to one configured ingress container port. Other processes and sidecars can listen internally, but their listeners do not become additional public TCP ports.

## Separate the public endpoint from container ports

The public client calls a managed service URL over HTTPS. Cloud Run terminates TLS and forwards the request to the configured container listener. The ingress process must listen on the configured `PORT` on `0.0.0.0`. [Cloud Run container port configuration](https://docs.cloud.google.com/run/docs/configuring/services/containers).

A useful inventory is:

| Listener | Purpose | External access |
| --- | --- | --- |
| Configured ingress port | Application requests | Through the managed service endpoint |
| Local metrics port | In-instance collector | Internal to the instance |
| Local administration port | Process control | Internal unless you deliberately proxy it |
| Arbitrary TCP protocol port | A protocol such as a custom binary server | Requires a compatible ingress product |

Docker's `EXPOSE` instruction documents intended container ports; it does not itself publish them, even in ordinary Docker. Local `docker run -p` behavior is a different deployment model. [Docker EXPOSE reference](https://docs.docker.com/reference/dockerfile/#expose).

## Combine compatible HTTP routes

If port 8080 serves an API and port 9000 serves another HTTP endpoint, the simplest design may be one HTTP server with multiple routes.

This small illustrative Node.js server uses one listener:

```javascript
import http from 'node:http';

const port = Number(process.env.PORT || 8080);

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = new URL(req.url || '/', 'http://localhost').pathname;
  } catch {
    res.writeHead(400, {'Content-Type': 'text/plain'});
    res.end('bad request target');
    return;
  }

  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('ok');
    return;
  }

  if (req.method === 'GET' && pathname === '/api/version') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({version: 'example'}));
    return;
  }

  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.end('not found');
});

server.listen(port, '0.0.0.0');
```

This demonstrates routing only; add your application's authentication, authorization, logging, and readiness checks. Binding to the environment-provided port makes the server match the deployed container configuration. The [Node.js HTTP API](https://nodejs.org/api/http.html) documents the server and response methods.

A route name is not an access boundary. Moving an administration endpoint to `/admin` makes it reachable through ingress unless you enforce access control. Keep an internal-only control endpoint internal when it should never be exposed.

## Proxy to internal processes when necessary

If two existing applications cannot share a server, one ingress proxy can route selected paths to local listeners. For example:

```text
Managed HTTPS endpoint
  -> ingress proxy on PORT
     -> /api/* to local application on 8081
     -> /render/* to local renderer on 8082
```

Use an actual HTTP-aware proxy and configure path handling deliberately. Decide whether it preserves or strips the prefix, how it forwards headers, and how it handles streaming and request cancellation.

Multi-container instances let sidecars communicate locally. Configure startup dependencies and probes so the proxy does not advertise readiness while its required upstream is unavailable. [Deploy multi-container services](https://docs.cloud.google.com/run/docs/deploying#sidecars).

The proxy shares an instance's resource budget with its upstreams. Two paths with very different CPU, memory, or scaling needs may be better as separate Cloud Run services. Separate services also allow different IAM policies; path routing inside one service needs application-level authorization.

## Match the actual protocol

HTTP routing cannot transform every protocol into HTTP. A client that sends arbitrary bytes to a raw TCP socket cannot use an HTTPS URL without a protocol adapter.

Cloud Run supports gRPC through HTTP/2 configuration. For end-to-end HTTP/2, the container must accept cleartext HTTP/2 because Cloud Run terminates TLS. Configure and test the server accordingly. [HTTP/2 for Cloud Run services](https://docs.cloud.google.com/run/docs/configuring/http2).

WebSockets use an HTTP upgrade path and are supported, but Google advises against enabling HTTP/2 end-to-end for that setup. If a design mixes gRPC and WebSockets, verify the exact server and proxy capabilities; separate services are often clearer than assuming every protocol can share one configuration. [Cloud Run WebSocket guidance](https://docs.cloud.google.com/run/docs/triggering/websockets).

Long-lived streams also need deadlines and reconnect behavior. Moving a stream behind one port does not make it permanent or preserve process-local state after replacement.

## Keep local metrics local

A metrics server does not usually need its own external Cloud Run port. An in-instance collector can scrape a local listener and export samples. This avoids relying on external requests being load balanced to every individual instance.

Specify the correct local port and path in the collector configuration. The existence of a `/metrics` endpoint alone does not cause Cloud Monitoring ingestion. [Cloud Run Prometheus sidecar](https://docs.cloud.google.com/run/docs/monitoring-managed-prometheus-sidecar).

Treat metrics endpoints as application data. They may reveal internal names or traffic patterns, so decide explicitly whether a proxy should expose them.

## Recognize the worker-pool distinction

The single managed-ingress model described here applies to Cloud Run services. Current documentation provides Direct VPC ingress for Cloud Run worker pools, including private TCP connectivity to worker instances. That is a separate workload model with discovery and lifecycle considerations. [Cloud Run Direct VPC support](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc).

For an unchanged TCP client, evaluate worker pools, Compute Engine, or GKE against requirements such as private reachability, discovery, connection duration, and failover. Do not infer arbitrary TCP support for a Cloud Run service from another Cloud Run resource type's capabilities.

## Conclusion

Use one service listener for compatible HTTP routes, optionally with an internal proxy. Keep local endpoints local, and verify gRPC or WebSocket configuration explicitly. When the protocol requires direct TCP ingress, choose a workload that supports it instead of trying to publish another service port.

## Official Documentation

- [Configure Cloud Run service containers](https://docs.cloud.google.com/run/docs/configuring/services/containers)
- [Docker EXPOSE](https://docs.docker.com/reference/dockerfile/#expose)
- [Cloud Run HTTP/2](https://docs.cloud.google.com/run/docs/configuring/http2)
- [Cloud Run WebSockets](https://docs.cloud.google.com/run/docs/triggering/websockets)
- [Direct VPC networking](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc)
