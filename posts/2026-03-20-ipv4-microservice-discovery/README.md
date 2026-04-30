# How to Resolve IPv4 Addresses for Microservice Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microservice, IPv4, DNS, Service Discovery, Python, Networking

Description: Learn how to resolve IPv4 addresses for microservice discovery using DNS-based lookups, environment variables, and service registries, with retry and health-check patterns.

## DNS-Based Discovery

```python
import socket
import time
import logging

log = logging.getLogger(__name__)

def resolve_service(hostname: str, retries: int = 5, delay: float = 2.0) -> list[str]:
    """
    Resolve a service hostname to a list of IPv4 addresses.
    Retries on failure to handle DNS propagation delays at startup.
    """
    for attempt in range(1, retries + 1):
        try:
            results = socket.getaddrinfo(
                hostname,
                None,
                family=socket.AF_INET,
                type=socket.SOCK_STREAM,
                proto=socket.IPPROTO_TCP,
            )
            ips = list(dict.fromkeys(r[4][0] for r in results))
            log.info("Resolved %s → %s", hostname, ips)
            return ips
        except socket.gaierror as e:
            log.warning("DNS lookup failed for %s (attempt %d/%d): %s",
                        hostname, attempt, retries, e)
            if attempt < retries:
                time.sleep(delay)
    raise RuntimeError(f"Failed to resolve {hostname} after {retries} attempts")

# In Kubernetes, Services resolve via their cluster DNS name

ips = resolve_service("auth-service.default.svc.cluster.local")
```

## Environment Variable Discovery

```python
import os
import ipaddress

def get_service_address(env_var: str, default_host: str, port: int) -> tuple[str, int]:
    """
    Read service address from environment variable.
    Format: HOST:PORT or just HOST (port falls back to default).
    """
    value = os.environ.get(env_var, f"{default_host}:{port}")
    if ":" in value:
        host, port_str = value.rsplit(":", 1)
        return host.strip(), int(port_str)
    return value.strip(), port

db_host, db_port = get_service_address("DB_SERVICE_ADDR", "db.local", 5432)
auth_host, auth_port = get_service_address("AUTH_SERVICE_ADDR", "auth.local", 8080)
```

## Kubernetes: Headless Service + Client-Side Round-Robin

```yaml
# headless-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: worker
spec:
  clusterIP: None          # Headless - DNS returns the ready pod IPs
  selector:
    app: worker
  ports:
    - port: 8080
```

```python
import socket

# Headless service returns the ready pod IPs via DNS A records
pod_ips = list(dict.fromkeys(
    r[4][0]
    for r in socket.getaddrinfo(
        "worker.default.svc.cluster.local",
        None,
        family=socket.AF_INET,
        type=socket.SOCK_STREAM,
        proto=socket.IPPROTO_TCP,
    )
))
print("Worker pods:", pod_ips)
# ['10.244.1.5', '10.244.2.8', '10.244.3.12']
```

## Simple Round-Robin Client Pool

```python
import itertools

class ServicePool:
    def __init__(self, service_name: str, port: int):
        self.service_name = service_name
        self.port = port
        self._ips: list[str] = []
        self._cycle = None
        self.refresh()

    def refresh(self) -> None:
        import socket
        self._ips = list(dict.fromkeys(
            r[4][0]
            for r in socket.getaddrinfo(
                self.service_name,
                None,
                family=socket.AF_INET,
                type=socket.SOCK_STREAM,
                proto=socket.IPPROTO_TCP,
            )
        ))
        self._cycle = itertools.cycle(self._ips)

    def next_url(self) -> str:
        ip = next(self._cycle)
        return f"http://{ip}:{self.port}"

pool = ServicePool("auth-service.default.svc.cluster.local", 8080)
for _ in range(4):
    url = pool.next_url()
    print(url)
# http://10.244.1.5:8080
# http://10.244.2.8:8080
# http://10.244.3.12:8080
# http://10.244.1.5:8080
```

## Conclusion

DNS is the standard discovery mechanism in containerised environments - Kubernetes `Service` objects provide stable DNS names that resolve to a ClusterIP or, for headless services, to the set of ready pod IPs. Use environment variables for simpler deployments where a central registry is overkill. Always retry DNS lookups at startup to handle services that haven't registered yet. For production clients, combine DNS resolution with health checks and circuit breakers to route around unhealthy instances.
