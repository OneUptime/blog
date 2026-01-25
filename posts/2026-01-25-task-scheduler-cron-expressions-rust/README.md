# How to Build a Task Scheduler with Cron Expressions in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Task Scheduler, Cron, Background Jobs, Automation

Description: A practical guide to building a task scheduler in Rust that parses and evaluates cron expressions for running background jobs on a schedule.

---

Scheduling recurring tasks is a fundamental requirement in backend systems. Whether you need to send daily reports, clean up stale data, or trigger periodic health checks, a reliable task scheduler is essential. This guide walks you through building one in Rust using cron expressions.

## Why Rust for Task Scheduling?

Rust offers several advantages for building schedulers:

- Memory safety without garbage collection means predictable latency
- Strong concurrency primitives with async/await
- Excellent performance for CPU-bound cron parsing
- Type system catches scheduling bugs at compile time

## Setting Up the Project

Start by creating a new Rust project and adding dependencies:

```bash
cargo new task-scheduler
cd task-scheduler
```

Add these dependencies to `Cargo.toml`:

```toml
[dependencies]
cron = "0.12"
chrono = "0.4"
tokio = { version = "1", features = ["full"] }
uuid = { version = "1", features = ["v4"] }
```

The `cron` crate handles parsing and evaluating cron expressions. `chrono` provides datetime utilities, `tokio` gives us an async runtime, and `uuid` generates unique job identifiers.

## Understanding Cron Expressions

A cron expression consists of five fields (or six if you include seconds):

```
┌───────── minute (0 - 59)
│ ┌───────── hour (0 - 23)
│ │ ┌───────── day of month (1 - 31)
│ │ │ ┌───────── month (1 - 12)
│ │ │ │ ┌───────── day of week (0 - 6)
│ │ │ │ │
* * * * *
```

Common examples:
- `0 * * * *` - Every hour at minute 0
- `*/15 * * * *` - Every 15 minutes
- `0 9 * * 1-5` - 9 AM on weekdays
- `0 0 1 * *` - First day of every month at midnight

## Defining the Task Structure

First, define what a scheduled task looks like:

```rust
use chrono::{DateTime, Utc};
use cron::Schedule;
use std::str::FromStr;
use uuid::Uuid;

// Represents a scheduled task with its cron schedule and execution logic
pub struct ScheduledTask {
    pub id: Uuid,
    pub name: String,
    pub schedule: Schedule,
    pub last_run: Option<DateTime<Utc>>,
    pub enabled: bool,
}

impl ScheduledTask {
    // Create a new task from a cron expression string
    pub fn new(name: &str, cron_expr: &str) -> Result<Self, cron::error::Error> {
        let schedule = Schedule::from_str(cron_expr)?;

        Ok(Self {
            id: Uuid::new_v4(),
            name: name.to_string(),
            schedule,
            last_run: None,
            enabled: true,
        })
    }

    // Get the next scheduled execution time
    pub fn next_run(&self) -> Option<DateTime<Utc>> {
        self.schedule.upcoming(Utc).next()
    }

    // Check if the task should run now
    pub fn should_run(&self) -> bool {
        if !self.enabled {
            return false;
        }

        let now = Utc::now();

        // Find the most recent scheduled time
        if let Some(upcoming) = self.schedule.after(&(now - chrono::Duration::minutes(1))).next() {
            // Task should run if we're within the same minute as a scheduled time
            return upcoming <= now;
        }

        false
    }
}
```

## Building the Scheduler

The scheduler manages multiple tasks and runs them at the right times:

```rust
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration};

// Type alias for task handlers - functions that execute when a task runs
type TaskHandler = Arc<dyn Fn() + Send + Sync>;

pub struct Scheduler {
    tasks: Arc<RwLock<HashMap<Uuid, ScheduledTask>>>,
    handlers: Arc<RwLock<HashMap<Uuid, TaskHandler>>>,
    running: Arc<RwLock<bool>>,
}

impl Scheduler {
    pub fn new() -> Self {
        Self {
            tasks: Arc::new(RwLock::new(HashMap::new())),
            handlers: Arc::new(RwLock::new(HashMap::new())),
            running: Arc::new(RwLock::new(false)),
        }
    }

    // Register a new task with its handler function
    pub async fn add_task<F>(&self, name: &str, cron_expr: &str, handler: F) -> Result<Uuid, String>
    where
        F: Fn() + Send + Sync + 'static,
    {
        let task = ScheduledTask::new(name, cron_expr)
            .map_err(|e| format!("Invalid cron expression: {}", e))?;

        let task_id = task.id;

        self.tasks.write().await.insert(task_id, task);
        self.handlers.write().await.insert(task_id, Arc::new(handler));

        println!("Registered task '{}' with id {}", name, task_id);

        Ok(task_id)
    }

    // Remove a task from the scheduler
    pub async fn remove_task(&self, task_id: Uuid) -> bool {
        let task_removed = self.tasks.write().await.remove(&task_id).is_some();
        self.handlers.write().await.remove(&task_id);
        task_removed
    }

    // Enable or disable a task without removing it
    pub async fn set_task_enabled(&self, task_id: Uuid, enabled: bool) {
        if let Some(task) = self.tasks.write().await.get_mut(&task_id) {
            task.enabled = enabled;
        }
    }
}
```

## The Main Loop

The scheduler needs a loop that checks for tasks to run. This implementation ticks every second and evaluates each task:

```rust
impl Scheduler {
    // Start the scheduler - runs until stop() is called
    pub async fn start(&self) {
        *self.running.write().await = true;

        // Check for tasks to run every second
        let mut ticker = interval(Duration::from_secs(1));

        println!("Scheduler started");

        while *self.running.read().await {
            ticker.tick().await;
            self.tick().await;
        }

        println!("Scheduler stopped");
    }

    // Stop the scheduler gracefully
    pub async fn stop(&self) {
        *self.running.write().await = false;
    }

    // Check all tasks and run those that are due
    async fn tick(&self) {
        let now = Utc::now();
        let mut tasks_to_run = Vec::new();

        // Collect tasks that need to run
        {
            let mut tasks = self.tasks.write().await;
            for (id, task) in tasks.iter_mut() {
                if !task.enabled {
                    continue;
                }

                // Check if we should run based on the schedule
                if let Some(last_run) = task.last_run {
                    // Skip if we already ran this minute
                    if now.signed_duration_since(last_run).num_seconds() < 60 {
                        continue;
                    }
                }

                // Check if current time matches the cron schedule
                if task.should_run() {
                    task.last_run = Some(now);
                    tasks_to_run.push(*id);
                }
            }
        }

        // Execute handlers for due tasks
        let handlers = self.handlers.read().await;
        for task_id in tasks_to_run {
            if let Some(handler) = handlers.get(&task_id) {
                let handler = Arc::clone(handler);

                // Spawn task execution in a separate thread to avoid blocking
                tokio::spawn(async move {
                    handler();
                });
            }
        }
    }
}
```

## Adding Async Task Support

Many tasks need to perform async operations like HTTP requests or database queries. Here's how to support async handlers:

```rust
use std::future::Future;
use std::pin::Pin;

// Type for async task handlers
type AsyncTaskHandler = Arc<dyn Fn() -> Pin<Box<dyn Future<Output = ()> + Send>> + Send + Sync>;

pub struct AsyncScheduler {
    tasks: Arc<RwLock<HashMap<Uuid, ScheduledTask>>>,
    handlers: Arc<RwLock<HashMap<Uuid, AsyncTaskHandler>>>,
    running: Arc<RwLock<bool>>,
}

impl AsyncScheduler {
    pub fn new() -> Self {
        Self {
            tasks: Arc::new(RwLock::new(HashMap::new())),
            handlers: Arc::new(RwLock::new(HashMap::new())),
            running: Arc::new(RwLock::new(false)),
        }
    }

    // Register an async task handler
    pub async fn add_async_task<F, Fut>(&self, name: &str, cron_expr: &str, handler: F) -> Result<Uuid, String>
    where
        F: Fn() -> Fut + Send + Sync + 'static,
        Fut: Future<Output = ()> + Send + 'static,
    {
        let task = ScheduledTask::new(name, cron_expr)
            .map_err(|e| format!("Invalid cron expression: {}", e))?;

        let task_id = task.id;

        // Wrap the handler to return a pinned boxed future
        let wrapped_handler: AsyncTaskHandler = Arc::new(move || {
            Box::pin(handler()) as Pin<Box<dyn Future<Output = ()> + Send>>
        });

        self.tasks.write().await.insert(task_id, task);
        self.handlers.write().await.insert(task_id, wrapped_handler);

        Ok(task_id)
    }

    // Execute async handlers
    async fn run_task(&self, task_id: Uuid) {
        let handler = {
            let handlers = self.handlers.read().await;
            handlers.get(&task_id).cloned()
        };

        if let Some(handler) = handler {
            tokio::spawn(async move {
                handler().await;
            });
        }
    }
}
```

## Putting It All Together

Here's a complete example that schedules multiple tasks:

```rust
use std::sync::atomic::{AtomicU32, Ordering};

#[tokio::main]
async fn main() {
    let scheduler = Scheduler::new();

    // Counter to track executions
    let counter = Arc::new(AtomicU32::new(0));
    let counter_clone = Arc::clone(&counter);

    // Run every minute
    scheduler.add_task(
        "heartbeat",
        "* * * * *",  // Every minute
        move || {
            let count = counter_clone.fetch_add(1, Ordering::SeqCst);
            println!("[{}] Heartbeat #{}", Utc::now().format("%H:%M:%S"), count + 1);
        },
    ).await.expect("Failed to add heartbeat task");

    // Run at the top of every hour
    scheduler.add_task(
        "hourly-report",
        "0 * * * *",  // At minute 0 of every hour
        || {
            println!("[{}] Generating hourly report...", Utc::now().format("%H:%M:%S"));
        },
    ).await.expect("Failed to add hourly report task");

    // Run every 5 minutes
    scheduler.add_task(
        "cache-cleanup",
        "*/5 * * * *",  // Every 5 minutes
        || {
            println!("[{}] Cleaning up cache...", Utc::now().format("%H:%M:%S"));
        },
    ).await.expect("Failed to add cache cleanup task");

    // Start the scheduler
    scheduler.start().await;
}
```

## Error Handling and Retries

Production schedulers need to handle task failures. Add retry logic with exponential backoff:

```rust
pub struct TaskConfig {
    pub max_retries: u32,
    pub retry_delay_ms: u64,
    pub timeout_ms: u64,
}

impl Default for TaskConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            retry_delay_ms: 1000,
            timeout_ms: 30000,
        }
    }
}

// Execute a task with retries on failure
async fn execute_with_retry<F, Fut>(
    task_name: &str,
    config: &TaskConfig,
    handler: F,
) -> Result<(), String>
where
    F: Fn() -> Fut,
    Fut: Future<Output = Result<(), String>>,
{
    let mut attempts = 0;
    let mut delay = config.retry_delay_ms;

    loop {
        attempts += 1;

        match tokio::time::timeout(
            Duration::from_millis(config.timeout_ms),
            handler(),
        ).await {
            Ok(Ok(())) => {
                return Ok(());
            }
            Ok(Err(e)) => {
                println!("Task '{}' failed (attempt {}): {}", task_name, attempts, e);
            }
            Err(_) => {
                println!("Task '{}' timed out (attempt {})", task_name, attempts);
            }
        }

        if attempts >= config.max_retries {
            return Err(format!("Task '{}' failed after {} attempts", task_name, attempts));
        }

        // Exponential backoff
        tokio::time::sleep(Duration::from_millis(delay)).await;
        delay *= 2;
    }
}
```

## Best Practices

When deploying a cron-based scheduler in production, keep these points in mind:

1. **Single instance execution** - Use distributed locks (Redis, etcd) when running multiple instances to prevent duplicate task execution.

2. **Missed job handling** - Decide whether to run missed jobs (if the server was down) or skip them. Store the last run time persistently.

3. **Timezone awareness** - Always be explicit about timezones. The `cron` crate works with UTC by default.

4. **Monitoring** - Track task execution times, failures, and queue depth. Alert on tasks that run too long or fail repeatedly.

5. **Graceful shutdown** - Wait for running tasks to complete before shutting down the scheduler.

## Summary

Building a task scheduler in Rust gives you precise control over job execution with strong safety guarantees. The combination of the `cron` crate for parsing and `tokio` for async execution creates a solid foundation. From here, you can extend the scheduler with persistence, distributed locking, and detailed metrics to handle production workloads.
