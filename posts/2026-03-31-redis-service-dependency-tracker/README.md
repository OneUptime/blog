# How to Build a Service Dependency Tracker with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Service Dependency, Monitoring, Topology, Backend

Description: Build a Redis-backed service dependency tracker using sets and hashes to map service relationships and propagate health status through your dependency graph.

---

When a downstream service fails, every upstream service that depends on it may also degrade. A dependency tracker maps service relationships in Redis so you can quickly identify the blast radius of any failure.

## Registering Dependencies

Use Redis sets to record which services a given service depends on:

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def register_dependency(service: str, depends_on: str):
    """service depends on depends_on"""
    r.sadd(f"deps:{service}:needs", depends_on)
    r.sadd(f"deps:{depends_on}:required_by", service)

# Example topology
register_dependency("api-gateway", "auth-service")
register_dependency("api-gateway", "user-service")
register_dependency("user-service", "postgres-primary")
register_dependency("auth-service", "redis-cache")
```

## Querying the Dependency Graph

Get direct dependencies and dependents:

```python
def get_dependencies(service: str) -> set:
    return r.smembers(f"deps:{service}:needs")

def get_dependents(service: str) -> set:
    """Services that will be affected if this service fails"""
    return r.smembers(f"deps:{service}:required_by")
```

## Computing Blast Radius

Walk the dependency graph to find all transitively affected services:

```python
def get_blast_radius(service: str) -> set:
    affected = set()
    to_visit = list(r.smembers(f"deps:{service}:required_by"))
    while to_visit:
        current = to_visit.pop()
        if current not in affected:
            affected.add(current)
            to_visit.extend(r.smembers(f"deps:{current}:required_by"))
    return affected
```

## Tracking Service Health with Dependencies

Update health status and flag dependent services:

```python
def update_health(service: str, status: str, details: str = ""):
    r.hset(f"health:status:{service}", mapping={
        "status": status,
        "details": details,
        "updated_at": str(time.time()),
    })

    if status == "down":
        affected = get_blast_radius(service)
        for dep in affected:
            current = r.hget(f"health:status:{dep}", "status")
            if current != "down":
                r.hset(f"health:status:{dep}", mapping={
                    "status": "degraded",
                    "details": f"Dependency {service} is down",
                    "updated_at": str(time.time()),
                })
```

## Generating a Dependency Report

```python
def dependency_report(service: str) -> dict:
    direct_deps = get_dependencies(service)
    dep_statuses = {}
    for dep in direct_deps:
        dep_statuses[dep] = r.hgetall(f"health:status:{dep}") or {"status": "unknown"}

    return {
        "service": service,
        "status": r.hgetall(f"health:status:{service}") or {"status": "unknown"},
        "dependencies": dep_statuses,
        "blast_radius": list(get_blast_radius(service)),
    }
```

## Summary

Redis sets map bidirectional service relationships with O(1) insertion and O(N) retrieval via `SMEMBERS`. A graph traversal using `smembers` walks the dependency tree to compute blast radius. Automatically marking dependent services as degraded when a dependency goes down gives your on-call team immediate context for triage without manual investigation.

