# Validation Summary: How to Delete Qdrant Points by Payload Filter and Wait for the Update to Finish

## Status

validated

## Post Type

Tutorial and operational guide

## Technologies Covered

- Qdrant v1.19 REST API
- Qdrant payload filters, exact Count, Scroll, and delete-by-filter operations
- Qdrant payload indexes and strict mode
- Qdrant write ordering and read consistency
- Qdrant collection snapshots and Qdrant Cloud backups
- Python with `qdrant-client` 1.19.0
- Bash, `curl`, and JSON

## Sources Consulted

- [Qdrant Delete points API](https://api.qdrant.tech/api-reference/points/delete-points)
- [Qdrant Count points API](https://api.qdrant.tech/api-reference/points/count-points)
- [Qdrant Scroll points API](https://api.qdrant.tech/api-reference/points/scroll-points)
- [Qdrant Create payload index API](https://api.qdrant.tech/api-reference/indexes/create-field-index)
- [Qdrant Create collection snapshot API](https://api.qdrant.tech/api-reference/snapshots/create-snapshot)
- [Qdrant point management and awaiting update results](https://qdrant.tech/documentation/manage-data/points/#awaiting-result)
- [Qdrant filtering and datetime ranges](https://qdrant.tech/documentation/search/filtering/#datetime-range)
- [Qdrant payload indexing](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant consistency guarantees](https://qdrant.tech/documentation/scaling/consistency-guarantees/)
- [Qdrant horizontal scaling and point-operation guarantees](https://qdrant.tech/documentation/scaling/horizontal-scaling/)
- [Qdrant strict mode administration](https://qdrant.tech/documentation/ops-configuration/administration/#disable-updating-via-non-indexed-payload)
- [Qdrant collection snapshots](https://qdrant.tech/documentation/operations/snapshots/)
- [Qdrant Cloud backups](https://qdrant.tech/documentation/cloud/backups/)
- [Qdrant migration and recovery options](https://qdrant.tech/documentation/migration-recovery-options/)
- [Qdrant approximate collection counts](https://qdrant.tech/documentation/manage-data/collections/#approximate-point-and-vector-counts)
- [Qdrant optimizer behavior and `wait=true`](https://qdrant.tech/documentation/operations/optimizer/#effect-on-waittrue)
- [Official `qdrant-client` implementation](https://github.com/qdrant/qdrant-client/blob/master/qdrant_client/qdrant_client.py)
- [Official `qdrant-client` HTTP models](https://github.com/qdrant/qdrant-client/blob/master/qdrant_client/http/models/models.py)
- [Python `assert` statement reference](https://docs.python.org/3/reference/simple_stmts.html#the-assert-statement)

## Issues Found

- The verification used `assert remaining == 0`. Python omits assertion code when optimization is enabled with `-O`, so this could silently remove a required destructive-operation safety check. Replaced it with an explicit conditional that raises `RuntimeError`.
- The example printed `Deleted {before} matching points`, but `before` is a pre-delete count rather than a deletion count returned by Qdrant. Concurrent writes or payload changes can make those values differ. Changed the message to report the pre-delete count and the verified zero remaining matches without claiming an exact deleted count.
- The write-ordering guidance did not state that all relevant concurrent writes must use the same stronger `ordering` value. Qdrant's sequential ordering guarantee applies to operations issued with the same ordering setting. Clarified the sentence so readers do not assume that setting `ordering=strong` only on the delete also serializes default-weak writers.

## Review Notes

- All REST endpoints, methods, query parameters, request bodies, and response-state explanations match the current Qdrant v1.19 documentation.
- The Python example was checked with `qdrant-client` 1.19.0, including construction and serialization of `DatetimeRange` and `FilterSelector`, the method signatures, enum comparison, and an in-memory count/scroll/delete/verify run.
- Datetime filtering is available in Qdrant 1.8 and later; strict mode is available in Qdrant 1.13 and later. Deployments older than those versions need to upgrade before using those portions of the guide.
- Snapshot restore compatibility is limited to the same minor Qdrant version or the next minor version, with the detailed patch-version restriction already summarized accurately in the post.
