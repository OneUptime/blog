# How to Test Cursor Pagination for Missing, Duplicate, and Reordered Records

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, Pagination, Cursor Pagination, Data Integrity, Playwright, Test Automation

Description: Build deterministic cursor-pagination tests that expose skipped, duplicated, and reordered records without assuming an API offers snapshot consistency.

---

Cursor pagination is often introduced to avoid the shifting-window failures of offset pagination, but a cursor alone does not guarantee a correct traversal. The ordering must be deterministic, the cursor must represent the complete position in that order, and the API must define what happens when records change between page requests.

A useful test suite separates two questions:

1. Does an unchanged collection paginate exactly once, in order, from beginning to end?
2. Under concurrent inserts, deletes, and updates, does the behavior match the API's documented consistency model?

The second question matters because a live keyset traversal and a snapshot traversal can both be valid, but they make different promises. Do not label every record created during a walk as missing, or require a live view to behave like a database snapshot.

## Start with a Total, Stable Order

A cursor can only divide an ordered result set. A non-unique sort such as `created_at DESC` is not enough: several records can have the same timestamp. Use a unique tie-breaker and document both directions, for example:

```sql
ORDER BY created_at DESC, id DESC
```

The corresponding keyset predicate for the next page is conceptually:

```sql
WHERE (created_at, id) < (:cursor_created_at, :cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT :page_size_plus_one
```

The public cursor should still be opaque. Google AIP-158 says page tokens must be opaque and URL-safe; base64-encoding transparent implementation fields is not sufficient opacity. Tests should pass the token back unchanged, not decode it and build the next request themselves.

Seed records with deliberately awkward values:

- several identical `created_at` timestamps;
- IDs whose lexical and numeric order differ, if IDs are strings;
- records exactly at page boundaries;
- enough records for one full page, one partial page, and an empty collection; and
- Unicode and null values in any supported secondary sort fields.

An API that allows client-selected sorting must either include the full sort definition in its cursor or reject attempts to change it on later pages.

## Prove the Quiescent Baseline

First run with no writers. Read the authoritative expected IDs directly from the test database or fixture builder using the documented sort, then traverse the public API. This TypeScript example uses Playwright's request fixture:

```ts
import { test, expect, APIRequestContext } from '@playwright/test';

type Item = { id: string; createdAt: string };
type Page = { items: Item[]; nextCursor: string | null };

async function collectAll(request: APIRequestContext, pageSize: number) {
  const seen = new Set<string>();
  const items: Item[] = [];
  let cursor: string | undefined;

  for (let pageNumber = 0; pageNumber < 100; pageNumber++) {
    const response = await request.get('/v1/events', {
      params: {
        limit: pageSize,
        ...(cursor ? { cursor } : {}),
      },
    });
    expect(response.status()).toBe(200);

    const page = (await response.json()) as Page;
    for (const item of page.items) {
      expect(seen.has(item.id), `duplicate ${item.id}`).toBe(false);
      seen.add(item.id);
      items.push(item);
    }

    if (page.nextCursor === null) return items;
    expect(page.nextCursor, 'non-terminal page needs a cursor').toBeTruthy();
    expect(page.nextCursor).not.toBe(cursor);
    cursor = page.nextCursor!;
  }

  throw new Error('pagination did not terminate within 100 pages');
}

test('returns the fixed fixture exactly once in documented order', async ({ request }) => {
  const expectedIds = await seedEventsWithTiedTimestamps();
  const actual = await collectAll(request, 3);
  expect(actual.map(item => item.id)).toEqual(expectedIds);
});
```

Do not stop merely because a page contains fewer items than requested. AIP-158 explicitly permits a service to return fewer results, including zero, before the end; its end signal is an empty `next_page_token`. Use the end condition defined by your own contract.

Also guard against an infinite loop. A repeated non-terminal cursor, a bounded-page timeout, and a useful dump of page number, IDs, and cursor fingerprints turn a hang into a diagnosis. Log only a digest or safe prefix if cursors can contain protected state.

## Test Every Page Size and Boundary

For a fixture of `N` records, test sizes `1`, `2`, `N - 1`, `N`, `N + 1`, the documented default, and the documented maximum. Verify:

- concatenated IDs equal the authoritative ordered fixture;
- no ID appears twice;
- each adjacent pair follows the documented comparator;
- the final page uses the documented terminal signal;
- an empty collection terminates immediately; and
- invalid, expired, or tampered cursors produce the documented client error rather than a server error.

Changing filters, tenant, or sort direction while reusing a cursor should not silently cross query scopes. AIP-158 expects subsequent pagination arguments other than page size to match and recommends an invalid-argument error otherwise. If your API intentionally supports other behavior, encode that behavior in its contract and tests.

## Run Controlled Mutation Scenarios

Use a test hook or transaction barrier to pause immediately after page one has been materialized. Perform exactly one mutation, then continue with the returned cursor. Avoid timing-based races; they prove very little when the write sometimes lands before and sometimes after the query.

For descending `(created_at, id)` order, cover this matrix:

| Mutation after page one | Live keyset expectation | Snapshot expectation |
| --- | --- | --- |
| insert before the cursor | normally not observed in this forward walk | not observed |
| insert after the cursor | may be observed once | not observed |
| delete an item already returned | no duplicate and no unrelated skip | original snapshot item remains visible |
| delete an unseen item | item is absent; unrelated items remain once | original snapshot item remains visible |
| update an immutable, non-sort field | same identity remains once, representation depends on contract | snapshot representation remains |
| move an unseen item across the cursor by changing its sort key | behavior must be documented; a live walk can miss it | original snapshot position remains |
| move a returned item after the cursor | a naive live implementation can duplicate it | original snapshot position remains |

The last two cases reveal an important limitation: keyset pagination cannot by itself promise exactly-once traversal when the sort key is mutable. The service must use an immutable traversal key, preserve a snapshot/version in the cursor, or explicitly document live weak consistency. Tests should enforce the chosen promise, not an impossible combination.

## Detect Reordering, Not Just Duplicates

A set comparison catches missing and duplicate identities but loses order. Keep the full sequence and compare every adjacent pair using the same comparator as the contract. For descending timestamps with descending IDs:

```ts
function expectDescending(items: Item[]) {
  for (let i = 1; i < items.length; i++) {
    const previous = [items[i - 1].createdAt, items[i - 1].id];
    const current = [items[i].createdAt, items[i].id];
    expect(previous.join('\u0000') > current.join('\u0000')).toBe(true);
  }
}
```

In real code, implement the exact type-aware comparator rather than joining strings. Normalize timestamps only as the API specifies, and do not assume database collation equals JavaScript string ordering.

Run the same fixture repeatedly with randomized insertion order. A query that orders only by the non-unique timestamp may look stable on one database plan and reorder ties after an index, vacuum, or deployment change.

## Preserve Evidence on Failure

When a traversal fails, attach a compact page ledger:

```json
{
  "query": { "sort": "-createdAt,-id", "limit": 3 },
  "pages": [
    { "number": 1, "ids": ["e9", "e8", "e7"], "nextCursorHash": "sha256:..." },
    { "number": 2, "ids": ["e7", "e5", "e4"], "nextCursorHash": "sha256:..." }
  ],
  "duplicateIds": ["e7"],
  "missingFixtureIds": ["e6"],
  "mutation": "updated e7 createdAt after page 1"
}
```

This immediately distinguishes a bad boundary predicate from a test that misunderstood live updates. Include the declared consistency mode, fixture version, filter, sort, page size, and exact mutation barrier.

## Official Documentation

- [Google AIP-158: Pagination](https://google.aip.dev/158)
- [Google AIP-4233: Automatic pagination](https://google.aip.dev/client-libraries/4233)
- [JSON:API Cursor Pagination Profile](https://jsonapi.org/profiles/ethanresnick/cursor-pagination/)
- [JSON:API v1.1 pagination semantics](https://jsonapi.org/format/#fetching-pagination)
- [Playwright APIRequestContext](https://playwright.dev/docs/api/class-apirequestcontext)

## Conclusion

Reliable cursor-pagination tests begin with a deterministic total order and a quiescent exact-once baseline. Then they introduce one controlled mutation at each cursor boundary and judge the result against an explicit live or snapshot consistency contract. Tracking identity, order, termination, and mutation timing together exposes real pagination defects without demanding guarantees the API never made.
