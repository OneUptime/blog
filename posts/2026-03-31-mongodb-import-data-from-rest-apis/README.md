# How to Import Data from REST APIs into MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, REST API, Python, Import, Data Ingestion

Description: Learn how to fetch data from REST APIs and import it into MongoDB using Python with requests and pymongo, handling pagination and rate limiting.

---

Importing data from REST APIs into MongoDB is a common integration pattern for pulling external data from SaaS platforms, public APIs, and partner systems. Python's `requests` library handles HTTP calls while `pymongo` manages the MongoDB insertion.

## Prerequisites

```bash
pip install requests pymongo
```

## Basic API Fetch and Insert

```python
import requests
from pymongo import MongoClient
from datetime import datetime, timezone

client = MongoClient("mongodb://localhost:27017")
collection = client["myapp"]["github_repos"]

response = requests.get(
    "https://api.github.com/orgs/mongodb/repos",
    headers={"Accept": "application/vnd.github.v3+json"}
)
response.raise_for_status()

repos = response.json()

# Add ingestion metadata
for repo in repos:
    repo["_importedAt"] = datetime.now(timezone.utc)
    repo["_source"] = "github_api"

result = collection.insert_many(repos)
print(f"Inserted {len(result.inserted_ids)} repositories")
```

## Handling Paginated APIs

Many APIs use cursor or page-based pagination. Handle both patterns:

```python
def fetch_paginated_api(base_url, headers=None, params=None, page_size=100):
    """Handles page-number based pagination."""
    all_results = []
    page = 1
    params = params or {}

    while True:
        params["page"] = page
        params["per_page"] = page_size

        response = requests.get(base_url, headers=headers, params=params, timeout=30)
        response.raise_for_status()

        data = response.json()
        items = data if isinstance(data, list) else data.get("results", data.get("items", []))

        if not items:
            break

        all_results.extend(items)
        print(f"Fetched page {page}: {len(items)} items")

        if len(items) < page_size:
            break  # Last page

        page += 1

    return all_results
```

## Handling Link Header Pagination (GitHub Style)

```python
import re

def fetch_link_header_pagination(url, headers=None):
    all_items = []

    while url:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        items = response.json()
        all_items.extend(items if isinstance(items, list) else [items])

        # Parse Link header for next page URL
        link_header = response.headers.get("Link", "")
        next_url = None
        for part in link_header.split(","):
            if 'rel="next"' in part:
                match = re.search(r'<(.+?)>', part)
                if match:
                    next_url = match.group(1)
        url = next_url

    return all_items
```

## Rate Limiting and Retry

```python
import time
from requests.exceptions import HTTPError

def fetch_with_retry(url, headers=None, params=None, max_retries=3, backoff=2):
    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)

            # Handle rate limiting
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", backoff * (attempt + 1)))
                print(f"Rate limited. Waiting {retry_after}s...")
                time.sleep(retry_after)
                continue

            response.raise_for_status()
            return response.json()

        except HTTPError as e:
            if attempt < max_retries - 1:
                wait = backoff ** attempt
                print(f"HTTP error {e}. Retry {attempt + 1}/{max_retries} in {wait}s")
                time.sleep(wait)
            else:
                raise
    return None
```

## Upsert to Avoid Duplicates

Use `update_one` with `upsert=True` when re-running the import:

```python
from pymongo import UpdateOne

def upsert_api_data(collection, documents, id_field="id"):
    operations = [
        UpdateOne(
            {id_field: doc[id_field]},
            {"$set": doc, "$setOnInsert": {"_firstImportedAt": datetime.now(timezone.utc)}},
            upsert=True
        )
        for doc in documents
    ]
    result = collection.bulk_write(operations, ordered=False)
    print(f"Upserted: {result.upserted_count}, Updated: {result.modified_count}")
```

## Full Import Workflow

```python
def import_api_data():
    client = MongoClient("mongodb://localhost:27017")
    collection = client["myapp"]["products"]
    collection.create_index("id", unique=True)

    items = fetch_paginated_api(
        "https://api.example.com/products",
        headers={"Authorization": "Bearer YOUR_TOKEN"}
    )

    for item in items:
        item["_importedAt"] = datetime.now(timezone.utc)

    upsert_api_data(collection, items)
    client.close()

if __name__ == "__main__":
    import_api_data()
```

## Summary

Importing REST API data into MongoDB requires handling three main challenges: pagination to retrieve all records across multiple pages, rate limiting to respect API quotas, and idempotent upserts to safely re-run the import without creating duplicates. Use pymongo's `bulk_write` with `UpdateOne` upsert operations for efficient batch processing, and add `_importedAt` metadata to each document for traceability and incremental import support.
