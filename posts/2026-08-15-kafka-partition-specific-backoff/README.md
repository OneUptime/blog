# Back Off One Kafka Partition Without Pausing Healthy Partitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Java, Consumer, Partition, Backoff, Offset Management

Description: Pause only a failing Kafka partition, keep polling healthy assignments, and resume safely without committing past failed records.

---

Sleeping the Kafka consumer thread after one record fails delays every assigned partition and can exceed `max.poll.interval.ms`. Kafka provides partition-level flow control: pause the failed `TopicPartition`, continue calling `poll`, and resume it when its backoff expires.

Offset handling is the correctness-critical part.

## Pause Fetching, Not the Consumer Loop

`KafkaConsumer.pause` prevents future `poll` calls from returning records for the specified assigned partitions. It does not unsubscribe them and does not itself trigger a group rebalance.

Keep all consumer calls on the consumer thread because `KafkaConsumer` is not thread-safe:

```java
Map<TopicPartition, Long> resumeAtNanos = new HashMap<>();
Map<TopicPartition, Integer> failures = new HashMap<>();

while (running) {
    long now = System.nanoTime();

    Set<TopicPartition> due = resumeAtNanos.entrySet().stream()
        .filter(entry -> now - entry.getValue() >= 0)
        .map(Map.Entry::getKey)
        .filter(consumer.assignment()::contains)
        .collect(Collectors.toSet());

    if (!due.isEmpty()) {
        consumer.resume(due);
        due.forEach(resumeAtNanos::remove);
    }

    ConsumerRecords<String, Event> records = consumer.poll(Duration.ofMillis(100));
    Map<TopicPartition, OffsetAndMetadata> completedOffsets = new HashMap<>();

    for (TopicPartition partition : records.partitions()) {
        for (ConsumerRecord<String, Event> record : records.records(partition)) {
            try {
                processIdempotently(record);
                completedOffsets.put(
                    partition,
                    new OffsetAndMetadata(
                        record.offset() + 1,
                        record.leaderEpoch(),
                        ""));
                failures.remove(partition);
            } catch (RetryableDependencyException error) {
                int failureCount = failures.merge(partition, 1, Integer::sum);
                long delayNanos = fullJitterNanos(failureCount);

                consumer.pause(Set.of(partition));
                consumer.seek(partition, record.offset());
                resumeAtNanos.put(
                    partition,
                    System.nanoTime() + delayNanos);
                break; // Ignore later records from this partition's current batch.
            }
        }
    }

    if (!completedOffsets.isEmpty()) {
        consumer.commitSync(completedOffsets);
    }
}
```

The loop continues calling `poll` with a 100-millisecond timeout, allowing Kafka group management and healthy partitions to progress. The actual interval between calls also includes processing and commit time, and rebalance callbacks can make `poll` exceed its timeout. A production implementation should cap backoff delays to a reasonable maximum and enforce an explicit maximum attempt or record-age policy.

## Seek Back to the Failed Offset

`poll` can return several records from one partition and advance the consumer's in-memory position beyond all of them. Pausing does not put already-returned records back.

When processing fails at offset `42`, break out of that partition's batch and `seek(partition, 42)`. On resume, the failed record is fetched again. The handler must be idempotent because a crash can also replay a previously applied record whose offset was not committed.

With automatic offset commits, the consumer can commit a position beyond work the application finished. Set `enable.auto.commit=false` and commit only the next offset after contiguous completed work. Never commit offset `n + 1` if an earlier offset in that partition is still pending.

## Backoff State Is Partition State

Maintain independent failure counts and deadlines per `TopicPartition`. Reset a partition's count after its failed record succeeds, not after an unrelated partition succeeds.

Classify failures:

- Retry a temporary downstream timeout by pausing that partition.
- Send a permanently malformed record to an audited dead-letter path, then advance according to policy.
- Stop the consumer for systemic corruption or an invariant violation.

If the downstream failure affects every partition, per-partition pause will eventually pause them all. A shared circuit breaker or client-side rate limiter is more appropriate for a common dependency outage.

## Handle Rebalances

Kafka documents that pause state is not preserved across a rebalance. In a `ConsumerRebalanceListener`:

- On revocation, finish or cancel in-flight work, commit only completed offsets, and remove local timers for partitions no longer owned.
- On loss, cancel or fence in-flight work and remove local timers without committing because ownership may already have moved.
- On assignment, rebuild durable retry state if the application persists it, and reapply `pause` to every currently assigned partition with an active timer, not only the newly assigned partitions passed to `onPartitionsAssigned`.

Do not call `pause`, `resume`, `seek`, or `commitSync` from a scheduler thread. A scheduler can enqueue a command and call `wakeup`, but the consumer thread should perform the consumer API calls. Because `wakeup` makes the current or next interruptible consumer call throw `WakeupException`, the consumer loop must catch it, drain queued commands, and continue unless it is shutting down.

If processing itself can approach `max.poll.interval.ms`, move record work to bounded workers while the consumer thread keeps polling, pause partitions with outstanding work, and carefully coordinate contiguous offsets. That architecture is more complex than the single-threaded example and must fence results after revocation.

## Official Documentation

- [Kafka 4.1 `KafkaConsumer` API](https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Kafka consumer configuration](https://kafka.apache.org/41/generated/consumer_config.html)
- [Kafka `ConsumerRebalanceListener` API](https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html)
- [Kafka `TopicPartition` API](https://kafka.apache.org/41/javadoc/org/apache/kafka/common/TopicPartition.html)

## Conclusion

Pause only the failing partition, keep polling, seek back to its failed offset, and commit only contiguous completed work. Treat pause timers as assignment-scoped state and rebuild them explicitly after a rebalance.
