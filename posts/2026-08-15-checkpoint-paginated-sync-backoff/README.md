# Checkpoint Paginated Syncs Before Backoff

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Pagination, Data Sync, Checkpointing, Backoff, Cursors, Idempotency

Description: Commit each applied page and its next cursor together so a failed paginated sync resumes safely instead of starting over.

---

A paginated sync should not restart from page one whenever a later page fails. It should also never advance its cursor past data that was not committed locally.

The safe checkpoint is the provider-approved continuation state saved atomically with the effects of the page that produced it.

## Treat Page Tokens as Opaque State

Many APIs return a `next_page_token`, `nextLink`, or continuation token. Do not parse it, increment it, or synthesize a replacement. Google AIP-158 requires page tokens to be opaque and says request arguments other than `page_token` and `page_size` should remain consistent while paginating. Microsoft Graph likewise tells clients to use the returned `@odata.nextLink` without inspecting its state token.

A durable sync record might contain:

```sql
CREATE TABLE sync_checkpoint (
    sync_name text PRIMARY KEY,
    request_parameters jsonb NOT NULL,
    next_request_url text,
    completed boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
```

Storing the complete next URL is often safer when the provider returns one. It preserves encoded query state and avoids accidentally changing parameters.

## Commit Page Data and the Next Cursor Together

The core loop is below. Here, the API adapter exposes the provider-approved continuation as `page.next_url` and normalizes the provider's documented terminal signal to `None`; provider-specific retry-token exceptions are discussed below.

```python
async def run_sync(sync_name, initial_url):
    state = await checkpoints.load_or_create(sync_name)
    if state.completed:
        return
    next_url = state.next_request_url or initial_url
    failure_streak = 0

    while next_url is not None:
        try:
            page = await api.fetch_page(next_url)
        except RetryableApiError:
            delay = full_jitter(failure_streak)
            failure_streak += 1
            await asyncio.sleep(delay)
            continue  # Retry the same next_url.

        async with database.transaction() as tx:
            for item in page.items:
                await tx.upsert_item_idempotently(item)

            await tx.save_checkpoint(
                sync_name=sync_name,
                next_request_url=page.next_url,
                completed=page.next_url is None,
            )

        next_url = page.next_url
        failure_streak = 0
```

The order matters:

1. Fetch a page using the current durable cursor.
2. Apply its items idempotently.
3. Save the provider-approved continuation cursor in the same local transaction.
4. Only then request the next page.

If the process crashes before commit, it replays the current page. If it crashes after commit, it resumes from the next page. It never skips an unapplied page.

These guarantees require one active worker per `sync_name`. If workers can overlap, serialize them with a fenced lease or lock, or make the checkpoint update conditional on the cursor or version that the worker read. A failed conditional update must roll back the page transaction so a stale worker cannot move the checkpoint backward.

## Back Off the Failed Page, Not the Whole Sync

When fetching page 17 fails, retain the cursor for page 17 and retry that request after backoff. Do not overwrite the checkpoint with `null`, a guessed offset, or the cursor that led to page 16.

Provider-specific retry-token rules take precedence. Microsoft Graph directory paging says not to use an `@odata.nextLink` returned by a retry for a subsequent page because it can cause `DirectoryPageTokenNotFoundException`. For those APIs, retain the link from the last successful non-retry response—the link used for the retry—and make page application tolerate requesting it again.

Reset the failure streak only after the page is fetched, validated, and committed. Receiving headers or parsing half a streaming response is not a successful page.

Page size is not a reliable page number. An API may return fewer items than requested, or even an empty page with a nonempty continuation token. End the scan only according to the provider's documented terminal signal, commonly an empty next token.

## Expect Replay and Mutable Data

Pagination alone might not provide a stable snapshot while the source collection changes. Use the provider's snapshot, watermark, or delta API when available. Microsoft Graph delta queries return `@odata.nextLink` while a round has more pages and `@odata.deltaLink` when the round is complete. The delta link is then the checkpoint for the next synchronization round.

Even delta feeds can replay an item. Upsert by stable source identity, use source versions or update timestamps according to the API contract, and make delete handling idempotent.

Keep two levels of state distinct:

- The intra-round next-page cursor, updated after every committed page.
- The completed-round delta cursor or high-water mark, replaced only when the round finishes.

Do not publish a new completed-round watermark halfway through enumeration.

## Handle Expired or Invalid Cursors Explicitly

Providers can expire continuation tokens. AIP-158 permits reasonable expiry, and Microsoft Graph can return `410 Gone` when synchronization state must be rebuilt.

Define a recovery policy:

- retry transient network and server failures with the same cursor;
- treat invalid-argument responses as configuration or cursor errors, not transient failures;
- on a documented cursor-expired response, start a full snapshot or provider-defined resynchronization;
- keep the old local dataset active until the replacement snapshot commits.

Record the reason for a full restart so cursor expiry does not look like an ordinary retry storm.

## Official Documentation

- [Google AIP-158: Pagination](https://google.aip.dev/158)
- [Google Merchant API pagination](https://developers.google.com/merchant/api/guides/reports/paging)
- [Microsoft Graph paging](https://learn.microsoft.com/en-us/graph/paging)
- [Microsoft Graph delta query overview](https://learn.microsoft.com/en-us/graph/delta-query-overview)
- [Microsoft Graph list item delta API](https://learn.microsoft.com/en-us/graph/api/listitem-delta)

## Conclusion

Use the provider's opaque cursor unchanged, apply each page idempotently, and commit its effects with the provider-approved continuation state. On failure, back off and retry that same cursor; on expiry, follow an explicit full-resync path.
