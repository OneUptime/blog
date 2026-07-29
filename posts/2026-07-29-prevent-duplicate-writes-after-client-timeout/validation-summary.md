# Validation Summary: How to Prevent Duplicate Writes When a Client Retries After Timing Out

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HTTP/1.1 APIs
- Idempotency keys
- Python UUID generation
- PostgreSQL transactions, primary keys, unique constraints, and `INSERT ... ON CONFLICT`
- Transactional outbox pattern
- Distributed-system retries and reconciliation

## Sources Consulted
- [Python `uuid` module documentation](https://docs.python.org/3/library/uuid.html#uuid.uuid4)
- [RFC 9110: HTTP Semantics, Section 9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [RFC 9112: HTTP/1.1 message body length, Section 6.3](https://www.rfc-editor.org/rfc/rfc9112.html#section-6.3)
- [PostgreSQL `INSERT` and `ON CONFLICT` documentation](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT)
- [PostgreSQL transaction isolation documentation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL unique constraints and primary keys documentation](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
- [Stripe idempotent requests documentation](https://docs.stripe.com/api/idempotent_requests)
- [AWS Well-Architected guidance: Make mutating operations idempotent](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_prevent_interaction_failure_idempotent.html)
- [Amazon EC2 client-token idempotency documentation](https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html)
- [AWS Prescriptive Guidance: Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [IANA HTTP Field Name Registry](https://www.iana.org/assignments/http-fields/http-fields.xhtml)
- [Expired IETF `Idempotency-Key` Internet-Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)

## Issues Found
- The raw HTTP/1.1 request included a JSON body without `Content-Length` or `Transfer-Encoding`. Under RFC 9112, that request would have a zero-length body. Added the correct `Content-Length: 58` framing header.
- The request hash was described as covering only normalized operation inputs. This could let the same tenant-level key and identical payload alias different operations. Changed the guidance to use a collision-resistant hash covering the method, canonical route, and every behavior-affecting parameter.
- The `INSERT ... ON CONFLICT DO NOTHING` retry branch implicitly assumed PostgreSQL's default `READ COMMITTED` isolation. Scoped the described fresh-snapshot behavior to `READ COMMITTED` and added the required whole-transaction retry caveat for serialization failures at stronger isolation levels.
- The immediate or bounded in-progress response policies could not be implemented directly by the blocking unique-index conflict shown in the single-transaction example. Clarified that those policies need separate coordination or a deliberately committed `processing` record.
- The abbreviated outbox transaction omitted the idempotency record, which could be misread as moving the business write and idempotency claim into different transactions. Clarified that the idempotency insert, business write, outbox event, stored response, and completion update must be committed together.
- The PUT/DELETE warning could be read as saying any non-idempotent internal side effect violates HTTP semantics. RFC 9110 defines idempotency in terms of the intended effect requested by the user. Reworded the warning to focus on endpoint implementations that repeat user-visible effects.

## Review Notes
- `Idempotency-Key` is a widely used API-specific field, but it is not registered in the IANA HTTP Field Name Registry as of the validation date; the IETF draft defining a standardized form expired on April 18, 2026. APIs should document their accepted field syntax and semantics.
- No product or library versions are pinned. The SQL syntax is current in PostgreSQL 18 and is also supported by earlier maintained PostgreSQL releases.
