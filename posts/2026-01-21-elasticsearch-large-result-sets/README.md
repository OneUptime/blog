# How to Handle Large Result Sets in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Pagination, Scroll, Search After, Point In Time, Large Data

Description: A comprehensive guide to handling large result sets in Elasticsearch using scroll, search_after, and Point In Time (PIT) APIs for efficient data retrieval and export.

---

Retrieving large amounts of data from Elasticsearch requires special techniques. The standard from/size pagination has a 10,000 document limit and becomes inefficient for deep results. This guide covers the right approaches for different large result set scenarios.

## Understanding the Problem

### Default Pagination Limits

```bash
# Default limit is 10,000
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "from": 9990,
    "size": 100
  }'
# Error: Result window is too large
```

### Why Deep Pagination is Expensive

With from/size:
1. Each shard returns `from + size` documents
2. Coordinating node collects all results
3. Sorts globally and discards `from` documents
4. For from=10000, size=10: each shard returns 10,010 docs

## Increasing max_result_window (Not Recommended)

```bash
# Can increase limit but not recommended
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.max_result_window": 50000
  }'
```

**Warning**: This increases memory usage and query time significantly.

## Search After

### How It Works

search_after uses sort values from the last result to fetch the next page. Efficient for user-facing pagination.

### Basic Usage

```bash
# First page
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 100,
    "sort": [
      { "created_at": "desc" },
      { "_id": "asc" }
    ],
    "query": {
      "match": { "category": "electronics" }
    }
  }'

# Response includes sort values for last document
# "sort": ["2024-01-15T10:30:00.000Z", "abc123"]

# Next page - use sort values from last result
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 100,
    "sort": [
      { "created_at": "desc" },
      { "_id": "asc" }
    ],
    "search_after": ["2024-01-15T10:30:00.000Z", "abc123"],
    "query": {
      "match": { "category": "electronics" }
    }
  }'
```

### Tiebreaker Field

Always include a unique tiebreaker field in sort:

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 100,
    "sort": [
      { "price": "desc" },
      { "_id": "asc" }
    ]
  }'
```

Without a tiebreaker, documents with the same sort value may be skipped or duplicated.

### Limitations of search_after

- Results can change between pages (refreshes)
- Cannot jump to specific page
- Must process pages sequentially

## Point In Time (PIT)

### How It Works

PIT creates a consistent snapshot view of the index. Combined with search_after, provides reliable pagination.

### Create PIT

```bash
curl -X POST "https://localhost:9200/products/_pit?keep_alive=5m" \
  -u elastic:password
```

Response:

```json
{
  "id": "46ToAwMDaWR5BXV1aWQyKwZub2RlXzMAAAAAAAAAACoBYwADaWR4..."
}
```

### Search with PIT

```bash
# First page
curl -X GET "https://localhost:9200/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "pit": {
      "id": "46ToAwMDaWR5BXV1aWQyKwZub2RlXzMAAAAAAAAAACoBYwADaWR4...",
      "keep_alive": "5m"
    },
    "size": 100,
    "sort": [
      { "created_at": "desc" },
      { "_id": "asc" }
    ],
    "query": {
      "match_all": {}
    }
  }'

# Next page
curl -X GET "https://localhost:9200/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "pit": {
      "id": "46ToAwMDaWR5BXV1aWQyKwZub2RlXzMAAAAAAAAAACoBYwADaWR4...",
      "keep_alive": "5m"
    },
    "size": 100,
    "sort": [
      { "created_at": "desc" },
      { "_id": "asc" }
    ],
    "search_after": ["2024-01-15T10:30:00.000Z", "abc123"],
    "query": {
      "match_all": {}
    }
  }'
```

### Delete PIT

Always clean up when done:

```bash
curl -X DELETE "https://localhost:9200/_pit" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "id": "46ToAwMDaWR5BXV1aWQyKwZub2RlXzMAAAAAAAAAACoBYwADaWR4..."
  }'
```

### PIT Advantages

- Consistent results across pages
- No documents skipped or duplicated
- Works with search_after for efficient pagination
- Survives index refreshes

## Scroll API

### How It Works

Scroll maintains a search context for batch processing. Best for data exports and reindexing.

### Basic Scroll

```bash
# Initial request
curl -X POST "https://localhost:9200/products/_search?scroll=5m" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 1000,
    "query": {
      "match_all": {}
    }
  }'

# Response includes scroll_id
# "_scroll_id": "FGluY2x1ZGVfY29udGV4dF91dWlkDnF1ZXJ..."

# Subsequent requests use scroll_id
curl -X POST "https://localhost:9200/_search/scroll" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "scroll": "5m",
    "scroll_id": "FGluY2x1ZGVfY29udGV4dF91dWlkDnF1ZXJ..."
  }'
```

### Clear Scroll

```bash
# Clear specific scroll
curl -X DELETE "https://localhost:9200/_search/scroll" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "scroll_id": "FGluY2x1ZGVfY29udGV4dF91dWlkDnF1ZXJ..."
  }'

# Clear all scrolls
curl -X DELETE "https://localhost:9200/_search/scroll/_all" \
  -u elastic:password
```

### Scroll vs PIT

| Feature | Scroll | PIT + search_after |
|---------|--------|--------------------|
| Consistency | Yes | Yes |
| Sorting | No custom sort | Any sort |
| Resource usage | Higher | Lower |
| Parallel requests | No | Yes |
| Use case | Batch export | Real-time pagination |

**Recommendation**: Use PIT + search_after instead of scroll for new applications.

## Complete Export Example

### Python Export with PIT

```python
from elasticsearch import Elasticsearch
import json

es = Elasticsearch(['localhost:9200'])

def export_all_documents(index_name, output_file):
    # Create PIT
    pit_response = es.open_point_in_time(
        index=index_name,
        keep_alive='5m'
    )
    pit_id = pit_response['id']

    search_after = None
    total_exported = 0

    try:
        with open(output_file, 'w') as f:
            while True:
                # Build query
                query = {
                    'pit': {
                        'id': pit_id,
                        'keep_alive': '5m'
                    },
                    'size': 1000,
                    'sort': [{'_id': 'asc'}],
                    'query': {'match_all': {}}
                }

                if search_after:
                    query['search_after'] = search_after

                # Execute search
                response = es.search(body=query)
                hits = response['hits']['hits']

                if not hits:
                    break

                # Write to file
                for hit in hits:
                    f.write(json.dumps(hit['_source']) + '\n')

                total_exported += len(hits)
                search_after = hits[-1]['sort']

                print(f"Exported {total_exported} documents...")

    finally:
        # Clean up PIT
        es.close_point_in_time(id=pit_id)

    print(f"Export complete: {total_exported} documents")

export_all_documents('products', 'products_export.ndjson')
```

### Bash Export with Scroll

```bash
#!/bin/bash

INDEX="products"
OUTPUT="export.ndjson"
SCROLL_TIME="5m"
SIZE=1000

# Initial request
RESPONSE=$(curl -s -X POST "https://localhost:9200/$INDEX/_search?scroll=$SCROLL_TIME" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": '$SIZE',
    "query": {"match_all": {}}
  }')

SCROLL_ID=$(echo $RESPONSE | jq -r '._scroll_id')
HITS=$(echo $RESPONSE | jq -r '.hits.hits | length')

# Extract documents
echo $RESPONSE | jq -c '.hits.hits[]._source' >> $OUTPUT
TOTAL=$HITS

# Continue scrolling
while [ "$HITS" -gt 0 ]; do
  RESPONSE=$(curl -s -X POST "https://localhost:9200/_search/scroll" \
    -H "Content-Type: application/json" \
    -u elastic:password \
    -d '{
      "scroll": "'$SCROLL_TIME'",
      "scroll_id": "'$SCROLL_ID'"
    }')

  SCROLL_ID=$(echo $RESPONSE | jq -r '._scroll_id')
  HITS=$(echo $RESPONSE | jq -r '.hits.hits | length')

  echo $RESPONSE | jq -c '.hits.hits[]._source' >> $OUTPUT
  TOTAL=$((TOTAL + HITS))

  echo "Exported $TOTAL documents..."
done

# Clean up scroll
curl -s -X DELETE "https://localhost:9200/_search/scroll" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{"scroll_id": "'$SCROLL_ID'"}'

echo "Export complete: $TOTAL documents"
```

## Parallel Processing

### Sliced Scroll

Process in parallel with slices:

```bash
# Slice 0 of 4
curl -X POST "https://localhost:9200/products/_search?scroll=5m" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "slice": {
      "id": 0,
      "max": 4
    },
    "size": 1000,
    "query": { "match_all": {} }
  }'

# Slice 1 of 4
curl -X POST "https://localhost:9200/products/_search?scroll=5m" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "slice": {
      "id": 1,
      "max": 4
    },
    "size": 1000,
    "query": { "match_all": {} }
  }'

# ... slices 2 and 3
```

### Parallel PIT Requests

```python
from concurrent.futures import ThreadPoolExecutor
from elasticsearch import Elasticsearch

es = Elasticsearch(['localhost:9200'])

def process_slice(slice_id, max_slices, pit_id):
    search_after = None
    results = []

    while True:
        query = {
            'pit': {'id': pit_id, 'keep_alive': '5m'},
            'size': 1000,
            'sort': [{'_id': 'asc'}],
            'slice': {'id': slice_id, 'max': max_slices},
            'query': {'match_all': {}}
        }

        if search_after:
            query['search_after'] = search_after

        response = es.search(body=query)
        hits = response['hits']['hits']

        if not hits:
            break

        results.extend([hit['_source'] for hit in hits])
        search_after = hits[-1]['sort']

    return results

# Create PIT
pit = es.open_point_in_time(index='products', keep_alive='10m')

# Process in parallel
max_slices = 4
with ThreadPoolExecutor(max_workers=max_slices) as executor:
    futures = [
        executor.submit(process_slice, i, max_slices, pit['id'])
        for i in range(max_slices)
    ]

    all_results = []
    for future in futures:
        all_results.extend(future.result())

# Clean up
es.close_point_in_time(id=pit['id'])
```

## Choosing the Right Approach

| Scenario | Recommended Approach |
|----------|---------------------|
| User pagination (< 10k) | from/size |
| User pagination (> 10k) | PIT + search_after |
| Real-time data export | PIT + search_after |
| Batch data export | PIT + search_after (or scroll) |
| Parallel export | Sliced PIT + search_after |
| Reindexing | _reindex API |

## Performance Tips

### 1. Optimize Batch Size

```bash
# Test different sizes to find optimal
# Typically 1000-5000 documents per request
curl -X GET "https://localhost:9200/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "pit": {"id": "...", "keep_alive": "5m"},
    "size": 2000,
    "sort": [{"_id": "asc"}]
  }'
```

### 2. Fetch Only Needed Fields

```bash
curl -X GET "https://localhost:9200/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "pit": {"id": "...", "keep_alive": "5m"},
    "_source": ["name", "price"],
    "size": 1000,
    "sort": [{"_id": "asc"}]
  }'
```

### 3. Use Filters Not Queries

```bash
curl -X GET "https://localhost:9200/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "pit": {"id": "...", "keep_alive": "5m"},
    "query": {
      "bool": {
        "filter": [
          {"term": {"status": "active"}}
        ]
      }
    },
    "size": 1000,
    "sort": [{"_id": "asc"}]
  }'
```

### 4. Set Appropriate Timeouts

```bash
# Match keep_alive to expected processing time
curl -X POST "https://localhost:9200/products/_pit?keep_alive=30m" \
  -u elastic:password
```

## Best Practices Summary

1. **Use PIT + search_after** for most large result scenarios
2. **Include tiebreaker** in sort (usually _id)
3. **Clean up resources** - delete PITs and clear scrolls
4. **Fetch only needed fields** to reduce transfer size
5. **Use filters** instead of queries for non-scoring
6. **Parallel processing** with slices for large exports
7. **Appropriate batch sizes** - typically 1000-5000
8. **Set realistic timeouts** - match processing time

## Conclusion

Handling large result sets in Elasticsearch requires:

1. **PIT + search_after** for consistent, efficient pagination
2. **Scroll** for legacy batch processing (prefer PIT)
3. **Slicing** for parallel processing
4. **Resource management** - clean up contexts
5. **Optimization** - field filtering, batch sizing

Choose the right approach based on your use case - real-time pagination, data export, or batch processing.
