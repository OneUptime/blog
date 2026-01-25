# How to Prioritize Critical Requests in High-Load Rust Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Priority Queue, Load Management, Performance, Scalability

Description: When your Rust service is under heavy load, not all requests deserve equal treatment. Learn how to implement request prioritization using priority queues and admission control to keep critical traffic flowing smoothly.

---

When traffic spikes hit your service, the default behavior is to treat every request the same. That works fine until the queue backs up and your payment processing requests are stuck behind a flood of analytics pings. At that point, everything suffers equally, and your most important customers feel the pain first.

The solution is request prioritization. Instead of a single FIFO queue, you classify incoming requests by importance and serve high-priority work first. This article walks through implementing this pattern in Rust, with real code you can adapt to your own services.

## Why Priority Queues Matter Under Load

Consider a service that handles both checkout completions and product recommendation refreshes. Under normal load, both finish in milliseconds. But during a flash sale, your queue depth explodes. Without prioritization, a checkout request that arrived at T+500ms waits behind thousands of recommendation requests that arrived earlier. Your conversion rate tanks while your servers dutifully process low-value traffic.

Priority queues flip this dynamic. Critical requests jump ahead, and you shed load on less important work when capacity is constrained. The business impact is immediate: revenue-generating paths stay fast while background work absorbs the latency hit.

## Defining Priority Levels

Start by defining what "critical" means for your system. A simple three-tier model works for most services:

```rust
use std::cmp::Ordering;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Priority {
    Critical,  // Payments, auth, health checks
    Normal,    // Standard user requests
    Low,       // Analytics, prefetch, background sync
}

impl Priority {
    pub fn as_weight(&self) -> u8 {
        match self {
            Priority::Critical => 0,  // Lower number = higher priority
            Priority::Normal => 1,
            Priority::Low => 2,
        }
    }
}

impl Ord for Priority {
    fn cmp(&self, other: &Self) -> Ordering {
        // Reverse ordering so Critical < Normal < Low in the heap
        self.as_weight().cmp(&other.as_weight())
    }
}

impl PartialOrd for Priority {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
```

The key insight is mapping priority to a numeric weight. This lets you use Rust's standard `BinaryHeap` with minimal ceremony.

## Building the Priority Queue

Rust's `BinaryHeap` is a max-heap by default, so we wrap our request type to invert the ordering. Here's a complete implementation:

```rust
use std::collections::BinaryHeap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

#[derive(Debug)]
pub struct PrioritizedRequest {
    pub priority: Priority,
    pub arrived_at: Instant,
    pub payload: RequestPayload,
}

// Wrapper to control heap ordering
struct HeapEntry(PrioritizedRequest);

impl PartialEq for HeapEntry {
    fn eq(&self, other: &Self) -> bool {
        self.0.priority == other.0.priority
    }
}

impl Eq for HeapEntry {}

impl Ord for HeapEntry {
    fn cmp(&self, other: &Self) -> Ordering {
        // Primary: priority (Critical first)
        // Secondary: arrival time (older first, for fairness within tier)
        match self.0.priority.cmp(&other.0.priority) {
            Ordering::Equal => other.0.arrived_at.cmp(&self.0.arrived_at),
            other_ord => other_ord.reverse(), // Reverse because BinaryHeap is max-heap
        }
    }
}

impl PartialOrd for HeapEntry {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

pub struct PriorityQueue {
    heap: Mutex<BinaryHeap<HeapEntry>>,
    max_size: usize,
}

impl PriorityQueue {
    pub fn new(max_size: usize) -> Self {
        Self {
            heap: Mutex::new(BinaryHeap::with_capacity(max_size)),
            max_size,
        }
    }

    pub fn push(&self, request: PrioritizedRequest) -> Result<(), QueueFullError> {
        let mut heap = self.heap.lock().unwrap();
        if heap.len() >= self.max_size {
            return Err(QueueFullError);
        }
        heap.push(HeapEntry(request));
        Ok(())
    }

    pub fn pop(&self) -> Option<PrioritizedRequest> {
        let mut heap = self.heap.lock().unwrap();
        heap.pop().map(|entry| entry.0)
    }

    pub fn len(&self) -> usize {
        self.heap.lock().unwrap().len()
    }
}
```

The secondary sort by arrival time prevents starvation within a priority tier. Without it, a steady stream of Critical requests could keep Normal requests waiting indefinitely.

## Admission Control: Shedding Load Intelligently

A priority queue alone is not enough. When the queue fills up, you need to decide which requests to reject. The naive approach rejects the newest arrival, but that penalizes high-priority requests during overload.

Instead, implement admission control that considers priority:

```rust
impl PriorityQueue {
    pub fn try_admit(&self, request: PrioritizedRequest) -> AdmissionResult {
        let mut heap = self.heap.lock().unwrap();

        // If there's room, always admit
        if heap.len() < self.max_size {
            heap.push(HeapEntry(request));
            return AdmissionResult::Admitted;
        }

        // Queue is full. Check if we can evict a lower-priority request.
        if let Some(lowest) = heap.peek() {
            if request.priority < lowest.0.priority {
                // Incoming request has higher priority - evict the lowest
                let evicted = heap.pop().unwrap();
                heap.push(HeapEntry(request));
                return AdmissionResult::AdmittedWithEviction(evicted.0);
            }
        }

        // Cannot admit - would displace equal or higher priority work
        AdmissionResult::Rejected
    }
}

#[derive(Debug)]
pub enum AdmissionResult {
    Admitted,
    AdmittedWithEviction(PrioritizedRequest),
    Rejected,
}
```

This policy guarantees that Critical requests only get rejected when the queue is full of other Critical requests. During overload, Low-priority work gets evicted first, then Normal, keeping your most important traffic paths clear.

## Integrating with an Async Runtime

Real services use async runtimes like Tokio. Here's how to wire the priority queue into an async worker pool:

```rust
use tokio::sync::Notify;
use std::sync::Arc;

pub struct AsyncPriorityQueue {
    inner: PriorityQueue,
    notify: Notify,
}

impl AsyncPriorityQueue {
    pub fn new(max_size: usize) -> Arc<Self> {
        Arc::new(Self {
            inner: PriorityQueue::new(max_size),
            notify: Notify::new(),
        })
    }

    pub fn submit(&self, request: PrioritizedRequest) -> AdmissionResult {
        let result = self.inner.try_admit(request);
        if matches!(result, AdmissionResult::Admitted | AdmissionResult::AdmittedWithEviction(_)) {
            self.notify.notify_one();
        }
        result
    }

    pub async fn next(&self) -> PrioritizedRequest {
        loop {
            if let Some(req) = self.inner.pop() {
                return req;
            }
            self.notify.notified().await;
        }
    }
}

// Spawn worker tasks that pull from the queue
async fn run_workers(queue: Arc<AsyncPriorityQueue>, worker_count: usize) {
    let handles: Vec<_> = (0..worker_count)
        .map(|id| {
            let q = queue.clone();
            tokio::spawn(async move {
                loop {
                    let request = q.next().await;
                    process_request(request, id).await;
                }
            })
        })
        .collect();

    futures::future::join_all(handles).await;
}
```

The `Notify` primitive wakes a single waiting worker when new work arrives, avoiding thundering herd problems.

## Classifying Requests at the Edge

The final piece is mapping incoming requests to priority levels. This typically happens in middleware:

```rust
fn classify_request(req: &HttpRequest) -> Priority {
    // Health checks and payments are critical
    if req.path().starts_with("/health") || req.path().starts_with("/api/checkout") {
        return Priority::Critical;
    }

    // Background sync endpoints are low priority
    if req.path().starts_with("/api/sync") || req.path().starts_with("/api/analytics") {
        return Priority::Low;
    }

    // Check for priority header from trusted internal services
    if let Some(header) = req.headers().get("X-Priority") {
        if header == "critical" {
            return Priority::Critical;
        }
    }

    Priority::Normal
}
```

Keep classification logic simple and fast. The overhead of priority assignment should be negligible compared to actual request processing.

## Monitoring Your Priority Queue

Once deployed, you need visibility into how the queue behaves under load. Track these metrics:

- **Queue depth by priority tier**: Spot when low-priority work is backing up
- **Admission rate vs rejection rate**: Understand how much load you are shedding
- **Time-in-queue by priority**: Verify that Critical requests are not waiting
- **Eviction counts**: See how often high-priority work displaces low-priority work

Emit these as histograms or gauges to your observability stack. When you see Critical queue depth climbing, you know it is time to add capacity or investigate upstream issues.

## Wrapping Up

Request prioritization is not about making your service faster. It is about making your service fail gracefully. When load exceeds capacity, something has to give. The question is whether you choose what gives, or let the queue choose randomly.

With a priority queue and admission control, you guarantee that your most important traffic keeps flowing even when everything else is backed up. Your checkout path stays fast during the flash sale, and your analytics can wait until things calm down.

The patterns here translate directly to other ecosystems, but Rust's ownership model and zero-cost abstractions make it particularly well-suited for this kind of low-level control. You get predictable latency without garbage collection pauses, and the type system catches ordering bugs at compile time.

Start with three priority tiers, measure the results, and adjust from there. Your on-call engineers will thank you the next time traffic spikes.
