# Validation Summary: How to Run Dapr Quickstart for Jobs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Jobs API (v1.0-alpha1)
- Dapr Scheduler service (embedded etcd)
- Python / Flask
- cURL

## Sources Consulted
- [Jobs API reference | Dapr Docs](https://docs.dapr.io/reference/api/jobs_api/)
- [Jobs overview | Dapr Docs](https://docs.dapr.io/developing-applications/building-blocks/jobs/jobs-overview/)
- [Features and concepts | Dapr Docs](https://docs.dapr.io/developing-applications/building-blocks/jobs/jobs-features-concepts/)
- [How-To: Schedule and handle triggered jobs | Dapr Docs](https://docs.dapr.io/developing-applications/building-blocks/jobs/howto-schedule-and-handle-triggered-jobs/)
- [Dapr v1.14 Release Highlights](https://blog.dapr.io/posts/2024/08/14/dapr-v1.14-is-now-available/)

## Issues Found
1. **`repeats: 0` claimed to mean infinite repeats** — The post set `"repeats": 0` with a comment `# 0 = infinite` in the daily-report scheduling call. The official documentation states that the `repeats` field should be **omitted entirely** for unlimited triggers, not set to 0. Fixed by removing the `repeats` field from the request body and updating the comment to `# omit "repeats" for unlimited triggers`.

2. **Fabricated GET response format** — The "Check Job Status" section showed a response containing a nested `status` object with `lastRunTime` and `nextRunTime` fields. The official Jobs API reference does not document these fields in the GET response; the actual response returns the job's top-level fields (`name`, `schedule`, `data`, etc.) without a nested status object. Fixed by removing the fabricated `status` object and `repeats` field from the example response.

## Review Notes
- The Jobs API endpoint remains at `v1.0-alpha1` — it has not graduated from alpha status. This is correctly reflected in the post but readers should be aware the API surface may change.
- The post correctly notes Dapr 1.14+ is required for the Jobs API.
- All schedule formats (@daily, @every, cron expressions), the callback path (`POST /job/{jobName}`), and the Scheduler/etcd architecture claims are accurate per official documentation.
- The documentation also lists additional optional fields (`ttl`, `overwrite`, `failure_policy`) not mentioned in the post, but their omission is fine for a quickstart tutorial.
