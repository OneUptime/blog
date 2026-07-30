# Cleaning Up Abandoned Durable Subscribers Before They Exhaust Broker Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ, ActiveMQ Classic, Durable Subscription, JMS, Broker Operations

Description: Inventory and retire abandoned ActiveMQ Classic durable topic subscriptions without deleting live consumers or silently discarding required messages.

---

A durable topic subscription is a promise that the broker will retain matching messages while its subscriber is offline. That promise survives a process restart. It can also survive an application rename, an abandoned test environment, or a deployment that accidentally changes its identity.

The resulting backlog normally consumes persistent store rather than keeping every body in heap, but it still uses broker metadata and can drive store limits, cursor memory, expiry work, and recovery time. Cleanup must preserve the subscriptions that are intentionally offline.

This article covers ActiveMQ Classic. Artemis represents durable subscriptions as queues and has different auto-delete settings.

## Identify a durable subscription correctly

In JMS, a durable subscription is identified by more than a topic name. For a classic durable subscriber, the client identifier and subscription name form the durable identity; the topic, selector, and `noLocal` setting define what it receives.

If a deployment changes its client ID or subscription name, the broker does not infer a rename. It creates a new durable subscription and leaves the old one offline. Random or per-pod client IDs are therefore dangerous for durable consumers.

An inventory should include:

- client ID;
- subscription name;
- topic;
- selector and `noLocal` setting;
- active/inactive state;
- pending message count;
- last known owner, environment, and deployment;
- how long it has been offline;
- whether published messages have a TTL;
- store space attributable to its backlog where observable.

Use JMX or the ActiveMQ Classic web console to inspect durable subscribers. Do not decide from a topic's aggregate metrics alone.

## Distinguish abandoned from intentionally offline

A subscriber can be valid while inactive:

- a disaster-recovery consumer starts only during failover;
- a batch consumer runs once per day;
- a disconnected site is expected to catch up later;
- a paused deployment is awaiting a maintenance window.

Require evidence before removal:

1. the owning service or environment no longer exists, or its owner approves retirement;
2. the current deployment uses a different, verified identity;
3. pending messages are expired, exported, replayed elsewhere, or approved for disposal;
4. no active consumer is attached;
5. a rollback/recreation plan is documented.

Deleting the subscription discards its retained backlog. Recreating the same identity later does not restore those messages.

## Remove one subscription manually

Classic supports manual unsubscribe through management tools such as JConsole and the web console. A JMS application can also call `Session.unsubscribe(subscriptionName)` in the correct client-ID context, subject to the Jakarta Messaging rules: the durable subscription must not have an active consumer, and no message received from it may be part of a current transaction or remain unacknowledged in the session.

A safe manual sequence is:

1. stop the retired consumer deployment;
2. record the subscription identity and pending count;
3. browse or export a bounded evidence sample if required;
4. wait for the broker to mark it inactive;
5. unsubscribe the exact client ID and subscription name;
6. verify the durable subscription disappears;
7. watch store cleanup and active consumers;
8. retain the change record through the recovery window.

Never bulk-delete every inactive subscriber. “Inactive” describes connection state, not ownership.

## Configure automatic cleanup with an ownership policy

ActiveMQ Classic 5.6 introduced broker properties for offline durable removal:

```xml
<broker
    offlineDurableSubscriberTimeout="604800000"
    offlineDurableSubscriberTaskSchedule="3600000">
```

In this example the timeout is seven days and the broker checks hourly. Values are milliseconds. The documented default timeout is `-1`, which disables automatic removal; the task schedule defaults to 300,000 milliseconds.

Choose the timeout from the longest legitimate offline period plus operational margin. A seven-day value is unsafe if a monthly consumer is valid. Apply configuration through the deployment's supported configuration system and test the exact Classic version.

Before enabling auto-cleanup:

- establish a naming convention that maps identities to owners;
- alert well before the deletion threshold;
- exclude or redesign exceptional long-offline consumers;
- document that removal discards retained data;
- test upgrade and broker restart behavior;
- ensure clocks and monitoring are reliable;
- verify how configuration changes are rolled back.

## Use message expiry deliberately

Producers can give messages a time to live. Classic periodically checks expired messages retained for offline durable subscribers; `expireMessagesPeriod` on a topic policy controls the check interval. The documented default is 30 seconds, and the value can be tuned.

TTL and subscriber cleanup solve different problems:

- TTL says an individual message is no longer useful after a deadline;
- offline subscriber timeout says the durable consumer identity itself is abandoned.

With the default dead-letter strategy, expired messages may be routed to a DLQ. Setting `processExpired="false"` discards them instead. Include DLQ capacity and compliance requirements in the retention design.

## Prevent identity leaks in deployment automation

Use stable, intentional values:

```text
client ID: billing-ledger-prod
subscription: invoice-events-v2
```

Avoid hostnames, container IDs, random UUIDs, or rollout hashes unless every instance is intentionally a separate durable subscription. For horizontally scaled processing of one retained stream, confirm whether a virtual topic or queue better represents the desired delivery semantics; ActiveMQ Classic does not currently implement shared topic consumers.

Treat an identity change like a data migration:

1. decide how the old backlog will drain;
2. deploy and verify the new subscription;
3. stop publication gaps or duplicates through an explicit cutover;
4. retire the old subscription only after reconciliation.

## Monitor before store pressure becomes an incident

Track:

- count of active and inactive durable subscribers;
- offline duration by owned identity;
- pending messages and oldest message age;
- enqueue/dequeue rate;
- broker `StorePercentUsage` and growth;
- expiry and DLQ rate;
- KahaDB cleanup errors and retained journal growth.

Page an owner when a known subscriber exceeds its expected offline window. Create a lower-severity ticket before the automatic deletion threshold. The best cleanup system makes ownership visible before the broker has to delete anything.

## Official Documentation

- [Manage durable subscribers in ActiveMQ Classic](https://activemq.apache.org/components/classic/documentation/manage-durable-subscribers)
- [ActiveMQ Classic JMX reference](https://activemq.apache.org/components/classic/documentation/jmx)
- [ActiveMQ Classic message redelivery and DLQ handling](https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling)
- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1)
- [Why KahaDB log files remain after cleanup](https://activemq.apache.org/components/classic/documentation/why-do-kahadb-log-files-remain-after-cleanup)
