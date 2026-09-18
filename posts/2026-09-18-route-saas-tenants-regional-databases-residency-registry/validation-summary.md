# Validation Summary: Route SaaS Tenants to Regional Databases with a Residency Registry

## Status
validated

## Post Type
Technical architecture guide with Python and JSON examples.

## Technologies Covered
- Multi-tenant SaaS authorization and regional database routing
- Residency registries, deployment allowlists, and placement versions
- Python dataclasses and input validation
- JSON registry records
- Azure deployment stamps and multitenant control planes
- PostgreSQL 18 transaction locks and serialization retries
- Placement caches, connection pools, migration fencing, and background jobs

## Sources Consulted
- Microsoft Learn, Deployment Stamps pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/deployment-stamp
- Microsoft Learn, Considerations for multitenant control planes: https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/control-planes
- PostgreSQL 18, Explicit Locking: https://www.postgresql.org/docs/18/explicit-locking.html
- PostgreSQL 18, Serialization Failure Handling: https://www.postgresql.org/docs/18/mvcc-serialization-failure-handling.html
- Python, dataclasses: https://docs.python.org/3/library/dataclasses.html
- Python, Built-in Functions: https://docs.python.org/3/library/functions.html
- Python, Built-in Types (including bool and dictionary operations): https://docs.python.org/3/library/stdtypes.html
- OWASP, Multi Tenant Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
- OWASP, Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. The testing guidance said all denied requests must avoid opening a database connection. This conflicts with the proposed database-backed ownership check, which needs a connection to inspect and lock the tenant-serving record. Restricted the no-connection assertion to authorization and placement-resolution denials, and specified that regional fence rejections must not modify customer rows.
2. The migration test used transaction start time to identify the writer guaranteed to finish before the fence. Lock acquisition determines that ordering: a transaction that merely starts earlier can acquire the lock after fencing and must then reject the write. Changed the test to use a writer already holding the tenant-serving lock and to reject old-region writers acquiring it after the fence commits.

## Review Notes
- Executed the unchanged Python example with Python 3.13.1. The valid registry record returned the expected Placement; 16 malformed or invalid records raised PlacementUnavailable; unauthorized access raised PermissionError before record validation. Parsed the JSON example successfully.
- The exact integer type check correctly rejects booleans, which Python otherwise treats as integer instances. The dataclass and built-in APIs used are supported and not deprecated.
- Microsoft documentation supports tenant-to-stamp routing and control-plane responsibility for placement and lifecycle management. The article correctly identifies its version/fence protocol as application-specific.
- PostgreSQL 18 documentation supports conflicting row locks, transaction-end release, and whole-transaction serialization retries. A concrete implementation must preserve the lock through customer writes, including any savepoint/error-handling paths, and choose genuinely conflicting lock modes.
- The cache, allowlist, authorization, pool, and logging guidance is consistent with the stated architecture. The registry and authorization inputs are explicitly trusted prerequisites; the example does not implement authentication, network access, or the regional fence.
- The referenced documentation and author URLs resolved to their intended resources. There are no shell commands, vendor configuration schemas, or deprecated APIs to correct.
- Reviewed database concurrency behavior against documentation; no live database migration or race test was run because the article supplies no executable database implementation. Production cutover still requires coordinated destination activation, data synchronization, and participation by every writer.
