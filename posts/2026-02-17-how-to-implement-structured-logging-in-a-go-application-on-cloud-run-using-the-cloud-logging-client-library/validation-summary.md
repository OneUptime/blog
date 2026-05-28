# Validation Summary: How to Use Structured Logging in a Go App on Cloud Run Using the Cloud Logging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Google Cloud Run
- Cloud Logging
- Cloud Logging Go client library
- Structured JSON logging
- Cloud Trace request correlation

## Sources Consulted
- Google Cloud Run logging documentation: https://docs.cloud.google.com/run/docs/logging
- Cloud Logging structured logging documentation: https://cloud.google.com/logging/docs/structured-logging
- Cloud Logging LogEntry REST reference: https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
- Go Cloud Logging client package documentation: https://pkg.go.dev/cloud.google.com/go/logging

## Issues Found
- The first Go snippet used `strings.SplitN` in the handler example but did not import `strings`. Added the missing import.
- The Cloud Logging client setup snippet used `time.Second` but did not import `time`. Added the missing import.
- The client library handler examples called `extractTrace(r)`, but the post did not define that helper. Added a small helper that parses `X-Cloud-Trace-Context` and returns the Cloud Logging trace resource name.
- The trace examples could emit a malformed trace resource name when `GOOGLE_CLOUD_PROJECT` was empty. Added guards so trace correlation is only set when both the project ID and trace header are available.
- The `Close` method ignored the error returned by `client.Close()`. Updated it to log the close error, matching the documented API behavior.
- The text-log comparison said plain `fmt.Println` loses the ability to filter by severity level. Cloud Logging still assigns default severities to captured logs, but plain text does not let the app set per-entry severity. Reworded this to "Set application-specific severity levels."

## Review Notes
The post is technically sound after the fixes. The Go Cloud Logging client can also automatically populate trace, span ID, and trace sampling fields when `logging.Entry.HTTPRequest.Request` is set, so future revisions could simplify some explicit trace handling when each entry includes the HTTP request.
