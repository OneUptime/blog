# Validation Summary: Why KahaDB Journal Files Never Shrink: Finding the Queue or Subscriber Holding Them Open

## Status
validated

## Post Type
Troubleshooting and operational guide

## Technologies Covered
- Apache ActiveMQ Classic
- KahaDB message store and journal cleanup
- Java Management Extensions (JMX)
- JMS queues and durable topic subscriptions
- Log4j, reload4j, and Log4j 2 runtime logging

## Sources Consulted
- [Why do KahaDB log files remain after cleanup](https://activemq.apache.org/components/classic/documentation/why-do-kahadb-log-files-remain-after-cleanup)
- [ActiveMQ Classic KahaDB reference](https://activemq.apache.org/components/classic/documentation/kahadb)
- [Manage durable subscribers](https://activemq.apache.org/components/classic/documentation/manage-durable-subscribers)
- [Per-destination policies](https://activemq.apache.org/components/classic/documentation/per-destination-policies)
- [ActiveMQ Classic JMX reference](https://activemq.apache.org/components/classic/documentation/jmx)
- [How can I enable detailed logging](https://activemq.apache.org/components/classic/documentation/how-can-i-enable-detailed-logging)
- [How do I back up KahaDB](https://activemq.apache.org/components/classic/documentation/how-do-i-back-up-kahadb)
- [Current Apache ActiveMQ Classic `MessageDatabase` source](https://github.com/apache/activemq/blob/main/activemq-kahadb-store/src/main/java/org/apache/activemq/store/kahadb/MessageDatabase.java)
- [Current Apache ActiveMQ Classic `KahaDBStore` source](https://github.com/apache/activemq/blob/main/activemq-kahadb-store/src/main/java/org/apache/activemq/store/kahadb/KahaDBStore.java)
- [Current Apache ActiveMQ Classic `Journal` source](https://github.com/apache/activemq/blob/main/activemq-kahadb-store/src/main/java/org/apache/activemq/store/kahadb/disk/journal/Journal.java)
- [Current Apache ActiveMQ Classic `BrokerViewMBean` source](https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/jmx/BrokerViewMBean.java)
- [Current Apache ActiveMQ Classic `Log4JConfigView` source](https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/jmx/Log4JConfigView.java)
- [Current Apache ActiveMQ Classic `SubscriptionViewMBean` source](https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/jmx/SubscriptionViewMBean.java)
- [Current Apache ActiveMQ Classic `DurableSubscriptionViewMBean` source](https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/jmx/DurableSubscriptionViewMBean.java)

## Issues Found
- The post described KahaDB journal segments as fixed-size. The KahaDB reference defines `journalMaxFileLength` as a hint for the maximum data-log size, and current KahaDB supports configurable preallocation. Changed the wording to describe rolling segments with a configured target maximum.
- The post said a newer acknowledgement can keep an older message file relevant. The dependency runs in the other direction: an acknowledgement file must be retained when it acknowledges a message in another journal file that is still in use, because removing the ACK would cause recovery to redeliver that message. Corrected the dependency explanation.
- Archived logs were presented as a durable owner of live journal references, and the general growth statement did not account for intentional archiving. Clarified that `archiveDataLogs` moves otherwise eligible logs to `directoryArchive` instead of deleting them: active-store usage can decline while the archive continues to consume capacity on its filesystem.
- The sample treated `dest:1:EVENTS.DURABLE` as though the suffix identified a durable subscriber. In the cleanup trace, `1:<name>` identifies a topic. Changed the example to `dest:1:EVENTS` and added the correct method for identifying the exact durable subscriber: cross-reference durable-subscription MBeans and, where emitted, nearby subscription TRACE records.
- The queue investigation advice referred to JMX enqueue/dequeue rates. The destination MBean exposes cumulative `EnqueueCount` and `DequeueCount`, not rate attributes. Replaced the names with the exact JMX attributes and explained that rates are derived by sampling counters over time.
- The durable-subscriber explanation could imply that all topic traffic is stored in KahaDB. Clarified that KahaDB retains matching persistent messages for an offline durable subscription until consumption or expiry processing.
- The manual-deletion warning stated that removal always breaks the recovery graph. Changed it to the accurate risk statement that manual removal can break recovery and cause message loss or an unrecoverable store.

## Review Notes
- The logger category and cleanup trace behavior are current. Trace wording and the presence of per-subscription `pendingCount` records can vary by ActiveMQ Classic release, so the example appropriately remains labeled as simplified.
- ActiveMQ Classic 5.17.0 and later uses Log4j 2; 5.16.4 through 5.16.x uses reload4j, and older releases use Log4j 1. The post avoids a version-specific logging configuration snippet. The Broker MBean operation retains the legacy name `reloadLog4jProperties`, and current broker source reconfigures Log4j 2 through that operation.
- The warning about copying a live KahaDB directory is correct. Apache's backup procedure requires freezing the filesystem to obtain a consistent snapshot before using the normal backup mechanism.
