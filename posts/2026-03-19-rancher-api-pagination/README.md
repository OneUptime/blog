# How to Paginate Results in the Rancher API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, API, REST API

Description: Learn how to handle pagination in the Rancher API to efficiently retrieve large datasets of clusters, nodes, pods, and other resources.

When your Rancher environment manages hundreds of clusters, thousands of nodes, or tens of thousands of pods, API responses can become very large. Pagination lets you retrieve results in manageable chunks, reducing memory usage and response times. This guide explains how pagination works in the Rancher API and provides practical patterns for handling it.

## How Rancher API Pagination Works

The previous v3 Rancher API uses limit and marker-based pagination. Every paginated collection response includes a `pagination` object:

```json
{
  "type": "collection",
  "resourceType": "node",
  "data": [...],
  "pagination": {
    "limit": 100,
    "partial": true,
    "total": 450,
    "first": "https://rancher.example.com/v3/nodes",
    "next": "https://rancher.example.com/v3/nodes?marker=node-xyz",
    "last": "https://rancher.example.com/v3/nodes?marker=node-end"
  }
}
```

Key fields:
- **limit**: Maximum number of items per page (default varies by resource type)
- **partial**: Whether the response is truncated and more results are available
- **total**: Total number of items matching your query, if the server provides it
- **next**: URL for the next page of results (present when the result is truncated and more results are available)
- **first**: URL for the first page, when provided
- **last**: URL for the last page, if the server provides it

## Setting Up

```bash
export RANCHER_URL="https://rancher.example.com"
export RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"

api() {
  curl -s -k \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "$1"
}
```

## Controlling Page Size with the limit Parameter

Set the number of results per page using the `limit` query parameter:

```bash
# Get 10 clusters per page

api "${RANCHER_URL}/v3/clusters?limit=10" | jq '{
  total: .pagination.total,
  returned: (.data | length),
  hasNext: (.pagination.next != null)
}'
```

```bash
# Get 50 nodes per page
api "${RANCHER_URL}/v3/nodes?limit=50" | jq '.pagination'
```

The previous v3 API supports `limit` values up to 1000.

## Navigating Pages with the marker Parameter

The `marker` parameter tells the API where to start the next page. You get this value from the `pagination.next` URL in the previous response.

### Manual Page Navigation

```bash
# Page 1
api "${RANCHER_URL}/v3/nodes?limit=10" | jq '{
  items: [.data[].nodeName],
  next: .pagination.next
}'

# Page 2 (use the next URL from page 1)
api "${RANCHER_URL}/v3/nodes?limit=10&marker=node-xxxxx" | jq '{
  items: [.data[].nodeName],
  next: .pagination.next
}'
```

## Iterating Through All Pages

### Shell Script Pattern

```bash
#!/bin/bash

RANCHER_URL="https://rancher.example.com"
RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"

url="${RANCHER_URL}/v3/nodes?limit=50"
page=1

while [ -n "$url" ]; do
  echo "Fetching page ${page}..."

  response=$(curl -s -k \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "$url")

  # Process the current page
  echo "$response" | jq -r '.data[] | "\(.nodeName)\t\(.state)\t\(.ipAddress)"'

  # Get the next page URL
  url=$(echo "$response" | jq -r '.pagination.next // empty')
  page=$((page + 1))
done

echo "Done. Fetched $((page - 1)) pages."
```

### Collecting All Results into a Single Array

```bash
#!/bin/bash

collect_all() {
  local endpoint="$1"
  local url="${RANCHER_URL}${endpoint}?limit=100"
  local all_data="[]"

  while [ -n "$url" ]; do
    response=$(curl -s -k \
      -H "Authorization: Bearer ${RANCHER_TOKEN}" \
      "$url")

    # Append current page data to the collection
    page_data=$(echo "$response" | jq '.data')
    all_data=$(echo "$all_data" "$page_data" | jq -s 'add')

    # Get next page
    url=$(echo "$response" | jq -r '.pagination.next // empty')
  done

  echo "$all_data"
}

# Usage
all_nodes=$(collect_all "/v3/nodes")
echo "$all_nodes" | jq 'length'  # Total count
echo "$all_nodes" | jq '.[].nodeName'  # All node names
```

## Pagination with the v1 API

The v1 (Steve) API uses slightly different pagination parameters:

```bash
# Set page size with limit
api "${RANCHER_URL}/v1/pods?limit=100" | jq '{
  continue: .continue,
  next: .pagination.next
}'
```

The v1 API response includes a top-level `continue` token, and partial results also include a `pagination.next` URL:

```json
{
  "continue": "eyJ2IjoiMTIz...",
  "pagination": {
    "limit": 100,
    "partial": true,
    "next": "https://rancher.example.com/v1/pods?limit=100&continue=eyJ2IjoiMTIz..."
  }
}
```

You can follow `pagination.next` directly, or reuse the `continue` token with the same query parameters:

```bash
api "${RANCHER_URL}/v1/pods?limit=100&continue=eyJ2IjoiMTIz..."
```

### v1 API Pagination Loop

```bash
#!/bin/bash

url="${RANCHER_URL}/v1/pods?limit=100"
total=0

while [ -n "$url" ]; do
  response=$(curl -s -k \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "$url")

  count=$(echo "$response" | jq '.data | length')
  total=$((total + count))

  # Process items
  echo "$response" | jq -r '.data[] | "\(.metadata.namespace)/\(.metadata.name)"'

  # Check for continuation
  url=$(echo "$response" | jq -r '.pagination.next // empty')
done

echo "Total pods: ${total}"
```

## Combining Pagination with Filtering

You can combine pagination with filters to narrow results:

```bash
# Get active nodes, 20 per page
api "${RANCHER_URL}/v3/nodes?limit=20&state=active" | jq '.data | length'

# Get pods in a specific namespace, paginated
api "${RANCHER_URL}/v1/pods/default?limit=50" | jq '.pagination'
```

## Sorting Paginated Results

In the previous v3 API, available sort names vary by collection. Inspect `sortLinks` to see what a given endpoint supports:

```bash
# Show the supported sort links for clusters
api "${RANCHER_URL}/v3/clusters?limit=10" | jq '.sortLinks'

# Follow one of the returned sort links, for example the `name` sort if present
sort_url=$(api "${RANCHER_URL}/v3/clusters?limit=10" | jq -r '.sortLinks.name // empty')
[ -n "$sort_url" ] && api "$sort_url"
```

## Performance Tips

### Use Server-Side Filtering

Instead of fetching all resources and filtering locally, use query parameters to reduce the data transferred:

```bash
# Bad: fetch all pods, filter locally
api "${RANCHER_URL}/v1/pods" | jq '[.data[] | select(.status.phase == "Failed")]'

# Good: filter on the server
api "${RANCHER_URL}/v1/pods?fieldSelector=status.phase=Failed&limit=100"
```

### Choose an Appropriate Page Size

- **Small pages (10-50)**: Good for interactive scripts and debugging
- **Medium pages (100-200)**: Good balance for most automation
- **Large pages (500-1000)**: Faster for bulk operations, but higher memory usage

### Parallelize Page Fetches

The previous v3 API uses marker-based pagination, so you generally cannot fetch arbitrary pages in parallel. Each `marker` value comes from the previous response, so page retrieval is typically sequential.

## Error Handling for Pagination

Handle common pagination errors gracefully:

```bash
#!/bin/bash

paginate_with_retry() {
  local url="$1"
  local max_retries=3

  while [ -n "$url" ]; do
    local retry=0
    local response=""

    while [ $retry -lt $max_retries ]; do
      response=$(curl -s -k -w "\n%{http_code}" \
        -H "Authorization: Bearer ${RANCHER_TOKEN}" \
        "$url")

      local http_code=$(echo "$response" | tail -1)
      local body=$(echo "$response" | head -n -1)

      if [ "$http_code" -eq 200 ]; then
        echo "$body" | jq -r '.data[] | .id'
        url=$(echo "$body" | jq -r '.pagination.next // empty')
        break
      elif [ "$http_code" -eq 429 ]; then
        echo "Rate limited, waiting..." >&2
        sleep 5
        retry=$((retry + 1))
      else
        echo "Error: HTTP ${http_code}" >&2
        return 1
      fi
    done

    if [ $retry -eq $max_retries ]; then
      echo "Max retries exceeded" >&2
      return 1
    fi
  done
}

paginate_with_retry "${RANCHER_URL}/v3/nodes?limit=50"
```

## Summary

Pagination in the Rancher API uses limit and marker parameters for the v3 API, and limit and continue tokens for the v1 API. Always paginate when working with large result sets to avoid timeouts and excessive memory usage. Combine pagination with server-side filtering and sorting for the best performance, and implement retry logic to handle rate limiting and transient errors.
