# Validation Summary: How to Debug Dapr Jobs Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Jobs API (alpha)
- Dapr Scheduler service
- Kubernetes (for deployment annotations, pod management, PVCs)
- Dapr CLI (`dapr run`, `dapr list`, `dapr dashboard`)
- Node.js / Express (handler example)
- etcd (embedded in Dapr Scheduler)

## Sources Consulted
- Jobs API reference: https://docs.dapr.io/reference/api/jobs_api/
- How-To: Schedule and handle triggered jobs: https://docs.dapr.io/developing-applications/building-blocks/jobs/howto-schedule-and-handle-triggered-jobs/
- Dapr Scheduler control plane service overview: https://docs.dapr.io/concepts/dapr-services/scheduler/
- How-to: Persist Scheduler Jobs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-persisting-scheduler/
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dashboard CLI command reference: https://docs.dapr.io/reference/cli/dapr-dashboard/
- Run CLI command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Alpha and Beta APIs: https://docs.dapr.io/operations/support/alpha-beta-apis/
- Error codes reference: https://docs.dapr.io/developing-applications/error-codes/error-codes-reference/
- Dapr error codes source: https://github.com/dapr/dapr/blob/master/pkg/messages/errorcodes/errorcodes.go

## Issues Found
1. **Job creation payload used protobuf `Any` format instead of plain JSON (lines 39-43):** The `data` field in the job creation curl example used `{"@type": "type.googleapis.com/google.protobuf.StringValue", "value": "test"}`, which is the gRPC/protobuf representation. The HTTP API expects `data` as a JSON-serialized string. Changed to `"{\"value\":\"test\"}"` to match the official HTTP API documentation.

2. **Fabricated error code `ERR_JOB_SCHEDULER_NOT_FOUND` (line 50):** This error code does not exist in Dapr. The actual scheduler-related error codes use the `DAPR_SCHEDULER_*` prefix (e.g., `DAPR_SCHEDULER_SCHEDULE_JOB`, `DAPR_SCHEDULER_GET_JOB`). Changed to `DAPR_SCHEDULER_SCHEDULE_JOB` with an appropriate message.

3. **Handler test curl also used protobuf format (line 83):** The manual handler test curl command used the same incorrect protobuf `Any` format in its data payload. Updated to match the corrected HTTP API format.

## Review Notes
- The Jobs API remains in alpha (`v1.0-alpha1`) as of Dapr v1.17. The Scheduler service itself became stable in v1.15, but the Jobs API has not yet graduated to stable. This is correctly reflected in the post's API paths.
- The `ERR_MALFORMED_REQUEST` error code is valid and confirmed in the Dapr error codes reference.
- The JSON code block containing comments (`// Scheduler not available`) is not valid JSON syntax, but this is a common blog convention for annotating examples and does not affect the technical accuracy of the content.
- The PVC naming pattern `dapr-scheduler-data-dir-dapr-scheduler-server-0` is confirmed in official docs on persisting scheduler data.
