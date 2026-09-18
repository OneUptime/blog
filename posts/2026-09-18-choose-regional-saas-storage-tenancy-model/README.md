# Data Residency Storage: Shared, Schema-per-Tenant, or Database-per-Region

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Residency, Database Architecture, Multi-Tenancy, PostgreSQL, SaaS

Description: Compare regional shared tables, tenant schemas, and regional databases without confusing logical tenant isolation with physical data placement.

---

Shared tables, separate schemas, and separate databases answer how tenants share a database system. Data residency answers where every relevant copy and processing path may exist. These are independent decisions.

A schema named `eu_customer` inside a database in another region has no geographic enforcement. Likewise, a database per tenant can still replicate its backups to an unapproved destination. Choose the regional footprint first, then choose the tenancy model inside it.

## Establish the Regional Unit of Deployment

Define an approved regional deployment that includes the database, application workers, queues, object storage, telemetry, and recovery destinations. Assign tenants to these deployments using a controlled placement process.

Microsoft's [multitenant storage guidance](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data) discusses sharing, isolation, scale, and operational tradeoffs. The [Deployment Stamps pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/deployment-stamp) lets a regional deployment serve one tenant or a group of tenants. Neither pattern makes an external export or backup automatically compliant.

Compare the options within one approved deployment:

| Model | Main advantage | Main operational cost | Residency implication |
| --- | --- | --- | --- |
| Shared tables with tenant IDs | Efficient pooling and centralized migrations | Every access path needs tenant isolation | Regional placement applies to all tenants in that store |
| Schema per tenant | Separate namespaces and some customization | Many schemas and repeated migrations | Schemas share the surrounding database's location and recovery footprint |
| Database per region | Clear regional operational boundary | Regional fleet management and application routing | Tenants inside the regional database still need isolation |
| Database per tenant within a region | Tenant-specific restore and maintenance options | Larger database, connection, and backup fleet | Location still depends on hosting and replica settings |

“Database per region” and “schema per tenant” can coexist. They are not mutually exclusive alternatives at the same architectural layer.

## Shared Tables Need Enforced Tenant Isolation

A shared regional database can be a practical choice when many tenants use the same schema and retention policy. Include a tenant key in relevant indexes, authorization checks, and relationships. Prevent a child row from referencing another tenant's parent by designing tenant-aware constraints.

PostgreSQL [row-level security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html) can enforce per-row policies, but superusers and roles with `BYPASSRLS` bypass them. Table owners normally bypass them unless `FORCE ROW LEVEL SECURITY` applies. These details matter when choosing the application's database role.

Test pooled connections for tenant-context leakage and run isolation tests under the actual application role. An administrative test session is poor evidence that application isolation works. RLS also does not move data or prevent an authorized application from exporting results elsewhere.

## Schemas Provide Namespaces, Not Regions

A schema per tenant can simplify naming and some tenant-specific customization. It creates migration and permission management work as the tenant count grows, and it does not make physical backups independent.

PostgreSQL explains that [schemas](https://www.postgresql.org/docs/18/ddl-schemas.html) organize objects within a database. Review `search_path` carefully: trusting a schema where another user can create objects can allow unexpected object resolution. Prefer fixed, reviewed identifiers and controlled privileges rather than building schema names directly from request input.

A per-tenant logical export may help migration, but rehearse it. Shared objects, extension dependencies, application files, and queue state can remain outside that schema.

## Regional Databases Simplify Some Boundaries

Operating distinct databases per approved region makes configuration and access review easier. Use distinct regional credentials and restrict each application deployment to its assigned stores.

However, a regional database is not automatically a tenant boundary. If many tenants share it, apply shared-table or schema isolation as appropriate. If a large tenant needs dedicated capacity or independent physical recovery, it can receive a dedicated database instance within the same approved region. In PostgreSQL, separate databases on a shared instance still share server resources and the physical backup and recovery boundary.

Review read replicas, analytical exports, backup destinations, database monitoring, and restore environments. A cross-region read replica is a second copy even when the primary remains correctly placed.

## Evaluate Recovery and Migration Before Cost

Ask how to restore one tenant without exposing or overwriting other tenants. A shared physical backup commonly contains several tenants; restoring it for one tenant creates a temporary copy of the others that also needs a permitted location and restricted access.

Measure schema migration duration, connection counts, noisy-neighbor effects, and operational work per tenant. Include the cost of regional observability, backups, capacity headroom, and disaster recovery. A model with fewer database instances can still be expensive to operate if selective recovery is difficult.

Document the selected combination explicitly: for example, “one deployment per approved region, shared tables for standard tenants, dedicated regional databases for tenants requiring independent restore.” Verify it with tenant-isolation tests, an actual recovery exercise, and a migration rehearsal. The correct choice is the one whose isolation and lifecycle behavior you can demonstrate at the required scale.
