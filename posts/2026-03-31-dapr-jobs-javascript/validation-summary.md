# Validation Summary: How to Use Dapr Jobs with JavaScript SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Jobs building block)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Node.js
- Dapr Scheduler service
- Dapr CLI

## Sources Consulted
- Dapr Jobs API documentation: https://docs.dapr.io/developing-applications/building-blocks/jobs/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- `@dapr/dapr` npm package source and type definitions
- Dapr JS SDK GitHub repository (PR #688 for Jobs API implementation)
- Dapr proto definitions for Job scheduling API
- Dapr Configuration reference: https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found

1. **`daprHost` included protocol prefix**: The `DaprClient` and `DaprServer` constructors had `daprHost: "http://localhost"`. The `daprHost` option expects a hostname only (e.g., `"127.0.0.1"`), not a URL with protocol. The protocol is determined separately by the SDK's communication protocol setting. Changed to `"127.0.0.1"` in both client and server constructor examples.

2. **Cron expression used 5 fields instead of 6**: The recurring job example used `"0 3 * * *"` (standard 5-field cron). Dapr uses 6-field cron expressions that include a seconds field. Changed to `"0 0 3 * * *"` (seconds minutes hours day-of-month month day-of-week).

3. **Unnecessary `JSON.stringify` on data field**: Both `schedule()` calls wrapped data in `JSON.stringify()`. The Dapr JS SDK accepts objects directly for the data field and handles serialization internally. Using `JSON.stringify` would double-serialize the data. Changed to pass plain objects.

4. **Incorrect `SchedulerReminders` feature flag**: The configuration section showed a `SchedulerReminders` feature flag as required for the Jobs API. This feature flag is related to actor reminders migration, not the Jobs building block. The Jobs API requires only that the Dapr Scheduler service is running, which starts automatically with `dapr init`. Replaced the YAML configuration block with a note that no special configuration is needed.

5. **One-time job used `schedule` + `repeats` instead of `dueTime`**: The one-time job example used `schedule: "@every 30s"` with `repeats: 1`. While this would technically fire once, the idiomatic way to schedule a one-time job in Dapr is to use `dueTime`. Changed to use `dueTime: "30s"` and removed the `repeats` field.

6. **`listen()` callback received wrapped data**: The job handler examples accessed `jobData.data` and parsed it with `JSON.parse()`. The `listen()` callback receives the job data directly (already deserialized), not wrapped in an object with a `.data` property. Simplified the callbacks to use the data parameter directly.

7. **`job.repeats` is not a standard return field**: The "Getting Job Details" example logged `job.repeats`, which is not a field on the returned Job type from `client.jobs.get()`. Removed that line.

## Review Notes
- The Dapr Jobs JavaScript SDK API was under active development (PR #688) at the time of the blog post's writing. The method signatures used in this post follow the pattern from that PR with positional arguments for the job name and an options object for job configuration. The final released API should be verified when the SDK version shipping Jobs support is published.
- The `schedule()` method signature may evolve before final release. The post now uses `client.jobs.schedule(jobName, options)` which aligns with the SDK's development direction.
