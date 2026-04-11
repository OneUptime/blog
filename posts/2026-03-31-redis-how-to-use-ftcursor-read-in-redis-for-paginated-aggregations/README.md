# How to Use FT.CURSOR READ in Redis for Paginated Aggregations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Cursor, Aggregation, Pagination

Description: Learn how to use FT.CURSOR READ in Redis to paginate through large FT.AGGREGATE result sets without loading all results into memory at once.

---

## What Is FT.CURSOR READ?

`FT.CURSOR READ` retrieves the next batch of results from an ongoing `FT.AGGREGATE` operation that was started with a cursor. Cursors allow you to paginate through large aggregation result sets incrementally, avoiding the need to load all results at once.

To use `FT.CURSOR READ`, you first initiate an aggregate query with the `WITHCURSOR` option, then call `FT.CURSOR READ` repeatedly until the cursor ID is 0.

## Related Commands

| Command | Purpose |
|---|---|
| `FT.AGGREGATE ... WITHCURSOR` | Start an aggregation and create a cursor |
| `FT.CURSOR READ index cursor_id [COUNT count]` | Fetch next batch of results |
| `FT.CURSOR DEL index cursor_id` | Destroy a cursor before it expires |

## Starting a Cursor-Based Aggregation

```bash
# Create an index
FT.CREATE orders ON HASH PREFIX 1 order: SCHEMA product TAG total NUMERIC region TAG

# Add data
HSET order:1 product "laptop" total 1200 region "us-east"
HSET order:2 product "phone" total 800 region "us-west"
HSET order:3 product "laptop" total 1100 region "eu"
HSET order:4 product "tablet" total 600 region "us-east"
HSET order:5 product "phone" total 750 region "eu"

# Start aggregation with cursor (return 2 results per batch)
FT.AGGREGATE orders "*" \
  GROUPBY 1 @product \
  REDUCE SUM 1 @total AS revenue \
  WITHCURSOR COUNT 2
```

Response:

```text
1) 1) 1) "product"
      2) "laptop"
      3) "revenue"
      4) "2300"
   2) 1) "product"
      2) "phone"
      3) "revenue"
      4) "1550"
2) (integer) 7891234   <- cursor ID (non-zero means more results)
```

## Reading Subsequent Batches

```bash
# Read next batch using the cursor ID
FT.CURSOR READ orders 7891234
```

```text
1) 1) 1) "product"
      2) "tablet"
      3) "revenue"
      4) "600"
2) (integer) 0   <- cursor ID 0 means no more results
```

When the returned cursor ID is 0, iteration is complete.

## Specifying Batch Size with COUNT

```bash
# Read up to 5 results per batch
FT.CURSOR READ orders 7891234 COUNT 5
```

The `COUNT` in `FT.CURSOR READ` can differ from the `COUNT` in the original `WITHCURSOR` clause.

## Python Example - Full Cursor Iteration

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def aggregate_with_cursor(r, index, query, groupby_field, reduce_field):
    """Run an aggregate query using cursor pagination."""
    all_results = []

    # Start aggregation with cursor
    response = r.execute_command(
        'FT.AGGREGATE', index, query,
        'GROUPBY', '1', f'@{groupby_field}',
        'REDUCE', 'SUM', '1', f'@{reduce_field}', 'AS', 'total',
        'WITHCURSOR', 'COUNT', '10'
    )

    results_batch = response[0][1:]  # Skip the count (first element)
    cursor_id = response[1]
    all_results.extend(results_batch)

    # Iterate until cursor exhausted
    while cursor_id != 0:
        response = r.execute_command('FT.CURSOR', 'READ', index, cursor_id, 'COUNT', '10')
        results_batch = response[0][1:]  # Skip the count
        cursor_id = response[1]
        all_results.extend(results_batch)

    return all_results

results = aggregate_with_cursor(r, 'orders', '*', 'product', 'total')
print(f"Total groups: {len(results)}")
for row in results:
    # Each row is a flat list: [field, value, field, value, ...]
    row_dict = dict(zip(row[::2], row[1::2]))
    print(f"  {row_dict}")
```

## Cursor Timeout

Cursors have a limited lifetime (default: 300 seconds). If you do not read or delete the cursor within the timeout, it is automatically cleaned up.

```bash
# Explicitly delete a cursor to free resources immediately
FT.CURSOR DEL orders 7891234
# Returns: OK
```

## Configuring Cursor Timeout

```bash
# Check current cursor timeout
FT.CONFIG GET CURSOR_MAX_IDLE
# Returns: 300000 (milliseconds = 300 seconds)

# Set to 60 seconds
FT.CONFIG SET CURSOR_MAX_IDLE 60000
```

## Error Handling in Python

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def safe_cursor_iteration(r, index, initial_response):
    """Safely iterate a cursor with error handling."""
    all_results = []

    results, cursor_id = initial_response[0][1:], initial_response[1]
    all_results.extend(results)

    while cursor_id != 0:
        try:
            response = r.execute_command('FT.CURSOR', 'READ', index, cursor_id, 'COUNT', '50')
            results = response[0][1:]
            cursor_id = response[1]
            all_results.extend(results)
        except redis.ResponseError as e:
            if 'Cursor not found' in str(e):
                print("Cursor expired - result set may be incomplete")
                break
            raise

    return all_results
```

## Summary

`FT.CURSOR READ` enables memory-efficient pagination through large `FT.AGGREGATE` result sets. By using the `WITHCURSOR` option in `FT.AGGREGATE` and then calling `FT.CURSOR READ` in a loop until the cursor ID is 0, you can process millions of aggregated results without exhausting memory. Always delete cursors explicitly with `FT.CURSOR DEL` when done early, and handle cursor expiration gracefully in production code.
