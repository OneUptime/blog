# Validation Summary: How to Implement Idempotent Receiver

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Idempotent Receiver pattern
- Message queues and duplicate delivery handling
- TypeScript
- Node.js
- PostgreSQL
- node-postgres (`pg`)
- Redis / node-redis
- Mermaid diagrams
- node-cron

## Sources Consulted
- Enterprise Integration Patterns: Idempotent Receiver - https://www.enterpriseintegrationpatterns.com/patterns/messaging/IdempotentReceiver.html
- PostgreSQL `INSERT` documentation, including `ON CONFLICT` - https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL `SELECT` documentation, including row locking clauses - https://www.postgresql.org/docs/current/sql-select.html
- node-postgres transaction documentation - https://node-postgres.com/features/transactions
- Redis `SET` command documentation, including `EX` expiration option - https://redis.io/docs/latest/commands/set/
- Redis node-redis guide - https://redis.io/docs/latest/develop/clients/nodejs/
- Node.js `crypto` documentation - https://nodejs.org/api/crypto.html
- MDN `JSON.stringify()` reference - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
- node-cron getting started documentation - https://www.nodecron.com/getting-started.html

## Issues Found
- The post claimed an idempotent receiver guarantees each unique message is processed exactly once. Changed this to say each unique message produces the intended durable effect once, because idempotent receivers protect state from duplicate effects but do not generally guarantee exactly-once execution.
- The main TypeScript receiver could call `ROLLBACK` in the outer catch after it had already committed a failed-processing status. Added transaction state tracking so rollback is only attempted when the transaction is still open.
- The main TypeScript receiver treated an existing `processing` record as a successful duplicate with a `null` cached result. Changed it to throw so the queue can retry instead of acknowledging and potentially losing a message.
- The Redis cached receiver imported `createClient` without using it. Removed the unused import.
- The Redis cached receiver checked an existing idempotency row without a row lock and would fall through to process the message when the row existed but was not `completed`. Added `FOR UPDATE`, explicit handling for `completed` and `failed`, and an error for in-progress records.
- The Redis cached receiver used `setEx`; updated the examples to use Redis `SET` with the `EX` option, matching Redis' current recommended command form.
- The content-hash example implied all equivalent message content would always produce the same ID. Clarified that this applies to the same JSON-serializable representation.
- The composite-key example said retrying with a new version number was a benefit. Changed this to intentional reprocessing, since retries should reuse the same idempotency key.
- The natural key example included `attemptNumber`, which would create a new key per retry. Changed it to `paymentOperationId` so retries can reuse the same operation key.
- The pitfalls table recommended a short TTL on `processing` state. Changed this to retrying or expiring stale processing records, which better matches the implementation and avoids acknowledging in-progress work as a duplicate.

## Review Notes
The TypeScript code snippets were syntax-checked with the TypeScript compiler API. The examples remain illustrative and still depend on application-specific tables, queue acknowledgment behavior, external payment gateway semantics, and retry/dead-letter policy.
