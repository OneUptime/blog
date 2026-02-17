# How to Set Up Session Affinity with Consistent Hashing on GCP Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Load Balancer, Session Affinity, Consistent Hashing, Backend Services, Google Cloud

Description: Configure session affinity using consistent hashing on Google Cloud Load Balancer to route related requests to the same backend for better cache hits and stateful workloads.

---

Load balancers distribute traffic across backends, but sometimes you need related requests to land on the same backend. Maybe your application maintains in-memory session state. Maybe you have per-instance caches that work best when the same user always hits the same server. Or maybe you are running a WebSocket application where connection persistence matters.

Google Cloud Load Balancer supports session affinity through consistent hashing, which maps requests to backends based on a hash of some request attribute - a cookie, an HTTP header, or the source IP. The consistent part means that when backends are added or removed, only a minimal number of sessions get redistributed, not all of them.

## How Consistent Hashing Works

Traditional hash-based load balancing takes a hash of some key (like the source IP) and uses modulo arithmetic to pick a backend. The problem is that when the number of backends changes, almost every session gets remapped.

Consistent hashing places backends on a virtual ring. Each request is also hashed onto the ring, and it gets routed to the nearest backend clockwise. When a backend is removed, only the requests that were mapped to that specific backend get redistributed - everyone else stays put. This is critical for stateful applications where session redistribution causes cache misses or disconnections.

## Session Affinity Options

Google Cloud Load Balancer offers several affinity methods:

- **Client IP affinity**: Hashes the client's IP address. Simple but breaks when clients are behind NAT (many users share the same IP).
- **Generated cookie affinity**: The load balancer sets a cookie on the first response. Subsequent requests with that cookie go to the same backend.
- **Header-based affinity**: Hashes a specific HTTP header value. Useful when you have a user ID or session ID in the headers.
- **HTTP cookie-based affinity**: Hashes a specific named cookie. Similar to generated cookie but uses your application's existing cookie.

## Configuring Client IP Affinity

The simplest form. Good for internal services where clients have unique IPs.

```bash
# Create a backend service with client IP session affinity
gcloud compute backend-services create my-stateful-backend \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=my-health-check \
  --session-affinity=CLIENT_IP \
  --global \
  --project=my-project

# Add backends
gcloud compute backend-services add-backend my-stateful-backend \
  --instance-group=my-instance-group \
  --instance-group-zone=us-central1-a \
  --global \
  --project=my-project
```

## Configuring Generated Cookie Affinity

The load balancer generates and manages the affinity cookie automatically.

```bash
# Create a backend service with generated cookie affinity
gcloud compute backend-services create my-cookie-backend \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=my-health-check \
  --session-affinity=GENERATED_COOKIE \
  --affinity-cookie-ttl=3600 \
  --global \
  --project=my-project
```

The `--affinity-cookie-ttl` sets how long the cookie is valid in seconds. After the TTL expires, the next request gets a new cookie and may land on a different backend.

## Configuring HTTP Cookie-Based Affinity with Consistent Hashing

This is the most flexible option. You specify which cookie to use for the hash, and the consistent hashing algorithm ensures stable session mapping.

```bash
# Create a backend service with HTTP cookie consistent hashing
gcloud compute backend-services create my-consistent-hash-backend \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=my-health-check \
  --session-affinity=HTTP_COOKIE \
  --consistent-hash-http-cookie-name=SESSIONID \
  --consistent-hash-http-cookie-ttl=86400 \
  --global \
  --project=my-project
```

This configuration hashes the `SESSIONID` cookie value. If the cookie does not exist in the request, the load balancer generates one.

## Configuring Header-Based Affinity with Consistent Hashing

Route based on a custom HTTP header, useful for API clients that send a user identifier.

```bash
# Create a backend service with header-based consistent hashing
gcloud compute backend-services create my-header-hash-backend \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=my-health-check \
  --session-affinity=HEADER_FIELD \
  --consistent-hash-http-header-name=X-User-ID \
  --global \
  --project=my-project
```

All requests with the same `X-User-ID` header value will go to the same backend. If the header is missing, requests get distributed normally without affinity.

## Configuring Minimum Ring Size

The minimum ring size controls how many virtual nodes each backend gets on the consistent hash ring. A larger ring size means more even distribution but uses more memory.

```bash
# Set a custom minimum ring size for more even distribution
gcloud compute backend-services update my-consistent-hash-backend \
  --consistent-hash-minimum-ring-size=1024 \
  --global \
  --project=my-project
```

The default ring size is 1024. For workloads with many backends (more than 50), increase this to 10240 or higher to avoid uneven distribution.

## Terraform Configuration

Here is a complete Terraform setup for consistent hashing with various affinity methods.

```hcl
# Backend service with HTTP cookie consistent hashing
resource "google_compute_backend_service" "cookie_affinity" {
  name                  = "cookie-affinity-backend"
  protocol              = "HTTP"
  port_name             = "http"
  health_checks         = [google_compute_health_check.default.id]
  session_affinity      = "HTTP_COOKIE"
  project               = "my-project"

  consistent_hash {
    http_cookie {
      name = "SESSIONID"
      ttl {
        seconds = 86400
      }
    }
    minimum_ring_size = 1024
  }

  backend {
    group           = google_compute_instance_group_manager.default.instance_group
    balancing_mode  = "UTILIZATION"
    max_utilization = 0.8
  }
}

# Backend service with header-based consistent hashing
resource "google_compute_backend_service" "header_affinity" {
  name             = "header-affinity-backend"
  protocol         = "HTTP"
  port_name        = "http"
  health_checks    = [google_compute_health_check.default.id]
  session_affinity = "HEADER_FIELD"
  project          = "my-project"

  consistent_hash {
    http_header_name  = "X-User-ID"
    minimum_ring_size = 2048
  }

  backend {
    group           = google_compute_instance_group_manager.default.instance_group
    balancing_mode  = "UTILIZATION"
    max_utilization = 0.8
  }
}

# Backend service with client IP affinity (for internal L4 LB)
resource "google_compute_region_backend_service" "ip_affinity" {
  name             = "ip-affinity-backend"
  protocol         = "TCP"
  health_checks    = [google_compute_health_check.tcp.id]
  session_affinity = "CLIENT_IP"
  region           = "us-central1"
  project          = "my-project"

  consistent_hash {
    minimum_ring_size = 1024
  }

  backend {
    group = google_compute_instance_group_manager.default.instance_group
  }
}
```

## Connection Draining

When a backend is removed (during scaling or updates), active sessions need time to complete. Configure connection draining to handle this gracefully.

```bash
# Set connection draining timeout to 5 minutes
gcloud compute backend-services update my-consistent-hash-backend \
  --connection-draining-timeout=300 \
  --global \
  --project=my-project
```

During the draining period, the backend stops receiving new requests but continues processing existing ones. This prevents session disruption during deployments.

## Combining Affinity with Capacity Balancing

Session affinity can create hotspots if some sessions are significantly heavier than others. Use capacity-based balancing to set upper limits.

```bash
# Configure max utilization so no backend gets overwhelmed
gcloud compute backend-services update-backend my-consistent-hash-backend \
  --instance-group=my-instance-group \
  --instance-group-zone=us-central1-a \
  --balancing-mode=UTILIZATION \
  --max-utilization=0.8 \
  --global \
  --project=my-project
```

When a backend exceeds 80% utilization, the load balancer starts routing new sessions to less busy backends, even if the hash would have sent them elsewhere. This prevents one backend from being overwhelmed by heavy sessions.

## Monitoring Session Distribution

Check how evenly sessions are distributed across backends.

```bash
# View backend utilization in Cloud Monitoring
gcloud monitoring time-series list \
  --project=my-project \
  --filter='metric.type="loadbalancing.googleapis.com/https/backend_request_count" AND resource.labels.backend_service_name="my-consistent-hash-backend"' \
  --interval-start-time=$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)
```

If you see significant imbalance, consider:
- Increasing the minimum ring size for better distribution
- Switching to a different affinity key that has more unique values
- Adding more backends to spread the load

## When Not to Use Session Affinity

Session affinity comes with trade-offs. It makes scaling less effective because new backends take a while to accumulate sessions. It creates hotspots when session distribution is uneven. And it makes rolling deployments trickier because draining sessions from old backends takes time.

If you can make your application stateless - by storing sessions in Redis or Memorystore, for example - you get better scalability and simpler operations. Use session affinity when statelessness is not practical, like in-memory caches, WebSocket connections, or legacy applications that require server-side session state.

Consistent hashing on Google Cloud Load Balancer gives you stable session routing with minimal disruption during scaling events. Choose the right affinity key for your use case, configure appropriate ring sizes, and always plan for what happens when backends change.
