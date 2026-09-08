# How to Size Worker Pools and Queues for a Latency SLO

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Queue, Latency, Performance, Scalability

Description: Convert arrival rate and service-time distributions into worker concurrency, queue-wait and drain budgets, then verify them under burst and retry load.

---

A worker pool must complete work faster than it arrives, but `workers = arrival rate * average service time` provides only mean busy concurrency. Running exactly that many workers targets 100 percent utilization, leaves no room for variance, and can make queueing delay grow without bound.

Size workers from a utilization target, then size the queue from the latency and recovery policy.

## Define the queueing boundary

For one work class, measure:

```text
lambda  accepted arrival rate, jobs/second
S       mean worker service time, seconds/job
c       parallel worker slots
mu      aggregate measured service capacity, jobs/second
B       ready backlog, jobs
Wq      time waiting before service, seconds
```

Use successful acknowledgements or committed outcomes for completions. If a job remains unacknowledged while processing, distinguish ready backlog from in-flight work. Retries and redeliveries are additional attempts and consume capacity even when they do not represent new business jobs.

## Calculate a starting worker count

By Little's Law, mean workers busy is approximately:

```text
busy concurrency = lambda * S
```

Choose a target worker utilization `rho_target` below 1:

```text
c >= ceil(lambda * S / rho_target)
```

Suppose peak accepted arrival rate is 800 jobs/second, mean service time is 40 ms, and testing supports a 70 percent target:

```text
mean busy workers = 800 * 0.040 = 32
c = ceil(32 / 0.70) = 46 workers
```

This is an initial estimate. Workers may contend for CPU, database connections, locks, or partitions, so service capacity may not scale linearly with `c`. Run a concurrency sweep and choose the smallest worker count that provides the required throughput and latency without saturating a dependency.

Do not use p99 service time in the mean-concurrency identity. Preserve the whole distribution in load tests and split slow and fast classes when the mix is heterogeneous.

## Allocate the latency budget

Break the end-to-end SLO into components:

```text
end-to-end = publish + broker delay + queue wait + service + acknowledgement
```

If p99 end-to-end must be below 2 seconds, a design can allocate a nominal 1.2-second diagnostic budget to non-queue work and 0.8 seconds to queue waiting. Component p99 values are not additive, so meeting both component budgets does not by itself prove the end-to-end p99. Validate the joint end-to-end distribution. A rough average-backlog relationship is `Lq = lambda * Wq`, but it describes means, not a p99 queue limit.

Set queue admission and alerts using message age as well as depth. At 800 jobs/second, a depth of 400 represents about 0.5 seconds at that arrival rate only under stable, homogeneous conditions. Priority, partitions, redeliveries, and changing rates break the shortcut. Measure enqueue-to-start latency directly.

## Calculate drain time

When measured completion capacity `mu` exceeds ongoing arrivals, an idealized drain estimate is:

```text
net drain rate = mu - lambda
drain time     = B / (mu - lambda)
```

If 46 workers complete 1,000 jobs/second under the production mix, ongoing arrivals are 800 jobs/second, and backlog is 60,000:

```text
drain time = 60,000 / (1,000 - 800) = 300 seconds
```

At 980 arrivals per second, the same backlog takes 3,000 seconds. At or above 1,000 it never drains. This sensitivity is why capacity close to 100 percent utilization is fragile.

Use observed successful completion rate, not `c / mean service time`, when workers share constraints. Recalculate after autoscaling because new workers may reduce service rate per worker.

## Bound concurrency at downstream systems

Worker count, prefetch, and per-job fan-out create downstream concurrency:

```text
maximum in-flight deliveries = consumers * prefetch per consumer
maximum DB demand            = active jobs * DB operations held concurrently
```

RabbitMQ documents prefetch as the limit on unacknowledged deliveries and notes that appropriate values require workload testing. A high prefetch can improve throughput but concentrate messages, increase memory, and create a large redelivery wave after consumer failure.

Set a finite queue or admission policy. An unbounded in-memory queue converts overload into memory exhaustion and stale work. Decide whether to reject, delay upstream, spill durably, shed low-priority work, or dead-letter expired jobs. Tie message time-to-live to business usefulness and the latency SLO.

## Test realistic failure cases

Exercise:

- steady peak arrival rate and its production service-time mix;
- the fastest expected burst;
- one consumer or node failure with redelivery;
- downstream throttling and timeouts;
- poison messages and bounded delivery attempts;
- autoscaling from minimum to maximum;
- recovery and complete queue drain.

Record arrival, successful completion, ready and unacknowledged counts, oldest-message age, enqueue-to-start and end-to-end latency histograms, worker busy time, downstream waits, redeliveries, retry attempts, and dead-letter rate.

Separate service classes when a slow bulk job can block an interactive job. Dedicated queues or weighted admission can reserve capacity and make each SLO measurable.

## Conclusion

Use arrival rate times mean service time to estimate busy concurrency, then divide by a tested utilization target to obtain a starting worker count. Constrain it by downstream capacity, give queue wait an explicit share of the latency SLO, and use backlog drain time to verify recovery. Validate the design under bursts, retries, consumer loss, and mixed job sizes.

## Official Documentation

- [MIT OpenCourseWare: Queueing systems and Little's Law](https://ocw.mit.edu/courses/1-203j-logistical-and-transportation-planning-methods-fall-2006/resources/lec5/)
- [RabbitMQ consumer prefetch](https://www.rabbitmq.com/docs/consumer-prefetch)
- [RabbitMQ consumers and consumer capacity](https://www.rabbitmq.com/docs/consumers)
- [RabbitMQ consumer acknowledgements and redelivery](https://www.rabbitmq.com/docs/confirms)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
