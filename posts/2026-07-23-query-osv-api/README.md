# How to Query the OSV.dev API for One Package or an Entire Dependency Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV API, Vulnerability Scanning, REST API, Dependency Inventory

Description: Query one package, batch a dependency inventory, fetch complete records, and handle OSV.dev pagination correctly.

---

The OSV.dev API supports two complementary lookup patterns:

- `POST /v1/query` returns complete vulnerability records for one package version or commit.
- `POST /v1/querybatch` accepts many queries and returns matching IDs plus `modified` timestamps in the same order as the inputs.

Use the single endpoint for interactive investigation. Use the batch endpoint for an inventory, then fetch full records by ID and cache them.

## Query one package version

Identify a package by canonical ecosystem and name:

```bash
curl -sS https://api.osv.dev/v1/query \
  -H 'Content-Type: application/json' \
  -d '{
    "package": {
      "ecosystem": "PyPI",
      "name": "jinja2"
    },
    "version": "3.1.4"
  }' | jq .
```

Names, ecosystem values, field names, and versions are case-sensitive. Consult the OSV schema's ecosystem list and use the package registry's canonical name.

You can instead use a Package URL:

```bash
curl -sS https://api.osv.dev/v1/query \
  -H 'Content-Type: application/json' \
  -d '{"package":{"purl":"pkg:pypi/jinja2@3.1.4"}}' | jq .
```

Three valid forms are:

```json
{"package":{"name":"jinja2","ecosystem":"PyPI"},"version":"3.1.4"}
{"package":{"purl":"pkg:pypi/jinja2@3.1.4"}}
{"package":{"purl":"pkg:pypi/jinja2"},"version":"3.1.4"}
```

Do not set both a versioned purl and top-level `version`; the API returns `400 Bad Request`. Also use either `name` plus `ecosystem`, or `purl`, rather than mixing the two package identity forms.

## Query a Git commit

A commit query does not require a package object:

```bash
curl -sS https://api.osv.dev/v1/query \
  -H 'Content-Type: application/json' \
  -d '{"commit":"6879efc2c1596d11a6a6ad296f80063b558d5e0f"}' \
  | jq .
```

When `commit` is present, do not set `version`. For a Git tag query, the API also supports ecosystem `GIT`, the full repository URL as `name`, and the tag as `version`.

## Batch a resolved dependency set

Build one query per resolved package instance:

```json
{
  "queries": [
    {
      "package": {"purl": "pkg:pypi/jinja2@3.1.4"}
    },
    {
      "package": {
        "ecosystem": "npm",
        "name": "lodash"
      },
      "version": "4.17.20"
    },
    {
      "commit": "6879efc2c1596d11a6a6ad296f80063b558d5e0f"
    }
  ]
}
```

Send it from a file:

```bash
curl -sS https://api.osv.dev/v1/querybatch \
  -H 'Content-Type: application/json' \
  --data-binary @queries.json \
  > batch-response.json
```

`results[0]` corresponds to `queries[0]`, including when it has no matches. Preserve array positions; do not zip only nonempty results back to the inventory.

A batch match is intentionally compact:

```json
{
  "id": "GHSA-example-id",
  "modified": "2026-07-23T08:15:00Z"
}
```

Fetch complete records separately:

```bash
jq -r '.results[].vulns[]?.id' batch-response.json \
  | sort -u \
  | while IFS= read -r id; do
      curl -sS "https://api.osv.dev/v1/vulns/${id}" \
        -o "records/${id}.json"
    done
```

In production, URL-encode IDs, apply bounded concurrency and retries, and cache by `(id, modified)`. If a cached record has the same `modified` timestamp returned by the batch query, it does not need to be downloaded again.

## Handle single-query pagination

`/v1/query` can return `next_page_token` when a result is large or the query reaches its processing limit. Resubmit the same query with `page_token` and continue until the token is absent:

```json
{
  "package": {"ecosystem": "Debian", "name": "example"},
  "version": "1.0-1",
  "page_token": "TOKEN_FROM_PREVIOUS_RESPONSE"
}
```

The documentation warns that a page can rarely contain only `next_page_token`. Continue rather than interpreting that page as a clean result.

## Handle batch pagination per input

Each batch result has its own token. On the next request, send only the query items that returned a token, adding the corresponding token to each. Do not resend completed items and do not reuse one query's token for another.

Maintain a work item such as:

```text
original inventory index
original query object
next_page_token
accumulated vulnerability IDs
```

This preserves the input mapping even though follow-up batches contain a subset of the original queries.

## Engineer the client defensively

OSV.dev currently documents no API rate limit, but clients should still use timeouts, backoff transient failures, and avoid unbounded parallel requests. The API has a 32 MiB response limit over HTTP/1.1; the documentation recommends HTTP/2 for potentially large responses.

Keep these outcomes distinct:

- HTTP success with no `vulns`: no known match for that exact query;
- `400`: malformed or contradictory package/version input;
- `404` on `GET /v1/vulns/{id}`: no retrievable record under that ID;
- transport or `5xx` failure: unknown result, which must not be treated as clean.

Finally, deduplicate aliases after fetching full records. A batch can return several source-native IDs for the same underlying vulnerability.

## Official Documentation

- [OSV.dev API overview](https://google.github.io/osv.dev/api/)
- [POST /v1/query](https://google.github.io/osv.dev/post-v1-query/)
- [POST /v1/querybatch](https://google.github.io/osv.dev/post-v1-querybatch/)
- [GET /v1/vulns/{id}](https://google.github.io/osv.dev/get-v1-vulns/)
- [OSV API quickstart](https://google.github.io/osv.dev/quickstart/)

