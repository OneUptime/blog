# Validation Summary: How to Monitor Atlas Stream Processing Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Stream Processing
- MongoDB Atlas Administration API v2
- mongosh (MongoDB Shell)
- Python (requests library with HTTPDigestAuth)
- Atlas Alerts (PagerDuty, Webhook integrations)

## Sources Consulted
- MongoDB Atlas Stream Processing documentation: https://www.mongodb.com/docs/atlas/atlas-stream-processing/
- sp.listStreamProcessors() reference: https://www.mongodb.com/docs/manual/reference/method/sp.liststreamprocessors/
- sp.processor.start() reference: https://www.mongodb.com/docs/manual/reference/method/sp.processor.start/
- sp.createStreamProcessor() reference: https://www.mongodb.com/docs/manual/reference/method/sp.createstreamprocessor/
- Atlas Stream Processing architecture: https://www.mongodb.com/docs/atlas/atlas-stream-processing/architecture/
- Atlas Admin API v2 versioning: https://www.mongodb.com/docs/atlas/api/versioned-api-overview/
- Atlas CLI streams commands: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-api-streams-startstreamprocessor/
- Atlas Stream Processing monitoring: https://www.mongodb.com/docs/atlas/atlas-stream-processing/monitoring/

## Issues Found

1. **Incorrect pipeline states** (Key Metrics section): Changed "RUNNING, STOPPED, or ERROR" to "CREATED, STARTED, STOPPED, or FAILED". MongoDB Atlas Stream Processing uses STARTED (not RUNNING) and FAILED (not ERROR), and also has a CREATED state.

2. **Incorrect mongosh command for listing processors** (Checking Pipeline Status section): Replaced `use admin` + `db.runCommand({ listStreamProcessors: 1 })` with `sp.listStreamProcessors()`. Stream processors are managed via the `sp.` namespace on a Stream Processing Instance connection, not via `db.runCommand()` on a regular database.

3. **Incorrect mongosh command for starting processors** (Best Practices section): Replaced `db.runCommand({ startStreamProcessor: "pipelineName" })` with `sp.pipelineName.start()`. Same reason as above — stream processor management uses the `sp.` namespace.

4. **Incorrect DLQ collection name** (Analyzing DLQ Messages section): The post used a hardcoded `__dlq__` collection name, but the DLQ collection is user-defined when creating a stream processor via the `dlq` option in `sp.createStreamProcessor()`. Updated the example to show a user-defined collection name with a comment explaining this.

5. **Incorrect API path parameter name** (API sections): Changed `{instanceName}` to `{tenantName}` in the Atlas Admin API URL and updated the corresponding Python variable. The Atlas Admin API v2 uses `tenantName` as the path parameter for stream processing instances.

## Review Notes
- The exact `/metrics` endpoint path on the Atlas Admin API for stream processing could not be fully confirmed in documentation. Stream processing metrics are primarily accessed through the Atlas UI and `sp.<processor>.stats()` in mongosh. The API example is illustrative but readers should verify the exact endpoint against current Atlas API documentation.
- The API version header `application/vnd.atlas.2023-02-01+json` is a valid format, though readers should check which API version is current for stream processing endpoints specifically.
- The Python script structure is correct and would work assuming the API endpoint exists as shown.
- Atlas Stream Processing is a relatively new feature and its API surface may evolve; readers should consult current MongoDB documentation.
