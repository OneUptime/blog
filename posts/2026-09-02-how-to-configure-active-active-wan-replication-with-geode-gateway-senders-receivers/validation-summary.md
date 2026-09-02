# Validation Summary: Configure Active-Active Geode WAN Replication

## Status

validated

## Post Type

Technical tutorial / configuration guide

## Technologies Covered

- Apache Geode 2.0.x
- Geode multi-site (WAN) replication
- Gateway senders and gateway receivers
- Partitioned persistent regions
- Persistent gateway queues and disk stores
- Portable Data eXchange (PDX) serialization and metadata persistence
- WAN conflict detection and `GatewayConflictResolver`
- Geode integrated security and TLS
- `gfsh` cluster configuration and operations

## Sources Consulted

- [Apache Geode releases](https://geode.apache.org/releases/)
- [Configuring a Multi-site (WAN) System](https://geode.apache.org/docs/guide/latest/topologies_and_comm/multi_site_configuration/setting_up_a_multisite_system.html)
- [Overview of Multi-site Caching](https://geode.apache.org/docs/guide/latest/topologies_and_comm/topology_concepts/multisite_overview.html)
- [Multi-Site (WAN) Event Distribution](https://geode.apache.org/docs/guide/latest/developing/events/how_multisite_distribution_works.html)
- [Multi-site (WAN) Topologies](https://geode.apache.org/docs/guide/latest/topologies_and_comm/multi_site_configuration/multisite_topologies.html)
- [How Consistency Is Achieved in WAN Deployments](https://geode.apache.org/docs/guide/latest/developing/distributed_regions/how_region_versioning_works_wan.html)
- [Resolving Conflicting Events](https://geode.apache.org/docs/guide/latest/developing/events/resolving_multisite_conflicts.html)
- [`GatewayConflictResolver` API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/util/GatewayConflictResolver.html)
- [Configuring Multi-Site (WAN) Event Queues](https://geode.apache.org/docs/guide/latest/developing/events/configure_multisite_event_messaging.html)
- [Configuring Dispatcher Threads and Order Policy](https://geode.apache.org/docs/guide/latest/developing/events/configuring_gateway_concurrency_levels.html)
- [High Level Steps for Using PDX Serialization](https://geode.apache.org/docs/guide/latest/developing/data_serialization/use_pdx_high_level_steps.html)
- [PDX Serialization Features](https://geode.apache.org/docs/guide/latest/developing/data_serialization/PDX_Serialization_Features.html)
- [Overview of Data Serialization](https://geode.apache.org/docs/guide/latest/developing/data_serialization/data_serialization_options.html)
- [Persisting PDX Metadata to Disk](https://geode.apache.org/docs/guide/latest/developing/data_serialization/persist_pdx_metadata_to_disk.html)
- [`FieldType` API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/pdx/FieldType.html)
- [Designing and Configuring Disk Stores](https://geode.apache.org/docs/guide/latest/managing/disk_storage/using_disk_stores.html)
- [`gemfire.properties` and `gfsecurity.properties` reference](https://geode.apache.org/docs/guide/latest/reference/topics/gemfire_properties.html)
- [`gfsh` `configure` commands](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/configure.html)
- [`gfsh` `create` commands](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/create.html)
- [`gfsh` `list` commands](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/list.html)
- [`gfsh` `status` commands](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/status.html)
- [Configuring SSL](https://geode.apache.org/docs/guide/latest/security/implementing_ssl.html)
- [Implementing Authentication](https://geode.apache.org/docs/guide/latest/security/implementing_authentication.html)
- [Firewalls and Ports](https://geode.apache.org/docs/guide/latest/configuring/running/firewalls_ports.html)
- [`GatewaySenderMXBean` API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/management/GatewaySenderMXBean.html)

## Issues Found

- The distributed-system-ID guidance applied the site ID only to locators. With PDX in a WAN deployment, the ID must be the same on every member in the local cluster and unique across clusters. Changed the guidance to include both locators and data servers.
- The parallel-sender description stated that it preserves per-partition ordering without noting its ordering limit. Geode does not preserve region-wide ordering for a parallel queue, and the documentation says ordering within a partition can be preserved. Updated the wording accordingly.
- The PDX guidance could be read as requiring identical field sets at both sites. PDX explicitly supports schema evolution that adds or removes fields, while an existing field's physical type cannot change and identity semantics should remain consistent. Replaced the overly strict requirement with those compatibility rules.
- The custom-conflict-resolver guidance required determinism but did not state Geode's stricter convergence rule: every resolver must make the same decision for a pair of events regardless of arrival order. Added that requirement.
- The topology guidance described duplicate delivery as a risk to validate but did not say that topologies capable of delivering the same update twice to one site are unsupported. Updated it to prohibit duplicate-path topologies and to use the official mesh, ring, and supported hybrid/tree terminology.
- The security section could imply that `ssl-enabled-components=gateway` protects remote-locator discovery as well as replicated data. Added a clarification that `gateway` protects sender-to-receiver sockets and that locator discovery uses the separate `locator` TLS component.

## Review Notes

- All shown `gfsh` commands and option names are valid in the current Geode 2.0 documentation. This includes PDX configuration; disk-store, receiver, sender, and region creation; and gateway list/status commands.
- The parallel-versus-serial restrictions, sender placement, receiver placement, persistent-queue disk-store colocation, receiver port behavior, operation propagation list, batch retry behavior, and timestamp/distributed-system-ID conflict rules match the official documentation.
- The TLS properties are current and avoid the deprecated `gateway-ssl-*` family. The integrated-security statement that gateway components use their server member's credentials is correct.
- `read-serialized=true` is appropriate for servers that should handle PDX values without application domain classes, but it disables PDX delta propagation and can affect update bandwidth.
- Some recommended operational signals, such as an exact oldest-event age and application-level conflict counts, may require custom instrumentation. The native gateway-sender management bean exposes queue size, bytes overflowed to disk, batch rates, retry totals, and events exceeding the configured alert threshold.
- All eight links in the post's Official References section returned HTTP 200 and led to the intended Apache Geode documentation pages.
