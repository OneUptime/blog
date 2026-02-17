# How to Handle Errors and Implement Retries in Cloud Workflows Using Try/Except Blocks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Workflows, Error Handling, Retries, Reliability

Description: Learn how to handle errors gracefully and implement retry logic in Google Cloud Workflows using try/except blocks, custom error types, and exponential backoff patterns.

---

Any workflow that calls external services will eventually encounter errors. APIs go down, rate limits get hit, network connections time out, and services return unexpected responses. A workflow without error handling fails on the first hiccup. A workflow with good error handling retries transient failures, logs permanent failures, and degrades gracefully instead of crashing.

This guide covers everything you need to know about error handling in Cloud Workflows, from basic try/except blocks to sophisticated retry patterns with exponential backoff.

## Basic Try/Except

The simplest form of error handling catches all errors from a step.

```yaml
# basic-error-handling.yaml
main:
  steps:
    - try_api_call:
        try:
          call: http.get
          args:
            url: https://api.example.com/data
          result: api_response
        except:
          as: e
          steps:
            - log_error:
                call: sys.log
                args:
                  text: ${"API call failed: " + e.message}
                  severity: "ERROR"
            - set_default:
                assign:
                  - api_response:
                      body:
                        data: []
                        fallback: true

    - use_result:
        return: ${api_response.body}
```

When the API call fails, the workflow catches the error, logs it, and sets a default response instead of crashing.

## Catching Specific Error Types

Not all errors are the same. You can catch specific HTTP status codes and error types.

```yaml
# specific-error-handling.yaml
main:
  steps:
    - call_api:
        try:
          call: http.post
          args:
            url: https://api.example.com/process
            auth:
              type: OIDC
            body:
              data: "test"
          result: response
        except:
          as: e
          steps:
            - check_error_type:
                switch:
                  # Rate limited - should retry after a delay
                  - condition: ${e.code == 429}
                    next: handle_rate_limit

                  # Server error - transient, worth retrying
                  - condition: ${e.code >= 500}
                    next: handle_server_error

                  # Client error - our fault, do not retry
                  - condition: ${e.code >= 400 and e.code < 500}
                    next: handle_client_error

                  # Other errors (network, timeout)
                  - condition: true
                    next: handle_unknown_error

    - handle_rate_limit:
        call: sys.log
        args:
          text: "Rate limited. Consider adding delay."
          severity: "WARNING"
        next: return_error

    - handle_server_error:
        call: sys.log
        args:
          text: ${"Server error: " + string(e.code)}
          severity: "ERROR"
        next: return_error

    - handle_client_error:
        raise:
          code: ${e.code}
          message: ${"Client error - cannot retry: " + e.message}

    - handle_unknown_error:
        call: sys.log
        args:
          text: ${"Unknown error: " + e.message}
          severity: "ERROR"
        next: return_error

    - success:
        return:
          status: "success"
          data: ${response.body}

    - return_error:
        return:
          status: "error"
          error_code: ${e.code}
          message: ${e.message}
```

## Implementing Retry Logic

Cloud Workflows does not have built-in retry syntax on individual steps, but you can build retry logic using loops and try/except.

```yaml
# retry-with-backoff.yaml
# Retry an API call up to 3 times with increasing delays

main:
  steps:
    - init_retry:
        assign:
          - max_retries: 3
          - retry_count: 0
          - base_delay: 1  # Starting delay in seconds
          - last_error: null

    - retry_loop:
        for:
          value: attempt
          range: [0, ${max_retries}]
          steps:
            - try_call:
                try:
                  call: http.post
                  args:
                    url: https://api.example.com/unreliable-endpoint
                    body:
                      request_id: "req-123"
                    timeout: 30
                  result: api_response
                except:
                  as: e
                  steps:
                    - record_error:
                        assign:
                          - last_error: ${e}
                          - retry_count: ${retry_count + 1}

                    - check_if_retryable:
                        switch:
                          # Only retry on transient errors
                          - condition: ${e.code == 429 or e.code >= 500}
                            next: wait_before_retry
                          # Non-retryable error - fail immediately
                          - condition: true
                            raise: ${e}

                    - wait_before_retry:
                        call: sys.sleep
                        args:
                          # Exponential backoff: 1s, 2s, 4s
                          seconds: ${base_delay * int(math.pow(2, attempt))}

                    - log_retry:
                        call: sys.log
                        args:
                          text: ${"Retry " + string(retry_count) + "/" + string(max_retries) + " after error: " + e.message}
                          severity: "WARNING"

                    # Continue to next iteration of the retry loop
                    - continue_loop:
                        next: continue

            # If we reach here without error, the call succeeded
            - success:
                return:
                  status: "success"
                  data: ${api_response.body}
                  attempts: ${retry_count + 1}

    # If we exit the loop, all retries failed
    - all_retries_failed:
        raise:
          code: 503
          message: ${"All " + string(max_retries) + " retries failed. Last error: " + last_error.message}
```

## Reusable Retry Subworkflow

Create a reusable retry subworkflow you can call from multiple places.

```yaml
# reusable-retry.yaml

main:
  steps:
    # Call the retry wrapper for an unreliable API
    - call_api_with_retry:
        call: retry_http_call
        args:
          url: "https://api.example.com/data"
          method: "GET"
          max_retries: 5
          initial_delay: 2
        result: api_result

    - return_result:
        return: ${api_result}

# Reusable subworkflow for retrying HTTP calls
retry_http_call:
  params: [url, method, max_retries, initial_delay, body]
  steps:
    - init:
        assign:
          - attempt: 0
          - last_error: null

    - retry_loop:
        for:
          value: i
          range: [0, ${max_retries}]
          steps:
            - attempt_call:
                try:
                  steps:
                    - make_request:
                        switch:
                          - condition: ${method == "GET"}
                            steps:
                              - do_get:
                                  call: http.get
                                  args:
                                    url: ${url}
                                    auth:
                                      type: OIDC
                                    timeout: 60
                                  result: response
                          - condition: ${method == "POST"}
                            steps:
                              - do_post:
                                  call: http.post
                                  args:
                                    url: ${url}
                                    auth:
                                      type: OIDC
                                    body: ${body}
                                    timeout: 60
                                  result: response

                    - return_success:
                        return: ${response}

                except:
                  as: e
                  steps:
                    - update_attempt:
                        assign:
                          - attempt: ${attempt + 1}
                          - last_error: ${e}

                    - check_retryable:
                        switch:
                          - condition: ${e.code == 429 or e.code >= 500}
                            next: do_backoff
                          - condition: true
                            raise: ${e}

                    - do_backoff:
                        call: sys.sleep
                        args:
                          seconds: ${initial_delay * int(math.pow(2, i))}

                    - log_retry:
                        call: sys.log
                        args:
                          text: ${"Attempt " + string(attempt) + " failed: " + e.message}
                          severity: "WARNING"
                        next: continue

    - exhausted:
        raise:
          code: 503
          message: ${"Exhausted " + string(max_retries) + " retries. Last error: " + last_error.message}
```

## Nested Try/Except for Multi-Step Error Handling

When you have multiple steps that could fail, use nested try/except blocks to handle each appropriately.

```yaml
# nested-error-handling.yaml
main:
  steps:
    - outer_try:
        try:
          steps:
            # Step 1: Fetch data (may fail)
            - fetch_data:
                try:
                  call: http.get
                  args:
                    url: https://api.example.com/data
                  result: data_response
                except:
                  as: fetch_error
                  steps:
                    - use_cached_data:
                        call: sys.log
                        args:
                          text: "Primary data source failed, using cache"
                          severity: "WARNING"
                    - set_cached:
                        assign:
                          - data_response:
                              body:
                                items: []
                                source: "cache"

            # Step 2: Process data (may fail)
            - process_data:
                try:
                  call: http.post
                  args:
                    url: https://processor.example.com/process
                    body: ${data_response.body}
                  result: process_result
                except:
                  as: process_error
                  steps:
                    - log_process_failure:
                        call: sys.log
                        args:
                          text: ${"Processing failed: " + process_error.message}
                          severity: "ERROR"
                    - raise_process_error:
                        raise: ${process_error}

            # Step 3: Store results (may fail)
            - store_results:
                try:
                  call: http.post
                  args:
                    url: https://storage.example.com/store
                    body: ${process_result.body}
                  result: store_result
                except:
                  as: store_error
                  steps:
                    - log_store_failure:
                        call: sys.log
                        args:
                          text: "Storage failed, queueing for retry"
                          severity: "ERROR"
                    - queue_for_retry:
                        call: http.post
                        args:
                          url: https://us-central1-my-project.cloudfunctions.net/queue-retry
                          auth:
                            type: OIDC
                          body:
                            failed_data: ${process_result.body}
                            error: ${store_error.message}

        except:
          as: outer_error
          steps:
            - final_error_handler:
                call: sys.log
                args:
                  text: ${"Workflow failed: " + outer_error.message}
                  severity: "CRITICAL"
            - return_failure:
                return:
                  status: "failed"
                  error: ${outer_error.message}

    - return_success:
        return:
          status: "success"
```

## Custom Error Types

Define meaningful error types to make your error handling clearer.

```yaml
# custom-errors.yaml
main:
  params: [args]
  steps:
    - validate:
        switch:
          - condition: ${not("user_id" in args)}
            raise:
              code: 400
              message: "Missing required field: user_id"
              type: "ValidationError"

          - condition: ${args.user_id == ""}
            raise:
              code: 400
              message: "user_id cannot be empty"
              type: "ValidationError"

    - fetch_user:
        try:
          call: http.get
          args:
            url: ${"https://api.example.com/users/" + args.user_id}
          result: user_response
        except:
          as: e
          steps:
            - check_not_found:
                switch:
                  - condition: ${e.code == 404}
                    raise:
                      code: 404
                      message: ${"User not found: " + args.user_id}
                      type: "NotFoundError"
                  - condition: true
                    raise:
                      code: ${e.code}
                      message: ${e.message}
                      type: "APIError"

    - return_user:
        return: ${user_response.body}
```

## Wrapping Up

Error handling in Cloud Workflows requires explicit try/except blocks, but the patterns are straightforward once you learn them. For transient errors (rate limits, server errors), implement retry loops with exponential backoff. For permanent errors (bad requests, not found), fail fast with clear error messages. Use nested try/except when different steps need different error handling strategies, and create reusable retry subworkflows to avoid duplicating logic. The combination of try/except, switch conditions, and sys.sleep gives you everything you need to build resilient workflows that handle real-world failure modes gracefully.
