# Build a Data Residency Inventory for Queues, Caches, Logs, and Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Residency, Data Governance, Data Privacy, Architecture, Disaster Recovery

Description: Build an evidence-backed inventory of customer data across primary stores, queues, caches, telemetry, exports, and recovery copies.

---

A database inventory can say every production table is in the approved region while a failed job, debug log, or backup still holds a copy elsewhere. A residency inventory needs to follow data through the application, including the paths used during failures.

Build the inventory around data flows and copies. Cloud resource discovery is an input, but it cannot tell you whether a queue message contains a full customer document or just a reference.

## Start with One Representative Workflow

Choose a workflow such as uploading a document and generating a report. Trace a synthetic record from the browser through the API, database, queue, worker, object store, notification system, and export destination.

Then follow the exception paths: rejected requests, worker retries, dead-letter queues, crash reports, support investigations, restore drills, and account deletion. Ask which component retains data after the original request completes.

The [AWS Privacy Reference Architecture](https://docs.aws.amazon.com/prescriptive-guidance/latest/privacy-reference-architecture/aws-privacy-reference-architecture.html) models collection, processing, access, archival, and deletion as parts of the same workload. That lifecycle is a useful basis for an inventory even when the deployment uses another provider.

## Record Copies, Flows, and Evidence Separately

Use a record for each independently governed store or destination:

| Field | Example |
| --- | --- |
| Data class | Customer report content |
| Resource | Regional report retry queue |
| Account and environment | Production account, EU deployment |
| Storage and processing locations | Explicit service regions |
| Upstream and downstream | Report API → worker |
| Payload and identifiers | Document fragment, tenant ID, request ID |
| Retention and deletion | Queue expiry plus dead-letter retention |
| Secondary copies | Logs, retry export, backup |
| Owner and evidence | Messaging team; dated configuration export |

Store credential references, never credentials, in the inventory. An evidence link should identify the account, resource, observation time, and setting examined. “Configured in Europe” is not sufficient to distinguish a live observation from a design proposal.

Keep a separate flow record for transfers. Two approved resources do not prove that an intermediate proxy or third-party processor is also approved.

## Discover the Copies Most Teams Miss

Inspect queue payloads, retry stores, and dead-letter destinations. A message with an embedded body is a copy even if it expires quickly. Include webhook delivery history and failed export payloads.

Review caches and search indexes for both values and identifying keys. Check persistence, snapshots, replicas, and operational dumps. “Cache” describes intended use; it does not establish that the data exists only in memory.

Inspect logs and traces for request bodies, query parameters, user IDs, SQL bindings, and exception locals. Follow collector routes and export destinations. Review alert notifications and incident attachments as additional copies instead of assuming the monitoring platform is the end of the path.

For object stores and databases, include replication settings, backup vaults, point-in-time recovery data, manual snapshots, exported files, and restored test environments. In Azure, for example, [storage redundancy options](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy) can create copies in a secondary region. The account's primary location alone does not describe its complete footprint.

## Combine Configuration Discovery with Application Knowledge

Collect cloud configuration from every relevant account, subscription, and project. Record what the discovery tool does not cover, including unsupported resource types and inaccessible environments.

Compare that resource list with application configuration and infrastructure definitions. Review exporter endpoints, connection references, replication destinations, and scheduled jobs. Interview the teams that run support, analytics, and disaster recovery: their exports often bypass the normal request path.

Use synthetic canary data to test documented flows in a nonproduction environment. Search only authorized destinations and avoid copying real customer payloads into the inventory itself. Absence from a search result is weak evidence when sampling, access restrictions, or retention limits can hide a copy.

## Preserve Historical State

Track both current configuration and historical exposure. Google documents that changing a [Pub/Sub message storage policy](https://docs.cloud.google.com/pubsub/docs/resource-location-restriction) does not relocate messages already published under the old policy. Similar lifecycle questions should be asked of every retained copy without assuming all services behave identically.

For a corrected destination, record when new writes stopped, how existing data is removed or expires, and what evidence closes the issue. Separate inaccessible backups retained under policy from active copies still used by the application.

## Turn the Inventory into a Release Check

Require every new data destination to declare its payload class, location, retention, owner, and secondary copies. Diff configuration exports against the approved inventory and investigate new destinations rather than accepting a resource tag as proof.

Useful completion measures include the percentage of stores with verified locations, flows with known destinations, and recovery copies with tested restore procedures. Re-run the workflow after changing observability, authentication, backups, or messaging. The inventory stays useful when it describes the running system and its failure paths, not just the original architecture diagram.
