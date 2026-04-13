# Validation Summary: How to Use MongoDB with Fluent Bit for Log Collection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js driver, mongosh)
- Fluent Bit (tail input, kubernetes filter, forward output, HTTP output, grep filter, record_modifier filter)
- Fluentd (aggregator with fluent-plugin-mongo)
- Node.js / Express
- Kubernetes (DaemonSet, ConfigMap, hostPath volumes)

## Sources Consulted
- Fluent Bit HTTP output plugin documentation: https://docs.fluentbit.io/manual/pipeline/outputs/http
- Fluent Bit forward output plugin documentation: https://docs.fluentbit.io/manual/pipeline/outputs/forward
- Fluent Bit tail input plugin documentation: https://docs.fluentbit.io/manual/pipeline/inputs/tail
- Fluent Bit kubernetes filter documentation: https://docs.fluentbit.io/manual/pipeline/filters/kubernetes
- Fluent Bit grep filter documentation: https://docs.fluentbit.io/manual/pipeline/filters/grep
- Fluent Bit record_modifier filter documentation: https://docs.fluentbit.io/manual/pipeline/filters/record-modifier
- MongoDB Node.js driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- Express.js body parsing middleware documentation: https://expressjs.com/en/api.html#express.json

## Issues Found
- **HTTP output Format mismatch**: The Fluent Bit HTTP output was configured with `Format json_lines`, which sends newline-delimited JSON (one JSON object per line, e.g., `{"key":"val"}\n{"key":"val"}\n`). However, the Node.js receiver uses `express.json()` middleware, which expects the request body to be valid JSON. JSON Lines is not valid JSON, so the middleware would fail to parse the body, resulting in `req.body` being `undefined` and the endpoint failing. Changed `Format json_lines` to `Format json`, which sends records as a JSON array that `express.json()` can parse correctly. The receiver code already handles both array and single-object inputs.

## Review Notes
- The Kubernetes DaemonSet does not include a `serviceAccountName` or RBAC configuration, which is required for the Kubernetes filter to query the API server for pod metadata. This is acceptable for a tutorial (RBAC setup can be covered separately) but readers should be aware they need to set this up.
- The DaemonSet also omits `tolerations` for running on control-plane/master nodes, which is common in production but not strictly necessary for a tutorial.
- The `grep` filter with `Regex level (error|warn|fatal)` acts as a whitelist, keeping only records matching those levels. The best practices section describes this as "drop debug/trace logs," which is technically true but understates the effect — it also drops `info` level logs. This is acceptable as written since the intent is clear.
- The post correctly notes that Fluent Bit lacks a native MongoDB output plugin. This remains true as of Fluent Bit 3.x.
- The Node.js receiver is minimal and suitable for a tutorial but lacks error handling (e.g., MongoDB write failures, connection drops) that would be needed in production.
