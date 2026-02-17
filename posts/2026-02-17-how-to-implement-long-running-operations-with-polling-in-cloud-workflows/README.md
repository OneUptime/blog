# How to Implement Long-Running Operations with Polling in Cloud Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Workflows, Polling, Long-Running Operations, Async

Description: Learn how to handle long-running operations in Google Cloud Workflows using polling loops with backoff strategies to wait for async tasks to complete.

---

Many Google Cloud APIs return long-running operations (LROs) instead of immediate results. When you create a GKE cluster, start a BigQuery job, or export a Firestore database, you get back an operation ID and have to check on it periodically until it finishes. Cloud Workflows handles this pattern well, and in this post I will show you how to implement polling loops that wait for these operations to complete.

## The Long-Running Operation Pattern

When you call an API that returns an LRO, the initial response looks something like this:

```json
{
  "name": "operations/abc123",
  "metadata": {
    "type": "type.googleapis.com/...",
    "createTime": "2026-02-17T10:00:00Z"
  },
  "done": false
}
```

The `done` field is `false`, meaning the operation is still running. You need to poll the operation endpoint until `done` becomes `true`, then check whether it succeeded or failed.

## Basic Polling Loop

Here is a straightforward polling implementation.

```yaml
# polling-workflow.yaml
# Polls a long-running operation until it completes
main:
  steps:
    - start_operation:
        # Kick off a long-running operation (example: export Firestore)
        call: http.post
        args:
          url: https://firestore.googleapis.com/v1/projects/my-project/databases/(default):exportDocuments
          auth:
            type: OAuth2
          body:
            outputUriPrefix: "gs://my-bucket/firestore-export"
        result: operation_response

    - extract_operation:
        assign:
          - operation_name: ${operation_response.body.name}

    - poll_loop:
        call: poll_operation
        args:
          operation_name: ${operation_name}
        result: final_result

    - check_result:
        switch:
          - condition: ${"error" in final_result}
            raise: ${"Operation failed with error - " + json.encode_to_string(final_result.error)}
          - condition: true
            return: ${final_result}

# Subworkflow that polls an operation until completion
poll_operation:
  params: [operation_name]
  steps:
    - init:
        assign:
          - poll_interval: 5
          - max_polls: 120
          - poll_count: 0

    - check_operation:
        call: http.get
        args:
          url: ${"https://firestore.googleapis.com/v1/" + operation_name}
          auth:
            type: OAuth2
        result: op_status

    - evaluate:
        switch:
          - condition: ${op_status.body.done == true}
            # Operation is done, return the result
            return: ${op_status.body}
          - condition: ${poll_count >= max_polls}
            raise: "Polling timed out - operation did not complete within expected time"

    - wait_and_retry:
        assign:
          - poll_count: ${poll_count + 1}

    - sleep:
        call: sys.sleep
        args:
          seconds: ${poll_interval}

    - continue_polling:
        next: check_operation
```

## Polling with Exponential Backoff

Polling at a fixed interval is wasteful. If an operation typically takes 10 minutes, there is no point checking every 5 seconds for the first 9 minutes. Exponential backoff starts with short intervals and gradually increases them.

```yaml
# Subworkflow with exponential backoff polling
poll_with_backoff:
  params: [operation_url, initial_delay, max_delay, max_wait_time]
  steps:
    - init:
        assign:
          - current_delay: ${initial_delay}
          - total_waited: 0
          - attempt: 0

    - check_status:
        call: http.get
        args:
          url: ${operation_url}
          auth:
            type: OAuth2
        result: status_response

    - evaluate_status:
        switch:
          - condition: ${status_response.body.done == true}
            return: ${status_response.body}
          - condition: ${total_waited >= max_wait_time}
            raise: ${"Operation timed out after " + string(total_waited) + " seconds"}

    - log_progress:
        call: sys.log
        args:
          text: ${"Poll attempt " + string(attempt) + " - operation still running. Waiting " + string(current_delay) + "s"}
          severity: "INFO"

    - wait:
        call: sys.sleep
        args:
          seconds: ${current_delay}

    - update_counters:
        assign:
          - total_waited: ${total_waited + current_delay}
          - attempt: ${attempt + 1}
          # Double the delay but cap it at max_delay
          - current_delay: ${if(current_delay * 2 > max_delay, max_delay, current_delay * 2)}

    - loop_back:
        next: check_status
```

Call this subworkflow with reasonable parameters.

```yaml
main:
  steps:
    - start_operation:
        call: http.post
        args:
          url: https://some-api.googleapis.com/v1/long-running-task
          auth:
            type: OAuth2
        result: op

    - wait_for_completion:
        call: poll_with_backoff
        args:
          operation_url: ${"https://some-api.googleapis.com/v1/" + op.body.name}
          initial_delay: 2
          max_delay: 60
          max_wait_time: 3600
        result: completed_op
```

With an initial delay of 2 seconds and a max of 60 seconds, the polling intervals would be: 2, 4, 8, 16, 32, 60, 60, 60... This is much more efficient than a fixed interval.

## Real-World Example: BigQuery Job Polling

Here is a practical example that runs a BigQuery query and polls for the result.

```yaml
# bigquery-polling.yaml
# Runs a BigQuery query and polls until results are ready
main:
  params: [args]
  steps:
    - setup:
        assign:
          - project_id: ${sys.get_env("GOOGLE_CLOUD_PROJECT_ID")}
          - query: ${args.query}

    - start_query:
        # Submit the BigQuery query job
        call: http.post
        args:
          url: ${"https://bigquery.googleapis.com/bigquery/v2/projects/" + project_id + "/jobs"}
          auth:
            type: OAuth2
          body:
            configuration:
              query:
                query: ${query}
                useLegacySql: false
        result: job_response

    - extract_job_id:
        assign:
          - job_id: ${job_response.body.jobReference.jobId}

    - poll_job:
        call: poll_bigquery_job
        args:
          project_id: ${project_id}
          job_id: ${job_id}
        result: completed_job

    - get_results:
        call: http.get
        args:
          url: ${"https://bigquery.googleapis.com/bigquery/v2/projects/" + project_id + "/queries/" + job_id}
          auth:
            type: OAuth2
        result: query_results

    - return_data:
        return:
          total_rows: ${query_results.body.totalRows}
          rows: ${query_results.body.rows}

# BigQuery-specific polling subworkflow
poll_bigquery_job:
  params: [project_id, job_id]
  steps:
    - init:
        assign:
          - delay: 2
          - max_delay: 30
          - attempts: 0
          - max_attempts: 200

    - check_job:
        call: http.get
        args:
          url: ${"https://bigquery.googleapis.com/bigquery/v2/projects/" + project_id + "/jobs/" + job_id}
          auth:
            type: OAuth2
        result: job_status

    - evaluate:
        switch:
          - condition: ${job_status.body.status.state == "DONE"}
            steps:
              - check_errors:
                  switch:
                    - condition: ${"errorResult" in job_status.body.status}
                      raise: ${job_status.body.status.errorResult}
                    - condition: true
                      return: ${job_status.body}
          - condition: ${attempts >= max_attempts}
            raise: "BigQuery job polling timed out"

    - backoff:
        call: sys.sleep
        args:
          seconds: ${delay}

    - increment:
        assign:
          - attempts: ${attempts + 1}
          - delay: ${if(delay * 2 > max_delay, max_delay, delay * 2)}

    - retry:
        next: check_job
```

## Handling Operation Failures

When a long-running operation fails, the response includes an error object instead of a result. Always check for this.

```yaml
# Error handling for completed operations
- process_completed_operation:
    switch:
      - condition: ${"error" in completed_operation}
        steps:
          - log_failure:
              call: sys.log
              args:
                text: ${"Operation failed - code " + string(completed_operation.error.code) + " - " + completed_operation.error.message}
                severity: "ERROR"
          - handle_failure:
              raise: ${completed_operation.error}
      - condition: ${"response" in completed_operation}
        steps:
          - log_success:
              call: sys.log
              args:
                text: "Operation completed successfully"
                severity: "INFO"
          - return_response:
              return: ${completed_operation.response}
```

## Polling Multiple Operations in Parallel

If you need to wait for several operations at once, you can use parallel branches.

```yaml
main:
  steps:
    - start_all_operations:
        assign:
          - operations: []

    - launch_exports:
        # Start three export operations
        parallel:
          shared: [operations]
          branches:
            - export_users:
                steps:
                  - start_users:
                      call: http.post
                      args:
                        url: https://api.example.com/export/users
                        auth:
                          type: OAuth2
                      result: users_op
                  - poll_users:
                      call: poll_with_backoff
                      args:
                        operation_url: ${"https://api.example.com/" + users_op.body.name}
                        initial_delay: 5
                        max_delay: 60
                        max_wait_time: 1800
                      result: users_result
            - export_orders:
                steps:
                  - start_orders:
                      call: http.post
                      args:
                        url: https://api.example.com/export/orders
                        auth:
                          type: OAuth2
                      result: orders_op
                  - poll_orders:
                      call: poll_with_backoff
                      args:
                        operation_url: ${"https://api.example.com/" + orders_op.body.name}
                        initial_delay: 5
                        max_delay: 60
                        max_wait_time: 1800
                      result: orders_result
```

## Wrapping Up

Polling for long-running operations is one of the most common patterns in Cloud Workflows. The key takeaways are: always use exponential backoff instead of fixed intervals, set reasonable timeouts so you do not poll forever, check for errors in the completed operation response, and consider parallel polling when waiting for multiple operations. With these patterns in your toolkit, you can reliably orchestrate any async GCP operation from your workflows.
