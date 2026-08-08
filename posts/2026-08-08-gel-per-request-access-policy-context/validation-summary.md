# Validation Summary: Pass Per-request User Context to Gel Access Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Gel and legacy EdgeDB
- Gel Schema Definition Language and EdgeQL
- Gel globals and access policies
- Gel JavaScript/TypeScript client (`gel` package)
- TypeScript request handlers and connection pooling
- Gel transactions and automatic retries
- Gel Auth and application-managed authentication

## Sources Consulted
- [Gel JavaScript client reference](https://docs.geldata.com/reference/using/js/client) — `createClient()`, connection pools, `Client` query methods, `withGlobals()`, global merging, transactions, and retry behavior.
- [Gel globals reference](https://docs.geldata.com/reference/datamodel/globals) — settable and computed globals, optional cardinality, UUID values, and client configuration.
- [Gel access policies reference](https://docs.geldata.com/reference/datamodel/access_policies) — `allow all`, policy filtering, global-based policy context, and coalescing equality.
- [EdgeQL `SET` reference](https://docs.geldata.com/reference/reference/edgeql/sess_set_alias) and [UUID reference](https://docs.geldata.com/reference/stdlib/uuid) — valid `SET GLOBAL` syntax and UUID literals.
- [Gel Auth reference](https://docs.geldata.com/reference/auth) — internal JWT status, `ext::auth::client_token`, `ext::auth::ClientTokenIdentity`, and integration flow.
- [Gel connection parameters](https://docs.geldata.com/reference/using/connection), [server configuration](https://docs.geldata.com/reference/running/configuration), and [v5 upgrade guide](https://docs.geldata.com/resources/upgrading) — `GEL_*`/`EDGEDB_*` naming and the `gel`/`edgedb` package transition.
- [Gel permissions reference](https://docs.geldata.com/reference/datamodel/permissions) — separate roles and permissions for trusted server operations.
- [Official gel-js package metadata](https://github.com/geldata/gel-js/blob/master/packages/gel/package.json), [`Client` implementation](https://github.com/geldata/gel-js/blob/b4c93f5a027b18c421dd801768f296839f585ab7/packages/gel/src/baseClient.ts), and [session/global tests](https://github.com/geldata/gel-js/blob/b4c93f5a027b18c421dd801768f296839f585ab7/packages/gel/test/session.test.ts) — current package version and exports, pool sharing, immutable client configuration, unknown-global errors, and rejection of raw session commands by the application client.
- [RFC 8725: JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html) — protocol- and application-specific issuer and audience validation requirements.

## Issues Found
1. **Undeclared tenant global:** The request examples supplied `current_tenant_id` through `withGlobals()`, but the schema declared only `current_user_id`. Gel rejects unknown globals when a query runs. Added `global current_tenant_id: uuid;` and updated the optionality explanation to cover both globals.
2. **Missing transaction schema dependency:** The transaction example inserted an `AuditEntry`, but no such type was defined in the supplied schema. Added the minimal `AuditEntry` type with the `action` and `document_id` properties used by the example.
3. **Invalid UUID literal:** The REPL example cast the literal `'...'` to `uuid`, which is not executable. Replaced it with a valid illustrative UUID from the official `SET GLOBAL` example.
4. **Overbroad authentication-validation claim:** The post combined application-managed credential validation with Gel Auth and implied that every bearer-token path validates issuer, audience, session state, and revocation. Reworded the application-managed path to require protocol-appropriate checks, and documented Gel Auth's actual flow from `ext::auth::client_token` to the computed `ext::auth::ClientTokenIdentity` global without asking applications to parse Gel Auth's internal JWT.

## Review Notes
- The current published `gel` package reviewed was version 2.2.0. It exports both `createClient` and `Client`; the TypeScript imports and query method signatures in the post are current.
- The normal JavaScript client rejects raw session commands such as `SET GLOBAL` with `DisabledCapabilityError`. The post correctly presents `SET GLOBAL` as a REPL command and recommends `withGlobals()` for application code.
- The TypeScript snippets intentionally rely on surrounding application symbols such as `authenticate`, `documentId`, and `newTitle`; these are clear integration placeholders rather than incorrect APIs.
- All external documentation links in the post resolved to the intended current Gel pages.
