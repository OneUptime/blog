# Validation Summary: How to Test Cursor Pagination for Missing, Duplicate, and Reordered Records

## Status
validated

## Post Type
Technical guide / API testing tutorial

## Technologies Covered
- Cursor and keyset pagination
- API pagination consistency models (live traversal and snapshot traversal)
- SQL row-value comparisons and deterministic ordering
- TypeScript
- Playwright Test and `APIRequestContext`
- Google AIP-158 and AIP-4233
- JSON:API v1.1 and the JSON:API Cursor Pagination Profile

## Sources Consulted
- [Google AIP-158: Pagination](https://google.aip.dev/158) — page-token opacity, page-size behavior, short and zero-result non-terminal pages, terminal signals, argument consistency, and token expiration.
- [Google AIP-4233: Automatic pagination](https://google.aip.dev/client-libraries/4233) — passing `next_page_token` back unchanged and terminating only when it is empty.
- [Google AIP-193: Errors](https://google.aip.dev/193) and [gRPC status codes](https://grpc.io/docs/guides/status-codes/) — error-model context; neither prescribes a cursor-specific status for malformed, tampered, or expired tokens.
- [JSON:API Cursor Pagination Profile](https://jsonapi.org/profiles/ethanresnick/cursor-pagination/) — unique ordering, cursor semantics, changing result sets, and optional snapshot-backed pagination.
- [JSON:API v1.1 pagination semantics](https://jsonapi.org/format/#fetching-pagination) — core pagination links and the strategy-agnostic `page` query-parameter family.
- [PostgreSQL row constructor comparisons](https://www.postgresql.org/docs/current/functions-comparisons.html#ROW-WISE-COMPARISON) and [`ORDER BY`](https://www.postgresql.org/docs/current/queries-order.html) — lexicographic tuple comparisons, null behavior, tie-breaking, and null placement.
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html) and [snapshot synchronization](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION) — stable snapshot behavior and the lifetime requirements of exported snapshots.
- [Playwright API testing](https://playwright.dev/docs/api-testing), [`APIRequestContext.get`](https://playwright.dev/docs/api/class-apirequestcontext#get), [`APIResponse`](https://playwright.dev/docs/api/class-apiresponse), and the [`request` fixture](https://playwright.dev/docs/api/class-fixtures#fixtures-request) — current request APIs and response handling.
- [Playwright `baseURL`](https://playwright.dev/docs/api/class-testoptions#test-options-base-url) and [custom expect messages](https://playwright.dev/docs/test-assertions#custom-expect-message) — relative request URL configuration and assertion syntax.
- [TypeScript `verbatimModuleSyntax`](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html) — explicit type-only import behavior.
- [ECMAScript relational comparison](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-islessthan) — JavaScript string comparison semantics used to assess the original joined-string comparator.

## Issues Found
1. The tuple keyset predicate was presented without stating its non-null assumption. PostgreSQL row comparison can evaluate to unknown when the decisive value is null, and `ORDER BY` has separate null-placement rules. Added a qualification requiring explicit null ordering and matching null-aware boundary logic for nullable keys.
2. The post said a client-selected sort definition had to be included in the cursor itself. A service can instead associate it with an opaque cursor in server-side state. Changed the guidance to require binding the cursor to the complete sort definition in either location and rejecting later sort changes.
3. The Playwright example used a relative URL and an undefined application-specific seed helper without stating its prerequisites. Documented the required `baseURL` configuration and helper contract, and made `APIRequestContext` an explicit type-only import for compatibility with `verbatimModuleSyntax`.
4. The page-size matrix allowed `N - 1` to become zero or negative for tiny fixtures. Qualified the matrix as applying to `N > 1`; the empty collection remains a separate case.
5. The cursor-error bullet implied a uniform client error for invalid, expired, and tampered cursors, although AIP-158 does not prescribe a status for those conditions. Made the assertion explicitly dependent on the API's documented response and described a client error as the normal expectation rather than a universal rule.
6. The mutation table referred to updating an "immutable" field and did not exclude fields that affect filtering. Changed it to a mutable field that affects neither sorting nor filtering. Also clarified that deleting an already-returned item does not cause a snapshot traversal to return that item again.
7. The snapshot guidance implied that carrying a snapshot identifier or version in a cursor is sufficient by itself. Changed it to require binding the cursor to a retained or reconstructible snapshot/version.
8. The post incorrectly said a set comparison detects duplicates. Sets erase duplicate occurrences. Corrected the explanation to track duplicates separately while using set comparison for missing or unexpected identities.
9. The ordering helper joined timestamp and ID strings and compared the result with JavaScript's string ordering. That does not reliably reproduce timestamp precision, time-zone normalization, null placement, or database collation. Replaced it with a comparator supplied by the API contract and documented its ordering convention.

## Review Notes
- The Playwright APIs and assertion forms used are current and not deprecated.
- The sample's `null` terminal cursor is valid for its declared application-specific response contract. AIP-158 itself uses an empty or omitted `next_page_token`, and the post correctly tells readers to follow their own API contract.
- AIP-158 expressly allows a non-terminal page to contain fewer results than requested, including zero, and allows `page_size` to change on subsequent requests while other RPC arguments remain the same.
- AIP-4233 concerns generated client-library iteration behavior; it does not establish record-integrity or snapshot guarantees.
- All cited documentation links and the author profile link were reachable at review time. No version-specific deprecations were found.
