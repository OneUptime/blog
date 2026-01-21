# How to Use Redis for Job Scheduling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Job Scheduling, Delayed Jobs, Cron, Task Queue, Background Jobs

Description: A comprehensive guide to implementing job scheduling with Redis, covering delayed jobs, recurring tasks, priority queues, and production patterns for reliable task execution.

---

Job scheduling is essential for modern applications - from sending reminder emails and generating reports to processing batch data and cleaning up resources. Redis provides powerful primitives for building job scheduling systems with delayed execution, priorities, and recurring tasks.

In this guide, we will build a complete job scheduling system using Redis, covering delayed jobs, cron-like scheduling, priority queues, and production considerations.

## Why Redis for Job Scheduling?

Redis offers several advantages for job scheduling:

- **Sorted Sets**: Perfect for time-based job ordering with O(log N) operations
- **Atomic Operations**: Prevent race conditions when claiming jobs
- **Persistence**: Jobs survive restarts with RDB/AOF
- **Pub/Sub**: Real-time notifications when jobs are ready
- **Lua Scripts**: Complex atomic operations for reliable job processing
- **High Performance**: Handle millions of scheduled jobs

## Basic Delayed Job Queue

### Core Implementation

```python
import redis
import json
import uuid
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Callable, Any
from dataclasses import dataclass, asdict
from enum import Enum
import threading

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class JobStatus(Enum):
    PENDING = "pending"
    SCHEDULED = "scheduled"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class Job:
    job_id: str
    job_type: str
    payload: Dict[str, Any]
    scheduled_at: float  # Unix timestamp
    created_at: float
    priority: int = 0
    max_retries: int = 3
    retry_count: int = 0
    status: str = "scheduled"
    result: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "job_id": self.job_id,
            "job_type": self.job_type,
            "payload": json.dumps(self.payload),
            "scheduled_at": self.scheduled_at,
            "created_at": self.created_at,
            "priority": self.priority,
            "max_retries": self.max_retries,
            "retry_count": self.retry_count,
            "status": self.status,
            "result": self.result or "",
            "error": self.error or ""
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'Job':
        return cls(
            job_id=data["job_id"],
            job_type=data["job_type"],
            payload=json.loads(data["payload"]),
            scheduled_at=float(data["scheduled_at"]),
            created_at=float(data["created_at"]),
            priority=int(data.get("priority", 0)),
            max_retries=int(data.get("max_retries", 3)),
            retry_count=int(data.get("retry_count", 0)),
            status=data.get("status", "scheduled"),
            result=data.get("result") or None,
            error=data.get("error") or None
        )


class JobScheduler:
    SCHEDULED_JOBS_KEY = "jobs:scheduled"
    PROCESSING_JOBS_KEY = "jobs:processing"
    JOB_LOCK_TTL = 300  # 5 minutes

    def schedule_job(self, job_type: str, payload: Dict,
                     delay_seconds: int = 0,
                     run_at: datetime = None,
                     priority: int = 0,
                     max_retries: int = 3) -> Job:
        """Schedule a job for future execution."""
        job_id = str(uuid.uuid4())
        now = time.time()

        if run_at:
            scheduled_at = run_at.timestamp()
        else:
            scheduled_at = now + delay_seconds

        job = Job(
            job_id=job_id,
            job_type=job_type,
            payload=payload,
            scheduled_at=scheduled_at,
            created_at=now,
            priority=priority,
            max_retries=max_retries
        )

        pipe = r.pipeline()

        # Store job data
        pipe.hset(f"job:{job_id}", mapping=job.to_dict())

        # Add to scheduled jobs sorted set
        # Score combines timestamp and priority for ordering
        score = scheduled_at - (priority / 1000)  # Higher priority = lower score
        pipe.zadd(self.SCHEDULED_JOBS_KEY, {job_id: score})

        pipe.execute()

        return job

    def schedule_in(self, job_type: str, payload: Dict,
                    seconds: int = 0, minutes: int = 0,
                    hours: int = 0, days: int = 0, **kwargs) -> Job:
        """Convenience method to schedule with time units."""
        total_seconds = seconds + (minutes * 60) + (hours * 3600) + (days * 86400)
        return self.schedule_job(job_type, payload, delay_seconds=total_seconds, **kwargs)

    def get_job(self, job_id: str) -> Optional[Job]:
        """Get a job by ID."""
        job_data = r.hgetall(f"job:{job_id}")
        if not job_data:
            return None
        return Job.from_dict(job_data)

    def cancel_job(self, job_id: str) -> bool:
        """Cancel a scheduled job."""
        job = self.get_job(job_id)
        if not job or job.status not in ["scheduled", "pending"]:
            return False

        pipe = r.pipeline()
        pipe.zrem(self.SCHEDULED_JOBS_KEY, job_id)
        pipe.hset(f"job:{job_id}", "status", "cancelled")
        pipe.execute()

        return True

    def get_due_jobs(self, limit: int = 100) -> List[str]:
        """Get jobs that are due for execution."""
        now = time.time()

        # Get jobs with score <= now
        return r.zrangebyscore(
            self.SCHEDULED_JOBS_KEY,
            "-inf",
            now,
            start=0,
            num=limit
        )

    def claim_job(self, job_id: str, worker_id: str) -> Optional[Job]:
        """Atomically claim a job for processing."""
        claim_script = """
        local scheduled_key = KEYS[1]
        local processing_key = KEYS[2]
        local job_key = KEYS[3]
        local job_id = ARGV[1]
        local worker_id = ARGV[2]
        local now = tonumber(ARGV[3])
        local lock_ttl = tonumber(ARGV[4])

        -- Check if job exists in scheduled set
        local score = redis.call('ZSCORE', scheduled_key, job_id)
        if not score then
            return nil
        end

        -- Check if job is due
        if tonumber(score) > now then
            return nil
        end

        -- Move from scheduled to processing
        redis.call('ZREM', scheduled_key, job_id)
        redis.call('ZADD', processing_key, now + lock_ttl, job_id)

        -- Update job status
        redis.call('HSET', job_key, 'status', 'processing')
        redis.call('HSET', job_key, 'worker_id', worker_id)
        redis.call('HSET', job_key, 'started_at', now)

        return redis.call('HGETALL', job_key)
        """

        script = r.register_script(claim_script)
        result = script(
            keys=[self.SCHEDULED_JOBS_KEY, self.PROCESSING_JOBS_KEY, f"job:{job_id}"],
            args=[job_id, worker_id, time.time(), self.JOB_LOCK_TTL]
        )

        if not result:
            return None

        # Convert list to dict
        job_data = dict(zip(result[::2], result[1::2]))
        return Job.from_dict(job_data)

    def complete_job(self, job_id: str, result: Any = None) -> bool:
        """Mark a job as completed."""
        pipe = r.pipeline()

        pipe.zrem(self.PROCESSING_JOBS_KEY, job_id)
        pipe.hset(f"job:{job_id}", mapping={
            "status": "completed",
            "completed_at": time.time(),
            "result": json.dumps(result) if result else ""
        })

        # Keep completed job data for 24 hours
        pipe.expire(f"job:{job_id}", 86400)

        pipe.execute()
        return True

    def fail_job(self, job_id: str, error: str, retry: bool = True) -> bool:
        """Mark a job as failed, optionally retry."""
        job = self.get_job(job_id)
        if not job:
            return False

        pipe = r.pipeline()
        pipe.zrem(self.PROCESSING_JOBS_KEY, job_id)

        if retry and job.retry_count < job.max_retries:
            # Schedule retry with exponential backoff
            delay = 2 ** job.retry_count * 60  # 1min, 2min, 4min, ...
            retry_at = time.time() + delay

            pipe.hset(f"job:{job_id}", mapping={
                "status": "scheduled",
                "retry_count": job.retry_count + 1,
                "last_error": error
            })
            pipe.zadd(self.SCHEDULED_JOBS_KEY, {job_id: retry_at})
        else:
            # Mark as permanently failed
            pipe.hset(f"job:{job_id}", mapping={
                "status": "failed",
                "failed_at": time.time(),
                "error": error
            })
            pipe.expire(f"job:{job_id}", 7 * 86400)  # Keep for 7 days

        pipe.execute()
        return True

    def recover_stale_jobs(self) -> int:
        """Recover jobs that were being processed but worker died."""
        now = time.time()

        # Get processing jobs that have exceeded their lock time
        stale_jobs = r.zrangebyscore(
            self.PROCESSING_JOBS_KEY,
            "-inf",
            now
        )

        recovered = 0
        for job_id in stale_jobs:
            job = self.get_job(job_id)
            if job:
                # Return to scheduled queue
                pipe = r.pipeline()
                pipe.zrem(self.PROCESSING_JOBS_KEY, job_id)
                pipe.zadd(self.SCHEDULED_JOBS_KEY, {job_id: now})
                pipe.hset(f"job:{job_id}", "status", "scheduled")
                pipe.execute()
                recovered += 1

        return recovered


# Usage
scheduler = JobScheduler()

# Schedule a job to run in 5 minutes
job = scheduler.schedule_in(
    "send_email",
    {"to": "user@example.com", "template": "welcome"},
    minutes=5
)
print(f"Scheduled job: {job.job_id}")

# Schedule a high-priority job
job = scheduler.schedule_job(
    "process_payment",
    {"order_id": "123", "amount": 99.99},
    delay_seconds=0,
    priority=10
)

# Schedule a job at a specific time
job = scheduler.schedule_job(
    "generate_report",
    {"report_type": "daily_sales"},
    run_at=datetime(2026, 1, 22, 9, 0, 0)
)
```

## Job Worker

Process scheduled jobs:

```python
class JobWorker:
    def __init__(self, worker_id: str = None):
        self.worker_id = worker_id or str(uuid.uuid4())[:8]
        self.scheduler = JobScheduler()
        self.handlers: Dict[str, Callable] = {}
        self.running = False

    def register_handler(self, job_type: str, handler: Callable) -> None:
        """Register a handler function for a job type."""
        self.handlers[job_type] = handler

    def process_job(self, job: Job) -> None:
        """Process a single job."""
        handler = self.handlers.get(job.job_type)

        if not handler:
            self.scheduler.fail_job(
                job.job_id,
                f"No handler registered for job type: {job.job_type}",
                retry=False
            )
            return

        try:
            result = handler(job.payload)
            self.scheduler.complete_job(job.job_id, result)
            print(f"[{self.worker_id}] Completed job {job.job_id}")

        except Exception as e:
            print(f"[{self.worker_id}] Job {job.job_id} failed: {e}")
            self.scheduler.fail_job(job.job_id, str(e))

    def run(self, poll_interval: float = 1.0) -> None:
        """Start processing jobs."""
        self.running = True
        print(f"[{self.worker_id}] Worker started")

        while self.running:
            # Get due jobs
            due_jobs = self.scheduler.get_due_jobs(limit=10)

            if not due_jobs:
                time.sleep(poll_interval)
                continue

            for job_id in due_jobs:
                if not self.running:
                    break

                # Try to claim the job
                job = self.scheduler.claim_job(job_id, self.worker_id)

                if job:
                    self.process_job(job)

        print(f"[{self.worker_id}] Worker stopped")

    def stop(self) -> None:
        """Stop the worker gracefully."""
        self.running = False


# Define job handlers
def send_email_handler(payload: Dict) -> Dict:
    """Handler for send_email jobs."""
    print(f"Sending email to {payload['to']}")
    # Actual email sending logic here
    return {"sent": True, "recipient": payload["to"]}

def process_payment_handler(payload: Dict) -> Dict:
    """Handler for process_payment jobs."""
    print(f"Processing payment for order {payload['order_id']}")
    # Actual payment processing logic here
    return {"success": True, "order_id": payload["order_id"]}

def generate_report_handler(payload: Dict) -> Dict:
    """Handler for generate_report jobs."""
    print(f"Generating {payload['report_type']} report")
    # Actual report generation logic here
    return {"report_url": f"/reports/{payload['report_type']}.pdf"}

# Create and run worker
worker = JobWorker()
worker.register_handler("send_email", send_email_handler)
worker.register_handler("process_payment", process_payment_handler)
worker.register_handler("generate_report", generate_report_handler)

# Run in background thread
worker_thread = threading.Thread(target=worker.run)
worker_thread.start()

# Schedule some jobs
scheduler = JobScheduler()
scheduler.schedule_job("send_email", {"to": "test@example.com", "template": "test"})
scheduler.schedule_in("process_payment", {"order_id": "456", "amount": 50.00}, seconds=5)
```

## Recurring Jobs (Cron-like Scheduling)

Implement cron-style recurring jobs:

```python
from croniter import croniter

class RecurringJobScheduler:
    RECURRING_JOBS_KEY = "jobs:recurring"

    def __init__(self):
        self.scheduler = JobScheduler()

    def create_recurring_job(self, job_id: str, job_type: str,
                             payload: Dict, cron_expression: str,
                             timezone: str = "UTC") -> Dict:
        """Create a recurring job with cron schedule."""
        now = datetime.now()

        # Validate cron expression
        try:
            cron = croniter(cron_expression, now)
            next_run = cron.get_next(datetime)
        except Exception as e:
            raise ValueError(f"Invalid cron expression: {e}")

        recurring_data = {
            "job_id": job_id,
            "job_type": job_type,
            "payload": json.dumps(payload),
            "cron_expression": cron_expression,
            "timezone": timezone,
            "created_at": now.isoformat(),
            "next_run": next_run.timestamp(),
            "enabled": "true",
            "run_count": 0
        }

        pipe = r.pipeline()

        # Store recurring job definition
        pipe.hset(f"recurring:{job_id}", mapping=recurring_data)

        # Add to recurring jobs set
        pipe.sadd(self.RECURRING_JOBS_KEY, job_id)

        # Schedule the first instance
        pipe.zadd(
            JobScheduler.SCHEDULED_JOBS_KEY,
            {f"{job_id}:{int(next_run.timestamp())}": next_run.timestamp()}
        )

        pipe.execute()

        return {
            "job_id": job_id,
            "next_run": next_run.isoformat(),
            "cron_expression": cron_expression
        }

    def update_recurring_job(self, job_id: str, **updates) -> bool:
        """Update a recurring job's configuration."""
        if not r.exists(f"recurring:{job_id}"):
            return False

        if "payload" in updates:
            updates["payload"] = json.dumps(updates["payload"])

        if "cron_expression" in updates:
            # Recalculate next run
            now = datetime.now()
            cron = croniter(updates["cron_expression"], now)
            updates["next_run"] = cron.get_next(datetime).timestamp()

        r.hset(f"recurring:{job_id}", mapping=updates)
        return True

    def disable_recurring_job(self, job_id: str) -> bool:
        """Disable a recurring job."""
        return self.update_recurring_job(job_id, enabled="false")

    def enable_recurring_job(self, job_id: str) -> bool:
        """Enable a recurring job."""
        return self.update_recurring_job(job_id, enabled="true")

    def delete_recurring_job(self, job_id: str) -> bool:
        """Delete a recurring job."""
        pipe = r.pipeline()
        pipe.delete(f"recurring:{job_id}")
        pipe.srem(self.RECURRING_JOBS_KEY, job_id)
        pipe.execute()
        return True

    def get_recurring_job(self, job_id: str) -> Optional[Dict]:
        """Get a recurring job's details."""
        data = r.hgetall(f"recurring:{job_id}")
        if not data:
            return None

        data["payload"] = json.loads(data["payload"])
        data["enabled"] = data["enabled"] == "true"
        return data

    def list_recurring_jobs(self) -> List[Dict]:
        """List all recurring jobs."""
        job_ids = r.smembers(self.RECURRING_JOBS_KEY)

        if not job_ids:
            return []

        pipe = r.pipeline()
        for job_id in job_ids:
            pipe.hgetall(f"recurring:{job_id}")

        results = pipe.execute()

        jobs = []
        for data in results:
            if data:
                data["payload"] = json.loads(data["payload"])
                data["enabled"] = data.get("enabled") == "true"
                jobs.append(data)

        return jobs

    def process_recurring_jobs(self) -> int:
        """Check and schedule due recurring jobs."""
        now = time.time()
        processed = 0

        job_ids = r.smembers(self.RECURRING_JOBS_KEY)

        for job_id in job_ids:
            data = r.hgetall(f"recurring:{job_id}")

            if not data or data.get("enabled") != "true":
                continue

            next_run = float(data.get("next_run", 0))

            if next_run <= now:
                # Schedule the job instance
                payload = json.loads(data["payload"])
                instance_id = f"{job_id}:{int(now)}"

                self.scheduler.schedule_job(
                    data["job_type"],
                    payload,
                    delay_seconds=0
                )

                # Calculate next run time
                cron = croniter(data["cron_expression"], datetime.fromtimestamp(now))
                next_run_time = cron.get_next(datetime)

                # Update recurring job
                pipe = r.pipeline()
                pipe.hset(f"recurring:{job_id}", mapping={
                    "next_run": next_run_time.timestamp(),
                    "last_run": now,
                    "run_count": int(data.get("run_count", 0)) + 1
                })
                pipe.execute()

                processed += 1

        return processed


# Usage
recurring = RecurringJobScheduler()

# Create a job that runs every hour
recurring.create_recurring_job(
    "hourly_cleanup",
    "cleanup_temp_files",
    {"max_age_hours": 24},
    "0 * * * *"  # Every hour at minute 0
)

# Create a job that runs daily at 9 AM
recurring.create_recurring_job(
    "daily_report",
    "generate_report",
    {"report_type": "daily_sales"},
    "0 9 * * *"  # 9:00 AM every day
)

# Create a job that runs every Monday at 6 AM
recurring.create_recurring_job(
    "weekly_backup",
    "backup_database",
    {"full_backup": True},
    "0 6 * * 1"  # 6:00 AM every Monday
)

# List all recurring jobs
jobs = recurring.list_recurring_jobs()
for job in jobs:
    print(f"Job: {job['job_id']}, Next run: {job['next_run']}")
```

## Priority Queues

Implement job priorities with multiple queues:

```python
class PriorityJobScheduler:
    PRIORITY_QUEUES = {
        "critical": "jobs:priority:critical",
        "high": "jobs:priority:high",
        "normal": "jobs:priority:normal",
        "low": "jobs:priority:low"
    }

    PRIORITY_ORDER = ["critical", "high", "normal", "low"]

    def schedule_job(self, job_type: str, payload: Dict,
                     priority: str = "normal",
                     delay_seconds: int = 0) -> Job:
        """Schedule a job with a priority level."""
        if priority not in self.PRIORITY_QUEUES:
            raise ValueError(f"Invalid priority: {priority}")

        job_id = str(uuid.uuid4())
        now = time.time()
        scheduled_at = now + delay_seconds

        job = Job(
            job_id=job_id,
            job_type=job_type,
            payload=payload,
            scheduled_at=scheduled_at,
            created_at=now,
            priority=self.PRIORITY_ORDER.index(priority)
        )

        pipe = r.pipeline()

        # Store job data
        pipe.hset(f"job:{job_id}", mapping=job.to_dict())

        # Add to priority queue
        queue_key = self.PRIORITY_QUEUES[priority]
        pipe.zadd(queue_key, {job_id: scheduled_at})

        pipe.execute()

        return job

    def get_next_job(self, worker_id: str) -> Optional[Job]:
        """Get the highest priority job that is due."""
        now = time.time()

        # Check queues in priority order
        for priority in self.PRIORITY_ORDER:
            queue_key = self.PRIORITY_QUEUES[priority]

            # Try to claim a job from this queue
            claim_script = """
            local queue_key = KEYS[1]
            local processing_key = KEYS[2]
            local now = tonumber(ARGV[1])
            local lock_ttl = tonumber(ARGV[2])
            local worker_id = ARGV[3]

            -- Get the first due job
            local jobs = redis.call('ZRANGEBYSCORE', queue_key, '-inf', now, 'LIMIT', 0, 1)

            if #jobs == 0 then
                return nil
            end

            local job_id = jobs[1]

            -- Move to processing
            redis.call('ZREM', queue_key, job_id)
            redis.call('ZADD', processing_key, now + lock_ttl, job_id)

            -- Update job status
            local job_key = 'job:' .. job_id
            redis.call('HSET', job_key, 'status', 'processing')
            redis.call('HSET', job_key, 'worker_id', worker_id)
            redis.call('HSET', job_key, 'started_at', now)

            return job_id
            """

            script = r.register_script(claim_script)
            job_id = script(
                keys=[queue_key, "jobs:processing"],
                args=[now, 300, worker_id]
            )

            if job_id:
                job_data = r.hgetall(f"job:{job_id}")
                return Job.from_dict(job_data)

        return None

    def get_queue_stats(self) -> Dict[str, Dict]:
        """Get statistics for all priority queues."""
        now = time.time()
        stats = {}

        pipe = r.pipeline()
        for priority, queue_key in self.PRIORITY_QUEUES.items():
            pipe.zcard(queue_key)
            pipe.zcount(queue_key, "-inf", now)  # Due jobs

        results = pipe.execute()

        i = 0
        for priority in self.PRIORITY_QUEUES.keys():
            stats[priority] = {
                "total": results[i],
                "due": results[i + 1]
            }
            i += 2

        return stats


# Usage
priority_scheduler = PriorityJobScheduler()

# Schedule jobs with different priorities
priority_scheduler.schedule_job(
    "send_alert",
    {"message": "Server down!"},
    priority="critical"
)

priority_scheduler.schedule_job(
    "process_order",
    {"order_id": "789"},
    priority="high"
)

priority_scheduler.schedule_job(
    "send_newsletter",
    {"campaign_id": "summer"},
    priority="low"
)

# Get queue stats
stats = priority_scheduler.get_queue_stats()
print(f"Queue stats: {stats}")
```

## Job Dependencies

Schedule jobs that depend on other jobs:

```python
class DependentJobScheduler:
    def __init__(self):
        self.scheduler = JobScheduler()

    def schedule_with_dependencies(self, job_type: str, payload: Dict,
                                   depends_on: List[str] = None) -> Job:
        """Schedule a job that depends on other jobs completing."""
        job_id = str(uuid.uuid4())
        now = time.time()

        job = Job(
            job_id=job_id,
            job_type=job_type,
            payload=payload,
            scheduled_at=now,
            created_at=now
        )

        pipe = r.pipeline()

        # Store job data with pending status
        job_data = job.to_dict()
        job_data["status"] = "pending" if depends_on else "scheduled"
        job_data["depends_on"] = json.dumps(depends_on or [])
        pipe.hset(f"job:{job_id}", mapping=job_data)

        if depends_on:
            # Track dependencies
            pipe.sadd(f"job:{job_id}:dependencies", *depends_on)

            # Register as dependent for each dependency
            for dep_id in depends_on:
                pipe.sadd(f"job:{dep_id}:dependents", job_id)
        else:
            # No dependencies, schedule immediately
            pipe.zadd(JobScheduler.SCHEDULED_JOBS_KEY, {job_id: now})

        pipe.execute()

        return job

    def complete_job_with_deps(self, job_id: str, result: Any = None) -> List[str]:
        """Complete a job and trigger dependent jobs."""
        # Mark job as completed
        self.scheduler.complete_job(job_id, result)

        # Get dependent jobs
        dependents = r.smembers(f"job:{job_id}:dependents")
        triggered = []

        for dependent_id in dependents:
            # Remove this job from the dependent's dependencies
            remaining = r.srem(f"job:{dependent_id}:dependencies", job_id)

            # Check if all dependencies are satisfied
            remaining_deps = r.scard(f"job:{dependent_id}:dependencies")

            if remaining_deps == 0:
                # All dependencies satisfied, schedule the job
                now = time.time()
                pipe = r.pipeline()
                pipe.hset(f"job:{dependent_id}", "status", "scheduled")
                pipe.zadd(JobScheduler.SCHEDULED_JOBS_KEY, {dependent_id: now})
                pipe.execute()
                triggered.append(dependent_id)

        return triggered

    def create_job_pipeline(self, jobs: List[Dict]) -> List[Job]:
        """Create a pipeline of jobs that run in sequence."""
        created_jobs = []
        previous_job_id = None

        for job_config in jobs:
            depends_on = [previous_job_id] if previous_job_id else None

            job = self.schedule_with_dependencies(
                job_config["job_type"],
                job_config["payload"],
                depends_on=depends_on
            )

            created_jobs.append(job)
            previous_job_id = job.job_id

        return created_jobs


# Usage
dep_scheduler = DependentJobScheduler()

# Create a pipeline: extract -> transform -> load
pipeline = dep_scheduler.create_job_pipeline([
    {"job_type": "extract_data", "payload": {"source": "database"}},
    {"job_type": "transform_data", "payload": {"format": "parquet"}},
    {"job_type": "load_data", "payload": {"destination": "data_warehouse"}}
])

print(f"Created pipeline with {len(pipeline)} jobs")

# When extract completes, transform is triggered automatically
# dep_scheduler.complete_job_with_deps(pipeline[0].job_id, {"rows": 1000})
```

## Monitoring and Statistics

Track job execution metrics:

```python
class JobMetrics:
    def record_job_started(self, job: Job) -> None:
        """Record that a job started processing."""
        now = time.time()
        today = datetime.now().strftime("%Y-%m-%d")

        pipe = r.pipeline()

        # Increment started count
        pipe.hincrby(f"metrics:jobs:{today}", f"{job.job_type}:started", 1)

        # Track processing time (will be completed later)
        pipe.hset(f"job:{job.job_id}", "processing_started_at", now)

        pipe.execute()

    def record_job_completed(self, job: Job) -> None:
        """Record that a job completed successfully."""
        now = time.time()
        today = datetime.now().strftime("%Y-%m-%d")

        # Calculate processing time
        started_at = float(r.hget(f"job:{job.job_id}", "processing_started_at") or now)
        processing_time = now - started_at

        pipe = r.pipeline()

        # Increment completed count
        pipe.hincrby(f"metrics:jobs:{today}", f"{job.job_type}:completed", 1)

        # Track processing time histogram
        bucket = self._get_time_bucket(processing_time)
        pipe.hincrby(f"metrics:jobs:{today}:duration:{job.job_type}", bucket, 1)

        # Track average processing time (using running average)
        pipe.lpush(f"metrics:jobs:recent_times:{job.job_type}", processing_time)
        pipe.ltrim(f"metrics:jobs:recent_times:{job.job_type}", 0, 999)

        pipe.execute()

    def record_job_failed(self, job: Job, error: str) -> None:
        """Record that a job failed."""
        today = datetime.now().strftime("%Y-%m-%d")

        pipe = r.pipeline()
        pipe.hincrby(f"metrics:jobs:{today}", f"{job.job_type}:failed", 1)
        pipe.hincrby(f"metrics:jobs:{today}:errors", error[:100], 1)
        pipe.execute()

    def _get_time_bucket(self, seconds: float) -> str:
        """Categorize processing time into buckets."""
        if seconds < 0.1:
            return "0-100ms"
        elif seconds < 1:
            return "100ms-1s"
        elif seconds < 10:
            return "1s-10s"
        elif seconds < 60:
            return "10s-1m"
        else:
            return "1m+"

    def get_daily_stats(self, date: str = None) -> Dict:
        """Get job statistics for a day."""
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")

        stats = r.hgetall(f"metrics:jobs:{date}")

        # Parse into structured format
        result = {}
        for key, value in stats.items():
            parts = key.split(":")
            job_type = parts[0]
            metric = parts[1]

            if job_type not in result:
                result[job_type] = {}

            result[job_type][metric] = int(value)

        return result

    def get_average_processing_time(self, job_type: str) -> float:
        """Get average processing time for a job type."""
        times = r.lrange(f"metrics:jobs:recent_times:{job_type}", 0, -1)

        if not times:
            return 0

        times = [float(t) for t in times]
        return sum(times) / len(times)


# Usage
metrics = JobMetrics()

# Get daily stats
stats = metrics.get_daily_stats()
print(f"Daily job stats: {stats}")

# Get average processing time
avg_time = metrics.get_average_processing_time("send_email")
print(f"Average email sending time: {avg_time:.2f}s")
```

## Conclusion

Redis provides a powerful foundation for job scheduling systems. Key takeaways:

- Use **sorted sets** for time-based job ordering
- Use **Lua scripts** for atomic job claiming
- Implement **exponential backoff** for retries
- Use **cron expressions** for recurring jobs
- Implement **priority queues** for job importance
- Track **dependencies** for job pipelines
- Monitor **metrics** for system health

With these patterns, you can build job scheduling systems that reliably handle millions of scheduled tasks with precise timing and fault tolerance.

## Related Resources

- [Redis Sorted Set Commands](https://redis.io/commands/?group=sorted-set)
- [Redis Lua Scripting](https://redis.io/docs/interact/programmability/eval-intro/)
- [Croniter Library](https://github.com/kiorky/croniter)
