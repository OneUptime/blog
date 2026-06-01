# Validation Summary: How to Connect Apache Kafka Applications to Azure Event Hubs

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Azure Event Hubs
- Apache Kafka protocol
- Kafka Java client
- confluent-kafka Python client
- KafkaJS
- SASL/PLAIN
- SASL/OAUTHBEARER
- Microsoft Entra ID
- Kafka MirrorMaker

## Sources Consulted
- Microsoft Learn: What is Azure Event Hubs for Apache Kafka? https://learn.microsoft.com/en-ie/azure/event-hubs/azure-event-hubs-apache-kafka-overview
- Microsoft Learn: Apache Kafka client configurations for Azure Event Hubs https://learn.microsoft.com/en-us/azure/event-hubs/apache-kafka-configurations
- Microsoft Learn: Compare Azure Event Hubs tiers https://learn.microsoft.com/en-us/azure/event-hubs/compare-tiers
- Microsoft Learn: Azure Event Hubs quotas and limits https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-quotas
- Microsoft Learn: Log compaction in Azure Event Hubs https://learn.microsoft.com/en-us/azure/event-hubs/log-compaction
- Microsoft Learn: Authorize access to Azure Event Hubs https://learn.microsoft.com/en-us/azure/event-hubs/authorize-access-event-hubs
- Azure GitHub: Azure Event Hubs for Apache Kafka Ecosystems https://github.com/Azure/azure-event-hubs-for-kafka
- Apache Kafka documentation: MirrorMaker configs https://kafka.apache.org/38/configuration/mirrormaker-configs/
- Apache Kafka wiki: Kafka mirroring / MirrorMaker https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=27846330

## Issues Found
- The OAuth section used "Azure AD" terminology and showed a `DefaultAzureCredential` token fetch that was unused by the confluent-kafka OIDC configuration. Changed the section to Microsoft Entra ID terminology, removed the unused token-fetch code, and adjusted the OIDC scope to the Event Hubs namespace resource format used for Kafka clients.
- The post said compacted topics are not supported. Current Azure Event Hubs documentation supports log compaction for compacted Event Hubs/Kafka topics outside the Basic tier, so the limitation was corrected.
- The post said Kafka transactions are not supported. Current overview documentation says Kafka transactions are in public preview for Premium and Dedicated tiers, so the limitation was narrowed accordingly.
- The post said Kafka consumer groups created through the Kafka protocol are visible in the Azure portal and vice versa. Azure's Kafka guidance states Kafka consumer groups are distinct from portal-managed Event Hubs consumer groups, auto-created, managed through Kafka APIs, and not viewable in the Azure portal. The statement was corrected.
- The retention claim said Standard tier supports 1-90 days. Current Event Hubs tier documentation lists Standard retention up to 7 days and Premium/Dedicated up to 90 days, so the retention statement was corrected.
- The performance tuning snippet recommended `compression.type=lz4`, but Event Hubs for Kafka supports only no compression or gzip, with Kafka compression currently supported only on Premium and Dedicated tiers. Changed the default to `none` and added a short gzip tier caveat.
- The consumer tuning snippet changed `heartbeat.interval.ms` to 10000. Current Event Hubs Kafka configuration guidance recommends keeping the default heartbeat interval of 3000 ms. Updated the snippet accordingly.

## Review Notes
The Java, Python, and KafkaJS SASL/PLAIN examples align with the documented Event Hubs Kafka endpoint pattern: port 9093, SASL_SSL, PLAIN, username `$ConnectionString`, and the Event Hubs connection string as the password. The legacy MirrorMaker command is valid for older MirrorMaker usage, but future revisions could consider adding MirrorMaker 2 guidance for modern Kafka deployments.
