# Route SaaS Tenants to Regional Databases with a Residency Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Residency, SaaS, Regional Routing, Database, Multi-Tenancy

Description: Route authorized tenants through a versioned residency registry, fail closed on unknown placement, and fence stale writers during migrations.

---

A tenant's database region should come from an authoritative placement record. It should not depend on the caller's nearest region, a browser cookie, or a freely supplied header. Those inputs are useful hints for discovery, but they cannot grant access to a regional database.

A residency registry maps a tenant identity to an approved deployment and placement version. The registry is one part of enforcement; regional authorization and write fencing complete the design.

## Give the Registry a Small Contract

Store a stable tenant reference, a deployment identifier, a placement version, and a lifecycle state. Keep connection credentials in the regional secret store. A registry response should select a known deployment, not provide an arbitrary database URL.

Microsoft's [Deployment Stamps guidance](https://learn.microsoft.com/en-us/azure/architecture/patterns/deployment-stamp) describes tenant-to-stamp mapping as a routing concern. Its [multitenant control-plane guidance](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/control-planes) places tenant allocation and lifecycle coordination in the control plane. The version and fence protocol below are an application design for handling stale state, not a built-in feature of those patterns.

An example registry record is:

```json
{
  "tenant_ref": "tenant-a81c",
  "deployment": "eu-production-2",
  "version": 7,
  "state": "active"
}
```

Treat registry data according to its classification. A pseudonymous tenant reference can still reveal commercial or personal information when linked elsewhere.

## Authenticate Before Resolving Placement

Verify the caller's authentication and tenant membership first. For a user who belongs to multiple tenants, an explicit tenant selection is acceptable only after authorization. Background jobs need a service identity and the same tenant authorization check.

This small Python example demonstrates placement selection. It assumes the caller supplied `authorized_tenants` from a verified authorization result and `record` from the trusted registry. It does not implement those two security boundaries:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Placement:
    deployment: str
    version: int

class PlacementUnavailable(Exception):
    pass

def resolve(tenant, authorized_tenants, record, deployments):
    if tenant not in authorized_tenants:
        raise PermissionError("tenant access denied")
    if not isinstance(record, dict):
        raise PlacementUnavailable("placement missing")
    if record.get("tenant_ref") != tenant:
        raise PlacementUnavailable("placement identity mismatch")
    if record.get("state") != "active":
        raise PlacementUnavailable("placement not serving")
    deployment = record.get("deployment")
    version = record.get("version")
    if not isinstance(deployment, str) or deployment not in deployments:
        raise PlacementUnavailable("deployment not approved")
    if type(version) is not int or version < 1:
        raise PlacementUnavailable("invalid placement version")
    return Placement(deployment, version)
```

Here, `deployments` is a server-maintained allowlist of deployment identifiers. The local deployment configuration determines its endpoint and credentials. A missing or malformed record fails closed; there is no default database.

## Check Placement Again at the Regional Database Boundary

A stale gateway can send an otherwise authenticated request to the old region. The regional service must verify that it is still permitted to serve that tenant and placement version.

For writes, make the check enforceable alongside the write itself. One implementation uses a tenant-serving record inside the regional database. Every writing transaction acquires the agreed lock on that record, then verifies its current ownership and placement version before changing customer rows. Hold the lock until commit or rollback. The migration controller obtains a conflicting lock, waits for existing writers to finish, and marks the tenant nonwritable before committing and releasing the lock. Handle serialization failures by retrying the entire transaction and checking ownership again.

This requires every writer to participate, including batch jobs and administrative tools. A check made once at process startup or outside the transaction leaves a race. The exact locks and transaction isolation depend on the database; PostgreSQL documents the relevant behavior in [explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html).

## Treat Caches as an Optimization

Cache placement with a bounded lifetime and include its version in downstream work. Invalidate it when a migration changes state, but do not rely on invalidation delivery as the sole safety mechanism.

On a version mismatch, discard cached state and resolve again. If the registry is unavailable and the regional write fence cannot establish valid ownership, reject the operation with a retryable availability error. A system that writes somewhere else to hide the outage has changed the residency policy.

Bind database pools to a deployment and credential identity. On migration, drain obsolete pools and reject old-version jobs. Never change the connection destination inside a transaction that already began on another database.

## Test Routing and Migration Races

Exercise unknown tenants, unauthorized tenant selection, unexpected deployment names, malformed records, stale versions, and unavailable registry reads. Verify that requests denied during authorization or placement resolution never acquire a customer database connection. Requests rejected by the database-backed regional fence must not modify customer rows.

Then test a writer that acquires the tenant-serving lock immediately before the migration fence, a delayed queue message, and a process that misses cache invalidation. The lock-holding writer must finish before the fence completes, and writers that acquire the lock after the fence commits must be rejected in the old region. Compare the acknowledged writes with destination records before activating the new placement.

Log the routing outcome and placement version without logging credentials or customer payloads. This makes stale-route incidents diagnosable while keeping the registry's role precise: it coordinates placement, and regional controls enforce it.
