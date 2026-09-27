# How to Query Nested Log Arrays in OpenSearch Without Confusing Object and Nested Mappings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Observability, Logging

Description: Preserve same-element matching in OpenSearch log arrays by choosing object or nested mappings deliberately and validating nested queries with inner hits.

A log document can contain an array of objects without having a `nested` mapping. That distinction determines whether a query can prove that two conditions matched the same array element.

Suppose one request records several downstream attempts. You want requests where the payment attempt failed, not requests that contacted payments and had an unrelated failure somewhere else. A normal object mapping can silently blur that distinction.

## Reproduce the false match

Create a disposable example index with an ordinary object mapping:

```http
PUT log-attempts-object-demo
{
  "mappings": {
    "properties": {
      "attempts": {
        "type": "object",
        "properties": {
          "service": {"type": "keyword"},
          "status": {"type": "integer"}
        }
      }
    }
  }
}

PUT log-attempts-object-demo/_doc/request-1?refresh=wait_for
{
  "attempts": [
    {"service": "payments", "status": 200},
    {"service": "inventory", "status": 503}
  ]
}
```

Now search for payments and a failure:

```http
GET log-attempts-object-demo/_search
{
  "query": {
    "bool": {
      "filter": [
        {"term": {"attempts.service": "payments"}},
        {"range": {"attempts.status": {"gte": 500}}}
      ]
    }
  }
}
```

This document matches, even though the payment attempt succeeded. With an object array, the indexed values are effectively grouped by field: services include payments and inventory; statuses include 200 and 503. The connection between each service and its status is not retained for this query. The [nested field documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/nested/) explains this flattening behavior.

The result is correct for “contacted payments and experienced any failed attempt.” It is incorrect for the more specific question we intended.

## Define a nested mapping before indexing

Use a separate example index:

```http
PUT log-attempts-nested-demo
{
  "mappings": {
    "properties": {
      "attempts": {
        "type": "nested",
        "properties": {
          "service": {"type": "keyword"},
          "status": {"type": "integer"}
        }
      }
    }
  }
}

PUT log-attempts-nested-demo/_doc/request-1?refresh=wait_for
{
  "attempts": [
    {"service": "payments", "status": 200},
    {"service": "inventory", "status": 503}
  ]
}
```

The source JSON looks the same. The mapping changes how its elements can be searched. A nested object is indexed separately within its parent document's structure, preserving the association needed for same-element conditions.

## Put both conditions inside one nested query

```http
GET log-attempts-nested-demo/_search
{
  "query": {
    "nested": {
      "path": "attempts",
      "score_mode": "none",
      "query": {
        "bool": {
          "filter": [
            {"term": {"attempts.service": "payments"}},
            {"range": {"attempts.status": {"gte": 500}}}
          ]
        }
      },
      "inner_hits": {}
    }
  }
}
```

The expected result is zero parent hits. If you change the first attempt's status to 502 and index the document again, the same query should return the parent request and the matching payment attempt under `inner_hits`.

Both predicates must live within the same nested scope. Two separate nested clauses can each match a different attempt, recreating the logical problem. The [nested query reference](https://docs.opensearch.org/latest/query-dsl/joining/nested/) describes `path`, `score_mode`, and `inner_hits`.

Inspect the inner hits during development. A parent source can contain many attempts, including successful ones; returning the parent does not mean every element matched. Also distinguish parent hit counts from the number of matching attempts when reporting error rates.

## Diagnose a production mapping

Before applying a nested query to real logs, inspect the mapping of the concrete index:

```http
GET logs-prod-2026.09.27/_mapping
```

An array visible in `_source` is insufficient evidence. If `attempts` is an ordinary object, a nested query on that path cannot supply missing relationships. If some indexes omit the field entirely, `ignore_unmapped` can intentionally skip those indexes, but it should not be used to hide inconsistent schemas during diagnosis.

A PPL projection that displays dotted fields also does not prove same-element matching. Establish the intended behavior with the explicit Query DSL fixture above, then evaluate any PPL array features against the documentation for the installed query engine.

## Repair existing data deliberately

You cannot change an existing object field into a nested field in place. Create a destination index with the correct mapping, reindex retained source documents, and update the relevant ingestion template and alias. The [Reindex API](https://docs.opensearch.org/latest/api-reference/document-apis/reindex/) copies documents into an existing destination; define its mapping first.

If the original `_source` retains the object array, reindexing can reconstruct the intended nested representation. If an upstream transform already flattened or discarded the relationships before storage, migration cannot invent them.

Use nested fields only where same-element relationships matter. Each nested object adds indexing and query work. For very large repeated event collections, separate event documents with a request identifier may fit the workload better.

## Conclusion

Inspect the mapping, define the question precisely, and test a fixture that would expose cross-element matching. A nested mapping plus one correctly scoped nested query provides the relationship guarantee that an ordinary object array cannot.
