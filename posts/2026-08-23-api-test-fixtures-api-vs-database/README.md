# Should API Tests Create Fixtures Through the API or Database?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, Testing, Database, Test Automation, Integration Test

Description: Choose between API-created and database-loaded fixtures based on the behavior under test, isolation needs, fidelity, speed, and maintenance cost.

---

There is no universal rule that all API test data must be created through the public API or that direct database setup is always faster and therefore better. The correct setup path depends on what the test is meant to prove.

Creating through the API exercises real validation, defaults, authorization, persistence, and side effects. Direct database setup can construct large or unusual states quickly and deterministically. It can also bypass essential application behavior and couple tests to storage internals. A mature suite uses an explicit policy, often with both approaches at different test layers.

## Start with the Test's Claim

Write one sentence describing what a failure means. Then choose setup that does not accidentally prove or hide that claim.

If a test claims that `POST /customers` validates an email and emits a customer-created event, the customer must be created through that endpoint. Inserting a customer row cannot prove the endpoint's behavior.

If a test claims that `GET /customers/{id}` returns a legacy customer imported five years ago, setup may reasonably load a carefully defined database state. The behavior under test is reading and representing the state, not public customer creation.

This distinction is more useful than labels such as integration or end-to-end, which teams often use differently.

## What API Setup Gives You

Using documented setup requests provides high fidelity. It normally exercises:

- request validation and authorization;
- application-generated IDs and defaults;
- normalization and derived values;
- database writes through the production persistence path;
- events, search indexing, cache invalidation, and audit records; and
- the same contract available to real clients.

Playwright's official API testing guide explicitly describes using API requests to prepare server-side state and validate postconditions. This approach reduces the chance that the test fixture represents a state the application could never create.

The costs are real. API setup can require a dependency chain such as organization, user, membership, project, and task. It may be slower, rate-limited, eventually consistent, or unable to create deliberately invalid and historical states. Setup failures can also obscure the behavior the test intended to check.

## What Direct Database Setup Gives You

Database loaders can insert many records efficiently, create exact timestamps and relationships, and produce boundary states that no public endpoint exposes. They are useful for migration tests, query behavior, pagination datasets, data repair, and compatibility with older schemas.

But a database row is not always an application fixture. A direct insert may bypass:

- service-layer validation and authorization;
- application defaults or generated identifiers;
- an outbox record or published event;
- cache and search-index updates;
- encryption or normalization performed by the application; and
- invariants maintained across several stores.

Database triggers still run for ordinary SQL that invokes them, but application code and external side effects do not. Document exactly which mechanisms the loader includes.

Direct setup also increases maintenance cost. A storage migration can break many tests even when the public API contract did not change. Treat fixture loaders as internal production-adjacent code with reviews, types, and compatibility tests.

## Use a Decision Table

| Test purpose | Preferred setup | Reason |
| --- | --- | --- |
| Create endpoint behavior | API | Creation itself is under test |
| Authorization and tenant membership | API or trusted policy fixture | Must establish legitimate identities and relationships |
| Read/update behavior for ordinary state | API by default | Highest confidence that state is reachable |
| Thousands of rows for pagination | Database loader or import path | Controlled volume without excessive setup calls |
| Historical or migration state | Database snapshot or migration fixture | Public API may no longer create it |
| Corrupt-state recovery | Isolated database fixture | Corruption should not be exposed through production API |
| Black-box acceptance test | Public API | Storage must remain an implementation detail |
| Repository/query integration test | Database | Persistence behavior is the subject |

Security boundaries deserve special care. Do not use a privileged direct insert to accidentally grant relationships that a real tenant administrator could not create. Authorization tests need credentials and memberships issued by a trusted path whose semantics are understood.

## Adopt a Hybrid Fixture Architecture

A useful design exposes intent through factories while allowing more than one implementation:

```typescript
type CustomerFixture = {
  id: string;
  tenantId: string;
  email: string;
};

interface CustomerFixtures {
  createOrdinaryCustomer(): Promise<CustomerFixture>;
  loadLegacyCustomer(version: number): Promise<CustomerFixture>;
  remove(customer: CustomerFixture): Promise<void>;
}
```

`createOrdinaryCustomer` should use the documented API because reachability matters. `loadLegacyCustomer` can use a versioned database loader because its purpose is to represent a historical state. Test cases ask for meaning rather than constructing SQL inline.

Keep database code behind these factories. Do not scatter table names and column lists throughout API tests. Version unusual fixtures and state which application or schema version produced them.

## Validate Database Fixtures Through the API

For every direct loader, maintain a small contract test that:

1. starts the real application and an isolated database;
2. loads the fixture;
3. reads it through the supported API;
4. checks required invariants and representation; and
5. exercises cleanup or migration where relevant.

This does not prove that the public API could create the state. It proves the fixture remains interpretable by the current application. If the system also depends on a search index or cache, either populate those through the supported mechanism or explicitly test the expected lazy rebuild. Do not quietly declare the fixture complete after inserting only one store.

## Isolate the Database, Not Just the Rows

Parallel tests make global truncation dangerous. PostgreSQL `TRUNCATE` takes an `ACCESS EXCLUSIVE` lock, can include referencing tables with `CASCADE`, and affects all rows in its target tables. It is inappropriate as per-test cleanup in a shared parallel database.

Safer options include:

- one disposable database or container per worker;
- one schema per worker when the application supports schema selection;
- unique tenant and run identifiers with targeted deletion;
- a transaction when all relevant operations share the same connection and transaction boundary; or
- a disposable environment for a test class with unusual storage needs.

Be precise about transaction rollback. A test transaction opened on the loader's connection cannot usually wrap requests handled by a deployed application using a separate connection pool. Uncommitted fixture rows may be invisible to the application, and rolling back the loader does not roll back application requests. Use rollback only when the architecture truly shares the transaction.

Testcontainers can provide throwaway database instances using real containerized database software. This improves isolation, but it does not remove the need to run migrations and wait until the application is ready.

## Keep Setup Failures Distinct

Create fixtures before the behavior assertion and fail with a clear setup phase. Capture returned IDs and register cleanup immediately after each successful state-changing action. Pytest's yield fixtures and Playwright fixtures both support setup followed by teardown.

If API setup becomes slow, measure where time is spent before replacing it wholesale. Common improvements include worker-scoped immutable prerequisites, smaller fixtures, parallel-safe factories, or a documented bulk import endpoint. Do not cache mutable fixtures across tests simply to reduce runtime.

## Establish a Team Policy

A concise policy might be:

1. use public APIs for black-box scenarios and whenever creation behavior matters;
2. permit database factories for volume, legacy, migration, and deliberately unreachable states;
3. prohibit inline SQL in high-level API tests;
4. verify direct fixtures through the running application;
5. isolate databases or namespaces for parallel execution; and
6. record which side effects each setup path intentionally bypasses.

Review exceptions during code review. The important outcome is not purity. It is knowing what each passing test actually proves.

## Official Documentation

- [Playwright API testing and server-side setup](https://playwright.dev/docs/api-testing)
- [Playwright fixtures](https://playwright.dev/docs/test-fixtures)
- [pytest fixture teardown](https://docs.pytest.org/en/stable/how-to/fixtures.html#teardown-cleanup-aka-fixture-finalization)
- [Testcontainers documentation](https://testcontainers.com/)
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL TRUNCATE](https://www.postgresql.org/docs/current/sql-truncate.html)

## Conclusion

Use the API when fixture creation is part of the behavior or when black-box fidelity is the priority. Use reviewed database factories for large, historical, migration, or deliberately unreachable states. Whichever path you choose, isolate it for parallel runs, validate its assumptions through the application, and state clearly what the test does and does not prove.
