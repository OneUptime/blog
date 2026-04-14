# Validation Summary: How to Use Dapr Jobs with Java SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Jobs API
- Dapr Java SDK (`io.dapr:dapr-sdk`)
- Java
- Spring Boot (for job handler endpoints)

## Sources Consulted
- Dapr Java SDK GitHub repository (https://github.com/dapr/java-sdk) — source code for `ScheduleJobRequest`, `GetJobRequest`, `DeleteJobRequest`, `GetJobResponse`, `JobSchedule`, `DaprPreviewClient`
- Dapr official documentation — Jobs API reference (https://docs.dapr.io/developing-applications/building-blocks/jobs/)
- Maven Central — Dapr SDK version history (https://central.sonatype.com/artifact/io.dapr/dapr-sdk)
- Dapr documentation — preview features list (https://docs.dapr.io/operations/support/support-preview-features/)

## Issues Found

1. **SDK version too old**: Post used version `1.13.0`, which does not include the Jobs API. Changed to `1.15.0`, which is the minimum version containing the Jobs API classes.

2. **Wrong client type**: Post used `DaprClient` with `build()`. The Jobs API is on `DaprPreviewClient`, requiring `buildPreviewClient()`. Fixed client creation accordingly.

3. **Fabricated builder pattern**: Post used `ScheduleJobRequest.newBuilder().setName().setData().setSchedule().build()`, which does not exist. The real API uses constructors: `new ScheduleJobRequest(name, schedule)` or `new ScheduleJobRequest(name, dueTime)` with setter chaining. Fixed all `ScheduleJobRequest` construction.

4. **"One-Time Job" section used recurring schedule**: The section titled "Scheduling a One-Time Job" used `setSchedule("@every 1m")`, which is a recurring schedule. Changed to use `Instant` (due time) for a true one-time job.

5. **Wrong cron field count**: Post used 5-field cron `"0 2 * * *"`. Dapr uses a 6-field format including seconds. Changed to `"0 0 2 * * *"`.

6. **Wrong method name**: `setRepeats(0)` should be `setRepeat(0)` (singular). Fixed.

7. **Wrong method signatures for getJob/deleteJob**: Post passed raw strings to `getJob()` and `deleteJob()`. These methods take `GetJobRequest` and `DeleteJobRequest` objects respectively. Fixed with proper request objects and added necessary imports.

8. **Fabricated configuration YAML**: Post showed a `SchedulerReminders` feature flag in a Dapr Configuration YAML. This feature flag does not exist — the Dapr scheduler service runs automatically without any feature flags. Replaced the section with a `dapr run` command showing how to start the application.

9. **Unused import**: Removed `java.time.OffsetDateTime` import (was unused) and replaced with `java.time.Instant` for the one-time job example.

## Review Notes
- The Jobs API is currently a preview feature in the Dapr Java SDK, accessed via `DaprPreviewClient`. It may be promoted to the stable `DaprClient` interface in a future release, at which point the `buildPreviewClient()` call would change back to `build()`.
- The job handler endpoint pattern (`POST /job/<job-name>`) shown in the Spring Boot controller is correct. A parameterized approach (`@PostMapping("/job/{jobName}")`) could be more maintainable for handling multiple jobs.
- The `ResponseEntity<Void>` return type and `@RequestBody byte[] data` parameter in the handler are reasonable but may need adjustment depending on the actual payload format Dapr sends (which is typically JSON).
