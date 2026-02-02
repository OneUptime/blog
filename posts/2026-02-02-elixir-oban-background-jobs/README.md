# How to Handle Background Jobs with Oban

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elixir, Oban, Background Jobs, Queue, Async

Description: Learn how to implement reliable background job processing in Elixir applications using Oban, covering job creation, queues, retries, and production best practices.

---

> Background jobs are essential for any production Elixir application. Email sending, report generation, data processing, and external API calls should all happen asynchronously. Oban provides a battle-tested, PostgreSQL-backed solution for reliable job processing.

Oban stands out from other job processing libraries because it uses PostgreSQL as its storage backend, which means you don't need Redis or any additional infrastructure. If you already have Postgres, you have everything you need.

---

## Why Oban?

Before diving into implementation, let's understand why Oban is the go-to choice for Elixir background jobs:

| Feature | Oban | Other Solutions |
|---------|------|-----------------|
| Storage | PostgreSQL (existing infrastructure) | Redis, RabbitMQ (additional services) |
| Reliability | ACID transactions, no lost jobs | Depends on implementation |
| Observability | Built-in telemetry, Web UI available | Varies |
| Uniqueness | Native unique job support | Manual implementation |
| Scheduling | Cron-like scheduling built-in | Often requires plugins |

---

## Getting Started

### Installation

Add Oban to your dependencies in `mix.exs`:

```elixir
# mix.exs
defp deps do
  [
    {:oban, "~> 2.17"}
  ]
end
```

Run the dependency installation:

```bash
mix deps.get
```

### Configuration

Configure Oban in your application config. The queues define how many concurrent jobs can run for each queue type:

```elixir
# config/config.exs
config :my_app, Oban,
  repo: MyApp.Repo,
  # Define queues with their concurrency limits
  queues: [
    default: 10,     # General purpose queue, 10 concurrent workers
    mailers: 20,     # Email sending queue, higher concurrency
    events: 50,      # Event processing, high throughput
    reports: 5       # Report generation, lower concurrency for resource-intensive work
  ]
```

For production, you might want different settings. Add production-specific configuration:

```elixir
# config/prod.exs
config :my_app, Oban,
  repo: MyApp.Repo,
  queues: [
    default: 10,
    mailers: 20,
    events: 50,
    reports: 5
  ],
  # Rescue stuck jobs after 60 seconds (in case of node crashes)
  plugins: [
    {Oban.Plugins.Pruner, max_age: 60 * 60 * 24 * 7},  # Keep completed jobs for 7 days
    {Oban.Plugins.Stager, interval: 1000},              # Stage scheduled jobs every second
    {Oban.Plugins.Lifeline, rescue_after: :timer.minutes(60)}  # Rescue abandoned jobs
  ]
```

### Database Migration

Generate the Oban migrations to create the necessary database tables:

```bash
mix ecto.gen.migration add_oban_jobs_table
```

Add the Oban migration to the generated file:

```elixir
# priv/repo/migrations/TIMESTAMP_add_oban_jobs_table.exs
defmodule MyApp.Repo.Migrations.AddObanJobsTable do
  use Ecto.Migration

  def up do
    # Create the oban_jobs table with all necessary indexes
    Oban.Migration.up(version: 12)
  end

  def down do
    Oban.Migration.down(version: 1)
  end
end
```

Run the migration:

```bash
mix ecto.migrate
```

### Application Supervisor

Add Oban to your application supervision tree so it starts with your application:

```elixir
# lib/my_app/application.ex
defmodule MyApp.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      MyApp.Repo,
      # Start Oban after the Repo is available
      {Oban, Application.fetch_env!(:my_app, Oban)},
      # Your other children...
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

---

## Creating Workers

Workers are modules that define how jobs are executed. Each worker handles a specific type of background task.

### Basic Worker

Here's a simple worker for sending welcome emails. The perform/1 function receives the job struct with arguments:

```elixir
# lib/my_app/workers/email_worker.ex
defmodule MyApp.Workers.EmailWorker do
  use Oban.Worker,
    queue: :mailers,           # Which queue to use
    max_attempts: 5,           # Retry up to 5 times on failure
    priority: 1                # Lower number = higher priority (0-9)

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"to" => to, "subject" => subject, "body" => body}}) do
    # Pattern match the args to extract email parameters
    case MyApp.Mailer.send_email(to, subject, body) do
      {:ok, _} ->
        # Return :ok to mark job as completed
        :ok

      {:error, :rate_limited} ->
        # Return {:snooze, seconds} to retry later without counting as failure
        {:snooze, 60}

      {:error, reason} ->
        # Return {:error, reason} to mark as failed and trigger retry
        {:error, reason}
    end
  end
end
```

### Enqueuing Jobs

Insert jobs from anywhere in your application. Jobs are persisted to the database immediately:

```elixir
# Enqueue a job to run immediately
%{to: "user@example.com", subject: "Welcome!", body: "Thanks for signing up"}
|> MyApp.Workers.EmailWorker.new()
|> Oban.insert()

# Schedule a job to run in the future (5 minutes from now)
%{to: "user@example.com", subject: "Follow up", body: "How's it going?"}
|> MyApp.Workers.EmailWorker.new(scheduled_at: DateTime.add(DateTime.utc_now(), 300, :second))
|> Oban.insert()

# Schedule at a specific time
scheduled_time = ~U[2024-12-25 09:00:00Z]
%{to: "user@example.com", subject: "Happy Holidays!", body: "Season's greetings!"}
|> MyApp.Workers.EmailWorker.new(scheduled_at: scheduled_time)
|> Oban.insert()
```

---

## Job Processing Flow

Here's how a job flows through Oban from creation to completion:

```mermaid
flowchart TD
    A[Job Created] --> B[Inserted to Database]
    B --> C{Scheduled?}
    C -->|Yes| D[Wait until scheduled_at]
    C -->|No| E[Available Queue]
    D --> E
    E --> F[Worker Fetches Job]
    F --> G[perform/1 Executes]
    G --> H{Result?}
    H -->|:ok| I[Job Completed]
    H -->|{:snooze, seconds}| D
    H -->|{:error, reason}| J{Retries Left?}
    J -->|Yes| K[Exponential Backoff]
    K --> E
    J -->|No| L[Job Discarded]
    I --> M[Pruned After max_age]
    L --> M
```

---

## Advanced Workers

### Worker with Custom Backoff

Implement custom retry logic with exponential backoff and jitter to prevent thundering herd problems:

```elixir
# lib/my_app/workers/api_worker.ex
defmodule MyApp.Workers.APIWorker do
  use Oban.Worker,
    queue: :events,
    max_attempts: 10

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"endpoint" => endpoint, "payload" => payload}, attempt: attempt}) do
    case HTTPoison.post(endpoint, Jason.encode!(payload), headers()) do
      {:ok, %{status_code: status}} when status in 200..299 ->
        :ok

      {:ok, %{status_code: 429}} ->
        # Rate limited, snooze with exponential backoff
        {:snooze, calculate_backoff(attempt)}

      {:ok, %{status_code: status}} when status in 500..599 ->
        # Server error, will retry with backoff
        {:error, "Server error: #{status}"}

      {:ok, %{status_code: status}} ->
        # Client error (4xx except 429), don't retry
        {:cancel, "Client error: #{status}"}

      {:error, reason} ->
        {:error, reason}
    end
  end

  # Custom backoff with jitter to prevent thundering herd
  @impl Oban.Worker
  def backoff(%Oban.Job{attempt: attempt}) do
    # Base backoff: 2^attempt seconds, with random jitter
    base = :math.pow(2, attempt) |> trunc()
    jitter = :rand.uniform(30)
    base + jitter
  end

  defp calculate_backoff(attempt) do
    # Exponential backoff: 30s, 60s, 120s, etc.
    :math.pow(2, attempt) * 30 |> trunc() |> min(3600)
  end

  defp headers do
    [
      {"Content-Type", "application/json"},
      {"Authorization", "Bearer #{api_token()}"}
    ]
  end

  defp api_token, do: Application.fetch_env!(:my_app, :api_token)
end
```

### Worker with Timeout

Set execution timeout to prevent jobs from running forever:

```elixir
# lib/my_app/workers/report_worker.ex
defmodule MyApp.Workers.ReportWorker do
  use Oban.Worker,
    queue: :reports,
    max_attempts: 3

  # Timeout after 5 minutes to prevent stuck jobs
  @impl Oban.Worker
  def timeout(_job), do: :timer.minutes(5)

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"report_id" => report_id, "user_id" => user_id}}) do
    # Long running report generation
    with {:ok, data} <- MyApp.Reports.fetch_data(report_id),
         {:ok, report} <- MyApp.Reports.generate(data),
         {:ok, _} <- MyApp.Reports.save(report),
         {:ok, _} <- notify_user(user_id, report) do
      :ok
    else
      {:error, reason} -> {:error, reason}
    end
  end

  defp notify_user(user_id, report) do
    # Enqueue a notification job instead of doing it inline
    %{user_id: user_id, report_url: report.url}
    |> MyApp.Workers.NotificationWorker.new()
    |> Oban.insert()
  end
end
```

---

## Unique Jobs

Oban provides native support for preventing duplicate jobs, which is essential for idempotent operations:

```elixir
# lib/my_app/workers/sync_worker.ex
defmodule MyApp.Workers.SyncWorker do
  use Oban.Worker,
    queue: :default,
    # Unique job configuration
    unique: [
      # Unique by these argument keys
      keys: [:user_id],
      # Unique across these job states
      states: [:available, :scheduled, :executing],
      # Unique period (prevent duplicates for 1 hour)
      period: 3600
    ]

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"user_id" => user_id}}) do
    MyApp.Sync.sync_user_data(user_id)
  end
end
```

When inserting, you can check if the job was actually created or if a duplicate exists:

```elixir
# Insert returns {:ok, job} with conflict info
case Oban.insert(MyApp.Workers.SyncWorker.new(%{user_id: 123})) do
  {:ok, %Oban.Job{conflict?: false}} ->
    # New job was inserted
    :new_job

  {:ok, %Oban.Job{conflict?: true}} ->
    # Duplicate detected, existing job returned
    :duplicate

  {:error, changeset} ->
    # Validation error
    {:error, changeset}
end
```

---

## Scheduled and Recurring Jobs

### One-time Scheduled Jobs

Schedule jobs to run at a specific time:

```elixir
# Schedule for tomorrow at 9 AM UTC
tomorrow_9am =
  DateTime.utc_now()
  |> DateTime.add(1, :day)
  |> Map.put(:hour, 9)
  |> Map.put(:minute, 0)
  |> Map.put(:second, 0)

%{report_type: "daily_summary", date: Date.utc_today()}
|> MyApp.Workers.ReportWorker.new(scheduled_at: tomorrow_9am)
|> Oban.insert()
```

### Recurring Jobs with Cron Plugin

For recurring jobs, use the Cron plugin. Add it to your configuration:

```elixir
# config/config.exs
config :my_app, Oban,
  repo: MyApp.Repo,
  queues: [default: 10, reports: 5],
  plugins: [
    # Cron plugin for scheduled recurring jobs
    {Oban.Plugins.Cron,
     crontab: [
       # Run daily report at midnight UTC
       {"0 0 * * *", MyApp.Workers.DailyReportWorker},
       # Run hourly cleanup at minute 15
       {"15 * * * *", MyApp.Workers.CleanupWorker},
       # Run weekly digest every Monday at 9 AM
       {"0 9 * * 1", MyApp.Workers.WeeklyDigestWorker, args: %{type: "weekly"}},
       # Run every 5 minutes
       {"*/5 * * * *", MyApp.Workers.HealthCheckWorker}
     ]}
  ]
```

The cron syntax follows standard Unix cron format:

| Field | Values |
|-------|--------|
| Minute | 0-59 |
| Hour | 0-23 |
| Day of Month | 1-31 |
| Month | 1-12 |
| Day of Week | 0-6 (Sunday = 0) |

---

## Queue Management

### Priority Queues

Configure multiple queues with different priorities and concurrency:

```elixir
# config/config.exs
config :my_app, Oban,
  repo: MyApp.Repo,
  queues: [
    critical: 20,    # High priority, high concurrency
    default: 10,     # Normal priority
    low: 5,          # Lower priority, limited resources
    background: 2    # Lowest priority, resource-intensive tasks
  ]
```

Workers can specify their queue and priority:

```elixir
defmodule MyApp.Workers.CriticalWorker do
  use Oban.Worker,
    queue: :critical,
    priority: 0  # Highest priority within the queue (0-9)

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    # Critical work here
    :ok
  end
end
```

### Dynamic Queue Control

Pause and resume queues at runtime for maintenance or deployments:

```elixir
# Pause a queue (stops fetching new jobs, lets executing jobs finish)
Oban.pause_queue(queue: :reports)

# Resume a queue
Oban.resume_queue(queue: :reports)

# Scale queue concurrency dynamically
Oban.scale_queue(queue: :default, limit: 20)

# Check queue status
Oban.check_queue(queue: :default)
# => %{limit: 20, paused: false, running: [#PID<...>, ...]}
```

---

## Error Handling and Observability

### Telemetry Events

Oban emits telemetry events that you can hook into for monitoring and alerting:

```elixir
# lib/my_app/oban_telemetry.ex
defmodule MyApp.ObanTelemetry do
  require Logger

  def attach do
    # Attach handlers for Oban telemetry events
    events = [
      [:oban, :job, :start],
      [:oban, :job, :stop],
      [:oban, :job, :exception]
    ]

    :telemetry.attach_many(
      "oban-logger",
      events,
      &handle_event/4,
      nil
    )
  end

  # Called when a job starts executing
  def handle_event([:oban, :job, :start], _measurements, metadata, _config) do
    Logger.info("Job started",
      worker: metadata.job.worker,
      queue: metadata.job.queue,
      args: metadata.job.args
    )
  end

  # Called when a job completes successfully
  def handle_event([:oban, :job, :stop], measurements, metadata, _config) do
    Logger.info("Job completed",
      worker: metadata.job.worker,
      queue: metadata.job.queue,
      duration_ms: System.convert_time_unit(measurements.duration, :native, :millisecond)
    )

    # Send metrics to your monitoring system
    :telemetry.execute(
      [:my_app, :oban, :job_duration],
      %{duration: measurements.duration},
      %{worker: metadata.job.worker, queue: metadata.job.queue}
    )
  end

  # Called when a job raises an exception
  def handle_event([:oban, :job, :exception], _measurements, metadata, _config) do
    Logger.error("Job failed",
      worker: metadata.job.worker,
      queue: metadata.job.queue,
      error: inspect(metadata.reason),
      stacktrace: Exception.format_stacktrace(metadata.stacktrace)
    )

    # Alert your team about failed jobs
    MyApp.Alerting.notify_job_failure(metadata)
  end
end
```

Start the telemetry handler in your application:

```elixir
# lib/my_app/application.ex
def start(_type, _args) do
  # Attach telemetry handlers early
  MyApp.ObanTelemetry.attach()

  children = [
    MyApp.Repo,
    {Oban, Application.fetch_env!(:my_app, Oban)}
  ]

  Supervisor.start_link(children, strategy: :one_for_one)
end
```

### Dead Letter Handling

Handle jobs that have exhausted all retries:

```elixir
# lib/my_app/workers/notification_worker.ex
defmodule MyApp.Workers.NotificationWorker do
  use Oban.Worker,
    queue: :default,
    max_attempts: 3

  @impl Oban.Worker
  def perform(%Oban.Job{args: args, attempt: attempt, max_attempts: max_attempts} = job) do
    case send_notification(args) do
      :ok ->
        :ok

      {:error, reason} when attempt >= max_attempts ->
        # This is our last attempt, save to dead letter queue
        save_to_dead_letter(job, reason)
        # Return :ok to prevent further retries (we handled it)
        :ok

      {:error, reason} ->
        # Will retry
        {:error, reason}
    end
  end

  defp send_notification(args) do
    # Notification logic
    :ok
  end

  defp save_to_dead_letter(job, reason) do
    # Store failed job details for manual review
    %MyApp.DeadLetterJob{
      worker: job.worker,
      args: job.args,
      error: inspect(reason),
      failed_at: DateTime.utc_now()
    }
    |> MyApp.Repo.insert!()
  end
end
```

---

## Testing Workers

Oban provides excellent testing support. Configure Oban for testing mode:

```elixir
# config/test.exs
config :my_app, Oban,
  repo: MyApp.Repo,
  testing: :inline  # Jobs execute immediately in the test process
```

Write tests for your workers:

```elixir
# test/workers/email_worker_test.exs
defmodule MyApp.Workers.EmailWorkerTest do
  use MyApp.DataCase, async: true
  use Oban.Testing, repo: MyApp.Repo

  alias MyApp.Workers.EmailWorker

  describe "perform/1" do
    test "sends email successfully" do
      args = %{
        "to" => "user@example.com",
        "subject" => "Test",
        "body" => "Hello!"
      }

      # Execute the worker directly
      assert :ok = perform_job(EmailWorker, args)
    end

    test "snoozes on rate limit" do
      args = %{
        "to" => "ratelimited@example.com",
        "subject" => "Test",
        "body" => "Hello!"
      }

      # Mock the mailer to return rate limited
      expect(MyApp.MailerMock, :send_email, fn _, _, _ ->
        {:error, :rate_limited}
      end)

      assert {:snooze, 60} = perform_job(EmailWorker, args)
    end
  end

  describe "job insertion" do
    test "enqueues job with correct args" do
      %{to: "user@example.com", subject: "Hello", body: "World"}
      |> EmailWorker.new()
      |> Oban.insert()

      assert_enqueued(worker: EmailWorker, args: %{to: "user@example.com"})
    end

    test "schedules job for future execution" do
      scheduled_at = DateTime.add(DateTime.utc_now(), 3600, :second)

      %{to: "user@example.com", subject: "Later", body: "See you"}
      |> EmailWorker.new(scheduled_at: scheduled_at)
      |> Oban.insert()

      assert_enqueued(
        worker: EmailWorker,
        scheduled_at: scheduled_at
      )
    end
  end
end
```

---

## Production Best Practices

### 1. Use Structured Arguments

Always use maps with string keys for job arguments:

```elixir
# Good - explicit, serializable
%{"user_id" => user.id, "action" => "welcome_email"}
|> MyApp.Workers.EmailWorker.new()
|> Oban.insert()

# Avoid - atoms don't serialize well across nodes
%{user_id: user.id, action: :welcome_email}
```

### 2. Keep Jobs Small and Focused

Each job should do one thing well:

```elixir
# Good - focused job that enqueues other jobs
defmodule MyApp.Workers.UserSignupWorker do
  use Oban.Worker, queue: :default

  def perform(%Oban.Job{args: %{"user_id" => user_id}}) do
    user = MyApp.Accounts.get_user!(user_id)

    # Enqueue separate jobs for each task
    Oban.insert_all([
      MyApp.Workers.WelcomeEmailWorker.new(%{"user_id" => user_id}),
      MyApp.Workers.AnalyticsWorker.new(%{"event" => "signup", "user_id" => user_id}),
      MyApp.Workers.OnboardingWorker.new(%{"user_id" => user_id})
    ])

    :ok
  end
end
```

### 3. Handle Graceful Shutdown

Ensure jobs can handle SIGTERM during deployments:

```elixir
# config/prod.exs
config :my_app, Oban,
  repo: MyApp.Repo,
  queues: [default: 10],
  # Give jobs 30 seconds to finish on shutdown
  shutdown_grace_period: :timer.seconds(30)
```

### 4. Monitor Queue Depth

Track queue depth to catch backlogs early:

```elixir
defmodule MyApp.ObanMetrics do
  use GenServer

  def start_link(_) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def init(state) do
    schedule_check()
    {:ok, state}
  end

  def handle_info(:check_queues, state) do
    # Query queue depths
    counts = Oban.Job
      |> where([j], j.state in ["available", "scheduled", "executing"])
      |> group_by([j], j.queue)
      |> select([j], {j.queue, count(j.id)})
      |> MyApp.Repo.all()
      |> Map.new()

    # Send to monitoring
    Enum.each(counts, fn {queue, count} ->
      :telemetry.execute([:my_app, :oban, :queue_depth], %{count: count}, %{queue: queue})
    end)

    schedule_check()
    {:noreply, state}
  end

  defp schedule_check do
    Process.send_after(self(), :check_queues, :timer.seconds(30))
  end
end
```

---

## Conclusion

Oban provides a robust, PostgreSQL-backed solution for background job processing in Elixir. Key takeaways:

- **Simple setup** - Uses your existing PostgreSQL database
- **Reliable** - ACID transactions ensure no lost jobs
- **Flexible** - Multiple queues, priorities, and scheduling options
- **Observable** - Built-in telemetry for monitoring
- **Testable** - Excellent testing support out of the box

With proper configuration and monitoring, Oban can handle millions of jobs per day while providing the reliability guarantees your production system needs.

---

*Need to monitor your Oban workers? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for Elixir applications with job queue tracking, failure alerting, and performance dashboards.*
