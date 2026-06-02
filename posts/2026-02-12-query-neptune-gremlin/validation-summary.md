# Validation Summary: How to Query Neptune with Gremlin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Neptune
- Apache TinkerPop Gremlin
- Gremlin Python
- Gremlin JavaScript
- Python
- Node.js

## Sources Consulted
- Amazon Neptune User Guide: Using Python to connect to a Neptune DB instance - https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-gremlin-python.html
- Amazon Neptune User Guide: Using Node.js to connect to a Neptune DB instance - https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-gremlin-node-js.html
- Amazon Neptune User Guide: Gremlin transactions in Neptune - https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-gremlin-transactions.html
- Amazon Neptune User Guide: Gremlin standards compliance in Amazon Neptune - https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-gremlin-differences.html
- Amazon Neptune User Guide: Native Gremlin step support in Amazon Neptune - https://docs.aws.amazon.com/neptune/latest/userguide/gremlin-step-support.html
- Amazon Neptune User Guide: Tuning Gremlin queries using explain and profile - https://docs.aws.amazon.com/neptune/latest/userguide/gremlin-traversal-tuning.html
- Apache TinkerPop Reference Documentation: Gremlin traversal steps, Python reserved-word variants, predicates, ordering, `valueMap()`, `repeat()`, and `shortestPath()` - https://tinkerpop.apache.org/docs/current/reference/
- Apache TinkerPop Gremlin JavaScript documentation - https://tinkerpop.apache.org/jsdocs/3.4.4/

## Issues Found
- The Python connection snippet imported `__` but later examples used `WithOptions.tokens` after replacing deprecated `valueMap(True)` usage. Added `WithOptions` to the traversal imports so the examples using token-inclusive value maps are complete.
- Several snippets used `valueMap(True)` to include element tokens. TinkerPop current documentation shows the token-modulator form, so these were changed to `valueMap().with_(WithOptions.tokens)` for Gremlin Python.
- The multi-hop traversal labeled a `repeat(...).until(...).path().limit(1)` query as finding the shortest path to Diana. Neptune does not support the TinkerPop `shortestPath()` step, and the sample graph did not include a route from Alice to Diana. Changed the description to "Find a path between two people" and targeted Charlie, who is connected in the sample graph.
- The aggregation snippet used `Order.desc` without importing `Order`. Added `from gremlin_python.process.traversal import Order` before that snippet.

## Review Notes
The connection examples match the basic AWS Neptune Gremlin Python and Node.js patterns for non-IAM clusters. Deployments with IAM authentication enabled need SigV4-signed Gremlin connections, which is outside the scope of this post.
