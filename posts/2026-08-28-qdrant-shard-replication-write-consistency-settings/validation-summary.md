# Validation Summary: How to Choose Qdrant Shard, Replication, and Write-Consistency Settings

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Qdrant distributed collections
- Automatic and custom sharding
- Shard replication and Raft metadata consensus
- Write consistency factors and idempotent retries
- Weak, medium, and strong write ordering
- Integer, quorum, majority, and all read consistency
- Qdrant REST API with `curl` and `jq`
- Qdrant Python client
- Qdrant Cloud, Hybrid Cloud, Private Cloud, and self-hosted open source

## Sources Consulted

- [Qdrant Consistency Guarantees](https://qdrant.tech/documentation/scaling/consistency-guarantees/)
- [Qdrant Distributed Deployment](https://qdrant.tech/documentation/scaling/distributed_deployment/)
- [Qdrant Horizontal Scaling](https://qdrant.tech/documentation/scaling/horizontal-scaling/)
- [Qdrant Scaling and Resilience Overview](https://qdrant.tech/documentation/scaling/)
- [Qdrant Resilience](https://qdrant.tech/documentation/scaling/resilience/)
- [Qdrant Capacity Planning](https://qdrant.tech/documentation/capacity-planning/)
- [Qdrant Configuration](https://qdrant.tech/documentation/ops-configuration/configuration/)
- [Qdrant Cloud: Scale Clusters and Resharding](https://qdrant.tech/documentation/cloud/cluster-scaling/)
- [Qdrant Create Collection API](https://api.qdrant.tech/api-reference/collections/create-collection)
- [Qdrant Upsert Points API](https://api.qdrant.tech/api-reference/points/upsert-points)
- [Qdrant Query Points API](https://api.qdrant.tech/api-reference/search/query-points/)
- [Qdrant Get Collection Details API](https://api.qdrant.tech/api-reference/collections/get-collection)
- [Qdrant Retrieve Collection Cluster Details API](https://api.qdrant.tech/master/api-reference/distributed/collection-cluster-info)
- [Qdrant Update Collection Cluster Setup API](https://api.qdrant.tech/api-reference/distributed/update-collection-cluster)
- [Qdrant Points: Awaiting an Update Result](https://qdrant.tech/documentation/manage-data/points/#awaiting-result)
- [Qdrant Python client](https://github.com/qdrant/qdrant-client)
- [Qdrant replica read-consistency implementation](https://github.com/qdrant/qdrant/blob/master/lib/collection/src/shards/replica_set/execute_read_operation.rs)

## Issues Found

- The collection examples configured 384-dimensional vectors, while both REST operations sent three-dimensional vectors. Qdrant rejects vectors whose dimensions do not match the collection, and the Python examples also referenced an undefined `vector_384`. Changed the example collection to three dimensions and used the defined literal `[0.1, 0.2, 0.3]` consistently so every request is runnable as shown.
- The replicated-collection example did not state that replication factor two requires at least two peers to produce two physical copies. Added the peer requirement and made the twelve-physical-replica result conditional on those peers being available, because Qdrant does not place two replicas of one shard on a single node.
- Cloud resharding was described without its topology restriction. Clarified each occurrence to state that resharding is available from Qdrant 1.13 on multi-node Qdrant Cloud, Hybrid Cloud, and Private Cloud clusters, not self-hosted open source.
- The custom-sharding section said an operation without `shard_key` might fan out. Current Qdrant behavior is deterministic: an operation omitting the key executes on all shards. Reworded the claim accordingly.
- Shard, replication, and write-consistency defaults were stated as unconditional. Self-hosted configuration and Cloud collection defaults can override omitted collection values, so the post now identifies the documented values as Qdrant's built-in defaults.
- The write-ordering guidance did not say that every competing write must use the same non-weak ordering level and could imply that the example's payload revision controls precedence. Clarified that ordering establishes one replica-consistent processing order, does not inspect revision values, and that the strict matrix case requires `strong` on every competing write.
- Integer and quorum read consistency were described as choosing replicas entirely at random. Under default routing, current Qdrant prefers a readable local replica and randomizes remaining remote candidates. Rephrased the public guarantee in terms of required replica results, documented that integer `N` is capped at the replica-set size, and corrected the decision matrix so an integer consistency used to reconcile disagreement starts at two and does not exceed that size.

## Review Notes

- The current REST endpoints, request fields, query parameters, response paths used by `jq`, Python methods, arguments, and `WriteOrdering` enum are valid. The examples use three-dimensional vectors only for readability; production vectors must match the selected embedding model and collection configuration.
- The documented automatic/custom `shard_number` meanings, custom-sharding availability from Qdrant 1.7, two-shards-per-node and twelve-shard planning heuristics, replication storage tradeoff, write-consistency partial-application warning, idempotent retry guidance, and self-hosted versus Cloud replica reconciliation behavior are accurate.
- Qdrant's dedicated consistency documentation and current clients describe `strong` ordering as using a permanent leader. A broader horizontal-scaling page describes ordering leaders more generally as dynamically elected; the post follows the dedicated consistency contract.
- No live multi-node cluster was available for destructive node-loss drills. Distributed failure behavior was validated against current official documentation and source, while the API and client examples were checked for syntax, current signatures, and internally consistent dimensions.
