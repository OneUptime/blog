# How to Implement Pagination in ClickHouse APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Pagination, Cursor Pagination, API Design, Performance

Description: Implement efficient cursor-based and offset pagination for ClickHouse APIs, handling the unique challenges of paginating over append-only analytical data.

---

## Pagination Challenges with ClickHouse

Traditional OFFSET pagination (`LIMIT 100 OFFSET 1000`) works but has a problem: ClickHouse must scan and discard the first 1,000 rows to return rows 1,001-1,100. For deep pagination over billions of rows, this becomes slow. Cursor-based pagination is more efficient.

## Offset Pagination (Simple Cases)

For small datasets or shallow pagination (first few pages), offset works fine:

```javascript
// GET /api/events?page=1&page_size=100
app.get('/api/events', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(500, parseInt(req.query.page_size) || 100);
  const offset = (page - 1) * pageSize;

  const [dataResult, countResult] = await Promise.all([
    client.query({
      query: `
        SELECT event_time, event_type, user_id
        FROM events
        WHERE toDate(event_time) = {date:Date}
        ORDER BY event_time DESC
        LIMIT {limit:UInt32} OFFSET {offset:UInt64}
      `,
      query_params: { date: req.query.date, limit: pageSize, offset },
      format: 'JSONEachRow',
    }),
    client.query({
      query: `SELECT count() AS total FROM events WHERE toDate(event_time) = {date:Date}`,
      query_params: { date: req.query.date },
      format: 'JSONEachRow',
    }),
  ]);

  const data = await dataResult.json();
  const [{ total }] = await countResult.json();

  res.json({
    data,
    pagination: {
      page,
      page_size: pageSize,
      total: parseInt(total),
      total_pages: Math.ceil(total / pageSize),
    },
  });
});
```

## Cursor-Based Pagination (Recommended for Large Datasets)

Use the last row's sort key as a cursor to avoid deep offsets:

```javascript
// GET /api/events/stream?cursor=2026-03-31T12:00:00_999999&limit=100
app.get('/api/events/stream', async (req, res) => {
  const limit = Math.min(1000, parseInt(req.query.limit) || 100);
  const cursor = req.query.cursor; // format: "datetime_rowid"

  let whereClause = 'WHERE event_time >= today() - 7';
  const queryParams = { limit };

  if (cursor) {
    const [cursorTime, cursorId] = cursor.split('_');
    whereClause += ' AND (event_time < {cursor_time:DateTime} OR (event_time = {cursor_time:DateTime} AND event_id < {cursor_id:UInt64}))';
    queryParams.cursor_time = cursorTime.replace('T', ' ');
    queryParams.cursor_id = parseInt(cursorId);
  }

  const result = await client.query({
    query: `
      SELECT event_time, event_id, event_type, user_id
      FROM events
      ${whereClause}
      ORDER BY event_time DESC, event_id DESC
      LIMIT {limit:UInt32}
    `,
    query_params: queryParams,
    format: 'JSONEachRow',
  });

  const data = await result.json();
  const lastRow = data[data.length - 1];
  const nextCursor = lastRow
    ? `${lastRow.event_time.replace(' ', 'T')}_${lastRow.event_id}`
    : null;

  res.json({
    data,
    next_cursor: data.length === limit ? nextCursor : null,
    has_more: data.length === limit,
  });
});
```

## Keyset Pagination for Time-Series Data

For purely time-ordered data, use the timestamp as the cursor:

```sql
-- Page 1: get events before a timestamp
SELECT event_time, event_type, user_id
FROM events
WHERE event_time < '2026-03-31 12:00:00'
ORDER BY event_time DESC
LIMIT 100;
```

```javascript
// Next page: use the last event_time as the next cursor
const nextCursor = data[data.length - 1]?.event_time;
```

## Summary

For ClickHouse API pagination, use offset pagination for small datasets and shallow pages (under 10,000 rows total offset). For large datasets or deep pagination, switch to cursor-based pagination using the ORDER BY key columns as the cursor. Cursor pagination avoids full scans of skipped rows and maintains consistent performance regardless of page depth.
