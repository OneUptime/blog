# How to Plan Worker Capacity When Message Processing Times Vary Widely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Message Queue, Performance, Scalability, Monitoring

Description: Size worker slots from the complete service-time distribution and isolate long tasks without mistaking prefetch for execution capacity.

---

A queue where most messages take 100 ms can still spend half its worker time on tasks lasting ten seconds. Sizing from the median processing time hides that demand. Sizing from the overall mean captures the work volume, but still says little about how long a short task will wait behind long tasks.

Start with worker occupancy, then validate queue delay and memory under the actual mix and ordering of messages.

## Measure occupied time per task class

For each class, record arrival rate, mean processing time, processing-time percentiles, retries, and memory retained while running. Separate time waiting in the broker from time occupying a worker slot.

If a worker slot remains occupied during a network call or retry sleep, include that duration. For asynchronous concurrency, define a slot as the actual bounded execution unit and measure its behavior; a coroutine count is not interchangeable with a CPU core.

The simple demand model is:

```text
busy slots = sum(arrival_rate_i * mean_slot_time_i)
planned slots = ceil(busy slots / target_occupancy)
```

Arrival rates should count attempts if the service times measure attempts. If the business forecast counts original messages, add retry and redelivery demand consistently.

Celery's optimization guide emphasizes checking whether task duration and arrival rate make the queue sustainable before tuning configuration. [Celery task-capacity guidance](https://docs.celeryq.dev/en/stable/userguide/optimizing.html#ensuring-operations).

## Work a skewed-duration example

Assume 50 attempts/s, with 99% taking 0.1 seconds and 1% taking 10 seconds. These durations are fixed values for the example, not a claim about production distributions.

```text
mean occupied time = 0.99 * 0.1 + 0.01 * 10 = 0.199 seconds
mean busy slots    = 50 * 0.199 = 9.95
```

The long class is 1% of attempts but consumes `5 / 9.95`, or about 50.3%, of occupied worker time. A median-only estimate would predict five busy slots, roughly half the required work capacity.

At a deliberately chosen 70% target occupancy:

```text
planned pooled slots = ceil(9.95 / 0.70) = 15
```

The 70% value is a starting assumption to test against queue-delay objectives, not a universal safe utilization level. Fifteen slots cannot guarantee a latency target for arbitrary bursts or a heavier unseen tail.

A calculator makes the class contribution explicit:

```python
from math import ceil

classes = {
    'short': (49.5, 0.1),
    'long': (0.5, 10.0),
}
work = {name: rate * seconds for name, (rate, seconds) in classes.items()}
print(work)  # {'short': 4.95, 'long': 5.0}
print(ceil(sum(work.values()) / 0.70))  # 15 pooled slots
print({name: ceil(demand / 0.70) for name, demand in work.items()})
# {'short': 8, 'long': 8}
```

## Decide whether to separate long and short work

In a shared pool, a burst of long tasks can occupy every slot, delaying short tasks despite adequate average capacity. Compare shared capacity with separate queues and workers.

For this example, independently rounding each class at 70% occupancy gives eight short-task slots and eight long-task slots. Sixteen isolated slots cost slightly more than fifteen pooled slots, but reserve capacity for short work. Celery specifically recommends separate workers and routing when long and short tasks have different execution needs. [Celery prefetch and workload separation](https://docs.celeryq.dev/en/stable/userguide/optimizing.html#prefetch-limits).

For a Celery application whose tasks are actually registered with these names, illustrative routing is:

```python
task_routes = {
    'jobs.send_receipt': {'queue': 'short'},
    'jobs.build_report': {'queue': 'long'},
}
```

Start dedicated workers with the corresponding queues:

```bash
celery -A app worker -Q short --concurrency=8 --hostname=short@%h
celery -A app worker -Q long --concurrency=8 --hostname=long@%h
```

Replace `app` and the task names with the real application. Verify producer routing as well as worker subscriptions. Queue isolation does not isolate a shared database or third-party API, so give each class an appropriate downstream concurrency allowance.

## Keep prefetch separate from execution slots

Prefetch controls deliveries a consumer can reserve before acknowledgement. Increasing it does not create execution capacity. RabbitMQ applies a non-global prefetch count per consumer, which matters when a process creates several consumers. [RabbitMQ consumer prefetch](https://www.rabbitmq.com/docs/consumer-prefetch).

For Celery, `worker_prefetch_multiplier` interacts with concurrency and acknowledgement timing. With early acknowledgement, multiplier one can still leave extra reserved tasks behind running tasks. Late acknowledgement changes that accounting and requires tasks that tolerate repeated execution. Inspect the installed Celery version and broker support before applying settings copied from another deployment. [Celery reserving one task at a time](https://docs.celeryq.dev/en/stable/userguide/optimizing.html#reserve-one-task-at-a-time).

Measure broker-ready, reserved, and executing tasks separately. A falling ready count can simply mean tasks moved into worker memory rather than completed.

## Validate tails, bursts, and resource ceilings

Replay the measured distribution and arrival timeline. Include clustered long tasks, not just an evenly interleaved 99-to-1 sequence. Compare queue wait and total completion latency by class, successful throughput, oldest unfinished age, and retry rate.

A completed-task sample can hide unfinished slow tasks at the end of a test. Track outstanding work and allow the observation window to cover the slowest relevant tasks. Reassess the mean when payload sizes or tenant mix changes.

Check CPU and memory independently of slot occupancy. Eight processes executing memory-heavy reports may exceed a container's memory limit even when the average task footprint is small. Prefetched payloads add another memory term. For CPU-bound work, increasing process concurrency beyond usable CPU can increase service time instead of throughput.

Finally, run a finite backlog recovery test while new messages continue arriving. The plan should satisfy both steady demand and the completion deadline for accumulated work. Keep the smallest configuration that meets those measured objectives across the relevant mix; average utilization alone cannot establish that result.
