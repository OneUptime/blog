# How to Instrument Multi-Tenant Background Job Processing with OpenTelemetry Tenant-Aware Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Background Jobs, Multi-Tenant, Job Queues

Description: Instrument multi-tenant background job processing with OpenTelemetry for tenant-aware routing and per-tenant job performance visibility.

Background jobs in multi-tenant SaaS need careful management. A large tenant running a massive export should not starve smaller tenants of processing capacity. OpenTelemetry instrumentation lets you see per-tenant job throughput, detect queue starvation, and ensure fair scheduling across tenants.

## Tenant-Aware Job Queue Setup

Here is a job processing system that routes jobs to per-tenant queues and instruments everything:

```python
# job_processor.py
from opentelemetry import trace, metrics, context
from opentelemetry.trace import StatusCode, Link
import json

tracer = trace.get_tracer("jobs.processor")
meter = metrics.get_meter("jobs.processor")

# Metrics
job_enqueued = meter.create_counter(
    "jobs.enqueued",
    description="Number of jobs enqueued",
    unit="1",
)

job_processed = meter.create_counter(
    "jobs.processed",
    description="Number of jobs processed",
    unit="1",
)

job_duration = meter.create_histogram(
    "jobs.duration",
    description="Time to process a job",
    unit="ms",
)

job_queue_depth = meter.create_up_down_counter(
    "jobs.queue_depth",
    description="Current number of jobs in queue per tenant",
    unit="1",
)

job_wait_time = meter.create_histogram(
    "jobs.wait_time",
    description="Time a job spent waiting in the queue",
    unit="ms",
)

class TenantJobQueue:
    def __init__(self, redis_client):
        self.redis = redis_client

    async def enqueue(self, tenant_id: str, job_type: str, payload: dict,
                      priority: str = "normal"):
        """Enqueue a job to the tenant-specific queue."""
        with tracer.start_as_current_span(
            "job.enqueue",
            attributes={
                "tenant.id": tenant_id,
                "job.type": job_type,
                "job.priority": priority,
            }
        ) as span:
            # Capture the trace context so the worker can link back
            span_context = span.get_span_context()

            job = {
                "id": generate_job_id(),
                "tenant_id": tenant_id,
                "type": job_type,
                "payload": payload,
                "priority": priority,
                "enqueued_at": time.time(),
                "trace_id": format(span_context.trace_id, '032x'),
                "span_id": format(span_context.span_id, '016x'),
            }

            # Route to tenant-specific queue with priority
            queue_name = f"jobs:{tenant_id}:{priority}"
            await self.redis.lpush(queue_name, json.dumps(job))

            job_enqueued.add(1, {
                "tenant.id": tenant_id,
                "job.type": job_type,
                "job.priority": priority,
            })

            job_queue_depth.add(1, {
                "tenant.id": tenant_id,
                "job.priority": priority,
            })

            span.set_attribute("job.id", job["id"])
            span.set_attribute("job.queue", queue_name)

            return job["id"]
```

## Fair Scheduling Worker

The worker uses weighted fair queuing to prevent any single tenant from monopolizing the processor:

```python
# job_worker.py
class FairSchedulingWorker:
    def __init__(self, redis_client, max_concurrent_per_tenant: int = 5):
        self.redis = redis_client
        self.max_concurrent = max_concurrent_per_tenant
        self.tenant_semaphores = {}

    async def run(self):
        """Main worker loop with fair tenant scheduling."""
        while True:
            # Get all tenant queues
            tenant_queues = await self._get_active_tenant_queues()

            for queue_name in tenant_queues:
                tenant_id = self._extract_tenant_id(queue_name)

                # Check if this tenant has capacity
                current = self.tenant_semaphores.get(tenant_id, 0)
                if current >= self.max_concurrent:
                    continue

                job_data = await self.redis.rpop(queue_name)
                if job_data:
                    job = json.loads(job_data)
                    asyncio.create_task(self._process_job(job))

    async def _process_job(self, job: dict):
        """Process a single job with tracing linked to the enqueue span."""
        # Create a link back to the enqueue span
        enqueue_context = trace.SpanContext(
            trace_id=int(job["trace_id"], 16),
            span_id=int(job["span_id"], 16),
            is_remote=True,
        )

        wait_time = (time.time() - job["enqueued_at"]) * 1000

        with tracer.start_as_current_span(
            "job.process",
            links=[Link(enqueue_context)],
            attributes={
                "tenant.id": job["tenant_id"],
                "job.type": job["type"],
                "job.id": job["id"],
                "job.priority": job["priority"],
                "job.wait_time_ms": wait_time,
            }
        ) as span:
            self.tenant_semaphores[job["tenant_id"]] = \
                self.tenant_semaphores.get(job["tenant_id"], 0) + 1

            job_wait_time.record(wait_time, {
                "tenant.id": job["tenant_id"],
                "job.type": job["type"],
            })

            job_queue_depth.add(-1, {
                "tenant.id": job["tenant_id"],
                "job.priority": job["priority"],
            })

            start = time.time()
            try:
                handler = self._get_handler(job["type"])
                result = await handler(job["payload"])
                span.set_attribute("job.status", "success")

                job_processed.add(1, {
                    "tenant.id": job["tenant_id"],
                    "job.type": job["type"],
                    "job.status": "success",
                })

            except Exception as e:
                span.set_status(StatusCode.ERROR, str(e))
                span.record_exception(e)
                span.set_attribute("job.status", "failed")

                job_processed.add(1, {
                    "tenant.id": job["tenant_id"],
                    "job.type": job["type"],
                    "job.status": "failed",
                })

            finally:
                duration_ms = (time.time() - start) * 1000
                job_duration.record(duration_ms, {
                    "tenant.id": job["tenant_id"],
                    "job.type": job["type"],
                })

                self.tenant_semaphores[job["tenant_id"]] -= 1
```

## Detecting Queue Starvation

Monitor for tenants whose jobs are waiting too long:

```python
# starvation_detector.py
async def check_queue_starvation():
    """Periodically check for tenants with excessive queue wait times."""
    with tracer.start_as_current_span("jobs.starvation_check") as span:
        tenant_queues = await get_all_tenant_queue_stats()

        starving_tenants = []
        for tenant_id, stats in tenant_queues.items():
            if stats["oldest_job_age_seconds"] > 300:  # 5 minutes
                starving_tenants.append(tenant_id)

        span.set_attribute("jobs.starving_tenant_count", len(starving_tenants))

        if starving_tenants:
            span.add_event("Queue starvation detected", {
                "affected_tenants": ",".join(starving_tenants),
            })
```

## Key Insights

With this instrumentation, you get answers to the questions that matter for multi-tenant job processing: Which tenants are generating the most jobs? What is the average wait time per tenant? Are high-priority jobs being processed first? Is any tenant starving because another tenant is flooding the queue? The combination of per-tenant metrics and linked traces from enqueue to processing gives you the visibility needed to tune your fair scheduling algorithms and capacity limits.
