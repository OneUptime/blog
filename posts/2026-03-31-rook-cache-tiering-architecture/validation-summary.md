# Validation Summary: How to Understand Cache Tiering Architecture in Ceph

## Status
validated

## Post Type
Guide / Architecture Explainer

## Technologies Covered
- Ceph (cache tiering subsystem)
- Ceph OSD pool management CLI
- CRUSH rules
- Bloom filter-based hit set tracking
- Rook (mentioned in tags, not in post content)

## Sources Consulted
- Ceph official documentation on cache tiering: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph `osd tier` CLI reference: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph `osd pool` CLI reference for pool creation and CRUSH rule assignment
- Ceph release notes for Reef (18.x) regarding cache tiering deprecation

## Issues Found
- **Incorrect expected output for `ceph osd dump`**: The expected output showed `tier_of pool 0 ''` as an attribute of the backing pool. The `tier_of` field is an attribute of the *cache* pool (indicating which pool it is a tier of), not the backing pool. The backing pool instead shows `tiers [<cache-pool-id>]` listing its associated tier pools. Changed `tier_of pool 0 ''` to `tiers [2]` to correctly reflect what `ceph osd dump` shows for the backing pool entry.

## Review Notes
- Cache tiering was first deprecated earlier than Reef (warnings appeared in Nautilus/Octopus era), but the post's statement that it is "deprecated in Ceph Reef (18.x)" is not incorrect since it is indeed deprecated in Reef. A more precise statement would note the deprecation began in earlier releases.
- The post lists three cache modes (writeback, readproxy, readonly). Ceph technically supports additional modes (`none`, `proxy`, `readforward` in some versions), but the three listed are the primary functional modes relevant to users, so this is acceptable.
- The post is tagged with Rook and Kubernetes but does not discuss Rook-specific configuration. The content is purely about Ceph cache tiering at the Ceph CLI level. This is not a technical error but a potential mismatch in audience expectations.
