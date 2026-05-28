# Validation Summary: How to Call External HTTP APIs from Google Cloud Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Workflows
- Workflows HTTP standard library functions
- Workflows expressions, loops, error handling, and standard library helpers
- Google Cloud Secret Manager connector
- REST API authentication patterns
- Slack incoming webhooks

## Sources Consulted
- Google Cloud Workflows: Make an HTTP request - https://docs.cloud.google.com/workflows/docs/http-requests
- Google Cloud Workflows: Function http.request - https://docs.cloud.google.com/workflows/docs/reference/stdlib/http/request
- Google Cloud Workflows: Syntax overview - https://docs.cloud.google.com/workflows/docs/reference/syntax
- Google Cloud Workflows: Expressions - https://docs.cloud.google.com/workflows/docs/reference/syntax/expressions
- Google Cloud Workflows: Lists - https://docs.cloud.google.com/workflows/docs/reference/syntax/lists
- Google Cloud Workflows: Function sys.sleep - https://docs.cloud.google.com/workflows/docs/reference/stdlib/sys/sleep
- Google Cloud Workflows: Secure and store sensitive data using the Secret Manager connector - https://docs.cloud.google.com/workflows/docs/use-secret-manager
- Google Cloud Workflows: Function time.format - https://cloud.google.com/workflows/docs/reference/stdlib/time/format
- Slack: Sending messages using incoming webhooks - https://api.slack.com/messaging/webhooks

## Issues Found
- The introductory HTTP section named only `http.get` and `http.post`, while the example also used `http.put` and `http.delete`. Updated the sentence to include those common built-in HTTP functions.
- The API-key-in-header example used a real WeatherAPI endpoint whose documented authentication pattern is a query parameter rather than `X-API-Key`. Replaced it with a generic placeholder API URL so the snippet accurately demonstrates the header-auth pattern.
- The pagination example used `list.concat(all_items, page_response.body.items)`, which appends one element and would add the whole page list as a nested element. Changed it to loop through `page_response.body.items` and append each item individually.
- The rate-limit handler checked `e.code` without first confirming the exception was an HTTP error. Updated the condition to check `"HttpError" in e.tags` before comparing the status code.
- The throttling example used `sys.sleep` with `seconds: 0.5`. Changed it to `seconds: 1` to match the documented seconds-based usage.
- The Slack incoming webhook example included `channel` and `username` fields. Slack's current incoming webhook docs state that app webhooks cannot override the default channel or username, so the payload was reduced to `text`.

## Review Notes
The remaining examples use placeholder URLs and credentials, so they require real endpoints, secrets, and IAM permissions before deployment. The Secret Manager connector usage is current, including `accessString`, and the workflow service account must have Secret Manager Secret Accessor permission for the referenced secret.
