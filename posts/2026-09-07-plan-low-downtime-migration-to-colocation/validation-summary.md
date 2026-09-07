# Validation Summary: How to Plan a Low-Downtime Migration to Colocation

## Status
validated

## Post Type
Guide — technical infrastructure migration planning. The post contains implementation details for replication, DNS, failover, cutover, and recovery, plus transfer-time arithmetic, so it qualifies for technical review despite having no executable code.

## Technologies Covered
- Colocation infrastructure, racks, PDUs, redundant power, and remote hands
- DNS TTLs, IP addressing, BGP, VPNs, firewalls, MTU, and carrier failover
- Data replication, offline seeding, backups, and consistency checks
- High-availability clusters, quorum, heartbeats, and split-site operation
- Traffic migration, recovery objectives, rollback, and service validation

## Sources Consulted
- NIST SP 800-34 Rev. 1 publication record: https://www.nist.gov/publications/contingency-planning-guide-federal-information-systems-including-updates-through
- NIST SP 800-34 Rev. 1 full guide, especially recovery priorities, testing, recovery procedures, and reconstitution: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-34r1.pdf
- Equinix customer installation guidelines: https://docs.equinix.com/colocation/colo-customer-install-guidelines/
- Equinix Smart Hands order types: https://docs.equinix.com/smart-hands/ordering/order-types/
- Equinix inbound shipment requirements: https://docs.equinix.com/smart-hands/shipping-receiving/sh-inbound-shipments/
- RFC 1035, resource-record TTL and cache expiration: https://www.rfc-editor.org/rfc/rfc1035
- PostgreSQL 18 standby documentation, replication behavior and version compatibility: https://www.postgresql.org/docs/18/warm-standby.html
- PostgreSQL 18 failover documentation, former-primary fencing and standby reconstruction: https://www.postgresql.org/docs/18/warm-standby-failover.html
- Microsoft Windows Server guidance on stretched clusters and replication latency: https://www.microsoft.com/en-us/windows-server/blog/2016/06/17/whats-new-in-failover-clustering-3-stretched-clusters/

## Issues Found
1. The execution procedure prescribed a gradual traffic shift without qualifying how stateful services handle writes. Updated it to require the application’s supported cutover procedure, prevent old-primary writes before enabling destination writes for single-writer systems, and limit gradual shifts to configurations that can safely serve consistent data. This addresses the risk of divergent writable primaries documented by PostgreSQL.
2. Keeping the old environment recoverable did not explain what happens to writes accepted after cutover. Added that rollback must synchronize or reconcile those changes before returning writes to the old site. Old hardware alone does not provide a current rollback target after the destination has changed data.

## Review Notes
- Independently recalculated the example: 12 × 10^12 × 8 / (0.70 × 10^9) = 137,142.857 seconds, or 38.095 hours. The rounding is correct and uses decimal TB. This is a fixed-volume estimate; continuing replication changes require additional capacity, as the post explains.
- DNS TTL guidance correctly allows existing cached values to expire before cutover. Lowering an authoritative TTL does not retroactively shorten already cached TTLs.
- Recovery objectives, dependency inventories, destination readiness, rehearsals, escalation contacts, and post-recovery validation are consistent with NIST contingency guidance. Physical relocation duration and wave ordering are planning judgments that must be evaluated against actual dependencies.
- All four URLs in the article’s Official Documentation list resolved to the intended NIST and Equinix resources. Facility rules and service availability must still be checked for the selected site.
- The 60-second replication-lag gate is explicitly illustrative, not a universal safe cutover threshold. A planned lossless single-writer transition must complete final synchronization before destination writes begin.
- Cluster latency, quorum placement, remaining capacity, and replication version compatibility depend on the product. PostgreSQL and Microsoft documentation provide concrete corroborating examples; the article does not prescribe their product-specific settings.
- There are no executable code examples, terminal commands, configuration schemas, or API calls to test. Validation consisted of documentation review and arithmetic verification, not a live migration rehearsal.
