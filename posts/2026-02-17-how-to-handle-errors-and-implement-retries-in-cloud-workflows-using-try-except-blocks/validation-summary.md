# Validation Summary: Handle Errors and Implement Retries in Cloud Workflows Using Try/Except Blocks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Workflows
- Workflows YAML syntax
- Workflows try/except error handling
- Workflows retry policies and exponential backoff
- Workflows HTTP calls and error maps

## Sources Consulted
- Google Cloud Workflows syntax overview: https://docs.cloud.google.com/workflows/docs/reference/syntax
- Google Cloud Workflows catch errors documentation: https://docs.cloud.google.com/workflows/docs/reference/syntax/catching-errors
- Google Cloud Workflows retry steps documentation: https://docs.cloud.google.com/workflows/docs/reference/syntax/retrying
- Google Cloud Workflows workflow errors documentation: https://docs.cloud.google.com/workflows/docs/reference/syntax/error-types
- Google Cloud Workflows raise errors documentation: https://docs.cloud.google.com/workflows/docs/reference/syntax/raising-errors
- Google Cloud Workflows iteration documentation: https://docs.cloud.google.com/workflows/docs/reference/syntax/iteration
- Google Cloud Workflows standard library overview: https://docs.cloud.google.com/workflows/docs/reference/stdlib/overview
- Google Cloud Workflows subworkflows documentation: https://docs.cloud.google.com/workflows/docs/reference/syntax/subworkflows

## Issues Found
- The post incorrectly claimed that Cloud Workflows does not have built-in retry syntax on individual steps. Updated the retry section to use the documented `try`/`retry`/`except` syntax with a retry predicate and backoff policy.
- Manual retry examples used `math.pow`, but the Workflows standard library does not provide `math.pow`. Replaced the affected examples with native retry backoff configuration.
- Manual retry examples used inclusive `for` ranges and `return` inside loops in ways that could produce incorrect attempt counts or invalid Workflows syntax. Replaced those snippets with native retry policies.
- HTTP-specific error handling checked `e.code` without first ensuring the error was an HTTP error. Added checks for the `HttpError` tag and used `map.get`/`default` where fields may be absent.
- Several YAML expressions containing colons inside string literals were unquoted, which is invalid YAML. Quoted those Workflows expressions so the snippets parse correctly.
- The reusable retry subworkflow omitted the `body` argument while declaring it as a parameter. Added a default `body: null` parameter and passed `body: null` in the GET example.
- The wrapping summary referred to retry loops and `sys.sleep` after the examples were corrected to use native retry policies. Updated the summary to match the corrected implementation.

## Review Notes
The examples use placeholder domains such as `api.example.com`; these are appropriate illustrative URLs and were not expected to be runnable endpoints. Local validation confirmed all fenced YAML snippets parse as YAML after the fixes.
