# Validation Summary: How to Understand Dapr Actor Placement Algorithm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actor placement service
- Consistent hashing (with bounded loads)
- Dapr Resiliency component
- Kubernetes (kubectl for observability)
- Go (code examples)

## Sources Consulted
- Dapr Placement Service documentation — https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Actor Features & Concepts — https://docs.dapr.io/developing-applications/building-blocks/actors/actors-features-concepts/
- Dapr Actor Runtime Configuration — https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr Metadata API Reference — https://docs.dapr.io/reference/api/metadata_api/
- Dapr Resiliency Schema Reference — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Resiliency Targets — https://docs.dapr.io/operations/resiliency/targets/
- Dapr source code: `pkg/placement/hashing/consistent_hash.go` — https://github.com/dapr/dapr
- Dapr source code: `cmd/placement/options/options.go` — https://github.com/dapr/dapr

## Issues Found

1. **Wrong hash algorithm in pseudocode**: The blog claimed `fnv1a()` as the hashing function. Dapr actually uses BLAKE2b (`blake2b.Sum512`). Changed to `blake2b()` in the code example.

2. **Incorrect hash input and ring architecture**: The blog stated the hash input is `actorType + "/" + actorId`, implying a single shared hash ring. In reality, Dapr maintains a separate consistent hash ring per actor type, and only the actor ID is hashed against the ring for that type. Rewrote the "Actor ID Hashing" section to accurately describe the per-type ring architecture.

3. **Incorrect terminology — "actor table"**: The blog used "actor table" to describe the data structure disseminated to sidecars. The official Dapr terminology is "placement table." Changed both occurrences (in "Instance Joins" and "Instance Leaves" sections).

4. **Wrong jq field path for metadata endpoint**: The blog used `jq '.activeActorsCount'` but the Dapr metadata API returns active actor data under the `.actors` array (each element has `type` and `count` fields). Changed to `jq '.actors'`.

5. **Misleading actor co-location example**: The blog showed two different actor types (`orderActorID` and `paymentActorID`) sharing an ID prefix as a co-location strategy. Since each actor type has its own independent hash ring, cross-type co-location via ID prefix does not work. Rewrote the section to clarify that this technique only applies to actors of the same type, and explicitly noted that cross-type co-location cannot be achieved this way.

## Review Notes
- Dapr's consistent hashing implementation uses Google's "Consistent Hashing With Bounded Loads" algorithm, where max load per host = `ceil((totalLoad / numHosts) * 1.25)`. The blog does not mention this, but it is an implementation detail that could be added in a future revision for completeness.
- The placement table dissemination uses a three-phase commit protocol (lock, update, unlock) to ensure consistency across all sidecars. This is not mentioned in the blog but could be a valuable detail for a more advanced audience.
- Dapr supports `drainRebalancedActors` (default: true) and `drainOngoingCallTimeout` (default: 60s) configuration options that control actor deactivation behavior during rebalancing. These could be mentioned alongside the resiliency configuration section.
- The default virtual node count of 100 is confirmed correct and is configurable via the placement service's `replicationFactor` option.
