# How to Deploy Drone's Beta HA Mode with PostgreSQL, Redis, and a Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, High Availability, PostgreSQL, Redis, DevOps

Description: Evaluate Drone beta high availability with shared PostgreSQL, Redis coordination, consistent server settings, and failure tests.

Drone's official high-availability documentation currently labels the feature **Beta** and cautions that it may be unsuitable for production workloads. Evaluate it against your required failure behavior before treating a second server replica as an availability guarantee. See the [HA overview](https://docs.drone.io/server/ha/overview/).

The documented design uses multiple Drone servers behind a load balancer, shared PostgreSQL persistence, and Redis for queueing and cross-server events. Redis participates in log streaming and cancellation as well as build dispatch, so its availability matters even when the web UI still loads.

## Build a representative staging deployment

Choose the exact Drone server and runner image versions you plan to operate. Record image digests, database versions, extension versions, and configuration. Start with an isolated Git organization and disposable pipelines that can safely be canceled or replayed.

Provision a PostgreSQL database and Redis endpoint reachable by all server instances. Use supported database releases with tested backup and restore procedures. Drone's [database documentation](https://docs.drone.io/server/storage/database/) describes the driver settings; its historical minimum-version statement should not be treated as a recommendation to deploy an obsolete database release.

Configure both servers consistently:

```text
DRONE_SERVER_HOST=drone.example.com
DRONE_SERVER_PROTO=https
DRONE_COOKIE_SECRET=<same-random-cookie-secret>
DRONE_RPC_SECRET=<same-runner-rpc-secret>
DRONE_DATABASE_DRIVER=postgres
DRONE_DATABASE_DATASOURCE=postgres://drone:<encoded-password>@postgres.internal:5432/drone?sslmode=verify-full
DRONE_REDIS_CONNECTION=redis://redis.internal:6379
```

Inject secrets through the deployment system rather than committing this populated file. Configure PostgreSQL certificate trust and hostname verification for the connection string. The Redis URL here illustrates the documented plaintext form on an isolated internal test network; verify authentication and encrypted transport support in the exact Drone Redis client before exposing traffic across a less trusted boundary.

Copy the required Git provider OAuth configuration and other server settings to both replicas. If database encryption is configured, both must also have the same encryption key. The public hostname must remain the same across replicas so callback URLs and user-facing links stay consistent.

## Put UI and runner traffic through the load balancer

A basic HAProxy backend can route requests to two servers:

```haproxy
defaults
  mode http
  timeout connect 5s
  timeout client 5m
  timeout server 5m

frontend drone
  bind :443 ssl crt /etc/haproxy/certs/drone.pem
  http-request set-header X-Forwarded-Proto https
  default_backend drone_servers

backend drone_servers
  balance roundrobin
  server drone1 10.10.0.11:80 check
  server drone2 10.10.0.12:80 check
```

This assumes TLS terminates at HAProxy and the backends are on a protected internal network. Supply a valid certificate and choose timeouts after testing runner polling and log streams. The `check` here is a TCP availability check, not a test of database or queue health. HAProxy's [backend guide](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/backends/) explains that distinction.

For networks requiring encryption to backend servers, configure verified backend TLS using HAProxy's [server-side encryption instructions](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/server-side-encryption/).

Point runners at the public load-balanced host using the appropriate RPC protocol and shared secret. Sending runners directly to one backend would leave that server as their single connection target even though browsers use the load balancer.

## Test the failures that affect builds

Run controlled fault tests while continuously starting harmless builds:

| Failure | Evidence to capture |
| --- | --- |
| One Drone server stops | New builds start, running builds report completion, login remains usable |
| Server dies during log streaming | Logs reconnect and remain associated with the correct build |
| Cancellation goes to another server | The executing runner receives cancellation and cleans up |
| Redis becomes unavailable | Dispatch and status errors are visible; recovery behavior is understood |
| PostgreSQL becomes unavailable | Writes fail visibly and recovery does not corrupt build records |
| Load balancer backend is removed | New requests avoid it while existing work behaves as expected |

Track duplicate execution and missing terminal statuses explicitly. Do not infer exactly-once delivery from a healthy dashboard. Deployment actions should be idempotent or have their own deduplication and reconciliation controls.

## Decide from observed recovery

Agree on acceptable build interruption, recovery time, and manual repair before the exercise. Two application replicas do not remove a single load balancer, Redis server, or PostgreSQL instance as a failure point. Their own failover designs need separate verification.

Adopt the topology only after representative tests meet those requirements and the beta risk is acceptable. Keep a documented fallback to the previously tested deployment, together with compatible database backups and configuration, rather than relying on an untested rollback during a queue or database incident.
