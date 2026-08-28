# Validation Summary: How to Filter Qdrant Arrays and Nested Objects with Correct AND Semantics

## Status
validated

## Post Type
Technical tutorial and guide

## Technologies Covered

- Qdrant vector database
- Qdrant payload filtering and nested object filters
- Qdrant REST API
- Qdrant payload indexes and filterable HNSW
- Python and `qdrant-client`
- curl and JSON

## Sources Consulted

- [Qdrant filtering and nested object filters](https://qdrant.tech/documentation/search/filtering/)
- [Qdrant payload types and array matching](https://qdrant.tech/documentation/manage-data/payload/)
- [Qdrant payload indexing](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant points documentation](https://qdrant.tech/documentation/concepts/points/)
- [Create collection API](https://api.qdrant.tech/api-reference/collections/create-collection)
- [Upsert points API](https://api.qdrant.tech/api-reference/points/upsert-points)
- [Scroll points API](https://api.qdrant.tech/api-reference/points/scroll-points)
- [Create payload index API](https://api.qdrant.tech/api-reference/indexes/create-field-index)
- [Count points API](https://api.qdrant.tech/api-reference/points/count-points)
- [Delete points API](https://api.qdrant.tech/api-reference/points/delete-points)
- [Qdrant Cloud authentication](https://qdrant.tech/documentation/cloud/authentication/)
- [Qdrant 1.2.0 release](https://github.com/qdrant/qdrant/releases/tag/v1.2.0)
- [Qdrant 1.4.0 release](https://github.com/qdrant/qdrant/releases/tag/v1.4.0)
- [Qdrant 1.19.0 release](https://github.com/qdrant/qdrant/releases/tag/v1.19.0)
- [Qdrant Python client source](https://github.com/qdrant/qdrant-client/blob/master/qdrant_client/qdrant_client.py)
- [`qdrant-client` package metadata](https://pypi.org/project/qdrant-client/)

## Issues Found

- The prerequisite incorrectly stated that Qdrant 1.2 or later was sufficient for every example. Nested object filters were introduced in 1.2, but the `bool` payload index used for `diet[].likes` was introduced in 1.4. The minimum server version was changed to 1.4, while retaining the correct 1.2 introduction version for nested filters.

## Review Notes

- The REST examples and Python example were run against Qdrant Server 1.19.0 and `qdrant-client` 1.19.0. The outer filter returned IDs 1 and 2, the nested filters returned only ID 1, both payload indexes were created successfully, and the Python assertions passed.
- Scroll remains a current API. Its REST request uses `with_vector`, while the Python client correctly uses `with_vectors`; with the shown fixture, the Python client returns ID 1 and a `None` next-page offset.
- Qdrant 1.19.0 introduced the `slice` condition. The post's statement that neither `slice` nor `has_id` is supported inside a nested object filter matches the current filtering documentation.
- The current `qdrant-client` 1.19.0 package requires Python 3.10 or later. The post does not make a conflicting Python-version claim.
