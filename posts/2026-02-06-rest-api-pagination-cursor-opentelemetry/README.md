# How to Instrument REST API Pagination and Cursor-Based Queries with OpenTelemetry Span Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, REST API, Pagination, Span Attributes

Description: Instrument REST API pagination with OpenTelemetry span attributes to track page sizes, cursor depths, and query performance patterns.

Pagination is one of those features that seems simple until it is not. Offset-based pagination gets slower as users go deeper. Cursor-based pagination can be fast but hard to debug when cursors become invalid. Both approaches benefit from OpenTelemetry instrumentation that tracks how your consumers actually use pagination.

## Instrumenting Offset-Based Pagination

Start with the classic `?page=3&limit=50` approach:

```typescript
// offset-pagination.ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('pagination');

app.get('/api/products', async (req, res) => {
  return tracer.startActiveSpan('api.products.list', async (span) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    // Record pagination parameters as span attributes
    span.setAttribute('pagination.type', 'offset');
    span.setAttribute('pagination.page', page);
    span.setAttribute('pagination.limit', limit);
    span.setAttribute('pagination.offset', offset);

    // Track deep pagination - it usually indicates a problem
    if (page > 100) {
      span.addEvent('pagination.deep_page_access', {
        'pagination.page': page,
        'pagination.offset': offset,
        'warning': 'Deep pagination causes performance degradation',
      });
    }

    const startQuery = Date.now();
    const [products, totalCount] = await Promise.all([
      db.products.findMany({ skip: offset, take: limit }),
      db.products.count(),
    ]);
    const queryDuration = Date.now() - startQuery;

    // Record result metrics
    span.setAttribute('pagination.results_count', products.length);
    span.setAttribute('pagination.total_count', totalCount);
    span.setAttribute('pagination.total_pages', Math.ceil(totalCount / limit));
    span.setAttribute('pagination.has_more', offset + limit < totalCount);
    span.setAttribute('db.query_duration_ms', queryDuration);

    // Track the relationship between offset depth and query time
    // This helps identify when offset pagination is degrading
    span.setAttribute('pagination.ms_per_offset',
      offset > 0 ? queryDuration / offset : 0
    );

    res.json({
      data: products,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });

    span.end();
  });
});
```

## Instrumenting Cursor-Based Pagination

Cursor-based pagination avoids the deep-offset problem but introduces cursor management complexity:

```typescript
// cursor-pagination.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('pagination');

app.get('/api/orders', async (req, res) => {
  return tracer.startActiveSpan('api.orders.list', async (span) => {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const direction = (req.query.direction as string) || 'forward';

    span.setAttribute('pagination.type', 'cursor');
    span.setAttribute('pagination.limit', limit);
    span.setAttribute('pagination.direction', direction);
    span.setAttribute('pagination.has_cursor', !!cursor);

    // Decode and validate the cursor
    let decodedCursor: { id: string; createdAt: string } | null = null;
    if (cursor) {
      try {
        decodedCursor = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8')
        );
        span.setAttribute('pagination.cursor_decoded', true);

        // Track cursor age - old cursors might point to deleted data
        const cursorAge = Date.now() - new Date(decodedCursor!.createdAt).getTime();
        span.setAttribute('pagination.cursor_age_ms', cursorAge);

        if (cursorAge > 24 * 60 * 60 * 1000) {
          span.addEvent('pagination.stale_cursor', {
            'cursor_age_hours': cursorAge / (60 * 60 * 1000),
          });
        }
      } catch (error) {
        span.setAttribute('pagination.cursor_decoded', false);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Invalid cursor format',
        });
        span.addEvent('pagination.invalid_cursor', {
          'error': 'Failed to decode cursor',
        });

        return res.status(400).json({ error: 'Invalid cursor' });
      }
    }

    // Execute the query
    const queryStart = Date.now();
    const orders = await db.orders.findMany({
      take: limit + 1, // Fetch one extra to determine if there are more
      ...(decodedCursor && {
        cursor: { id: decodedCursor.id },
        skip: 1, // Skip the cursor element itself
      }),
      orderBy: { createdAt: direction === 'forward' ? 'asc' : 'desc' },
    });
    const queryDuration = Date.now() - queryStart;

    const hasMore = orders.length > limit;
    const results = hasMore ? orders.slice(0, limit) : orders;

    // Build the next cursor
    let nextCursor: string | null = null;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({ id: lastItem.id, createdAt: lastItem.createdAt })
      ).toString('base64');
    }

    span.setAttribute('pagination.results_count', results.length);
    span.setAttribute('pagination.has_more', hasMore);
    span.setAttribute('pagination.has_next_cursor', !!nextCursor);
    span.setAttribute('db.query_duration_ms', queryDuration);

    res.json({
      data: results,
      pagination: {
        nextCursor,
        hasMore,
      },
    });

    span.end();
  });
});
```

## Pagination Metrics for Dashboards

Track aggregate pagination patterns:

```typescript
// pagination-metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('pagination');

const pageDepth = meter.createHistogram('api.pagination.page_depth', {
  description: 'Distribution of pagination depth (page number or cursor sequence)',
});

const pageSize = meter.createHistogram('api.pagination.page_size', {
  description: 'Distribution of requested page sizes',
});

const paginationQueryTime = meter.createHistogram('api.pagination.query_time_ms', {
  description: 'Query execution time by pagination type and depth',
  unit: 'ms',
});

const invalidCursors = meter.createCounter('api.pagination.invalid_cursors', {
  description: 'Count of invalid or expired cursor submissions',
});

// Record in your middleware
function recordPaginationMetrics(type: string, depth: number, requestedSize: number, queryMs: number, route: string) {
  const attrs = {
    'pagination.type': type,
    'http.route': route,
  };

  pageDepth.record(depth, attrs);
  pageSize.record(requestedSize, attrs);
  paginationQueryTime.record(queryMs, attrs);
}
```

## Detecting Pagination Anti-Patterns

Use the span attributes to find problematic usage:

```typescript
// Common patterns to alert on:

// 1. Consumers scanning the entire dataset
// Look for sequences of cursor-based requests from the same consumer
// that iterate through thousands of pages
// Filter: pagination.has_cursor = true AND pagination.results_count > 0
// Group by consumer and count - if count > 500, they are likely scanning

// 2. Consumers requesting very small page sizes
// pagination.limit = 1 is almost always a bug
// Filter: pagination.limit < 5

// 3. Consumers requesting the maximum page size
// pagination.limit = 100 (the max) suggests they need a bulk export API
// Filter: pagination.limit >= 100

// 4. Deep offset pagination
// pagination.offset > 10000 means they are iterating deeply
// with offset pagination, which gets slower with depth
```

## Tracking Full Pagination Journeys

To understand complete pagination journeys (how many pages a consumer fetches in a session), link pagination requests with a session ID:

```typescript
app.get('/api/products', async (req, res) => {
  const span = trace.getActiveSpan();

  // Use a session/request ID to link pagination calls
  const paginationSession = req.headers['x-pagination-session'] || 'unknown';
  span?.setAttribute('pagination.session_id', paginationSession);

  // This lets you query your trace backend for all requests
  // in a pagination session and understand the full journey
});
```

Understanding how consumers paginate through your data tells you whether your API design is working. If most consumers fetch page 1 and stop, your defaults are fine. If they iterate through hundreds of pages, they need a different endpoint. OpenTelemetry attributes on every paginated request give you that insight.
