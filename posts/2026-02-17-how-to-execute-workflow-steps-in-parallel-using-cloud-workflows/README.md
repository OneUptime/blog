# How to Execute Workflow Steps in Parallel Using Cloud Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Workflows, Parallel Execution, Concurrency, Performance

Description: Learn how to use parallel branches in Google Cloud Workflows to execute multiple steps concurrently, reducing total execution time for independent operations.

---

Sequential execution is the default in Cloud Workflows - step A runs, then step B, then step C. But what happens when steps B and C do not depend on each other? Running them one after another wastes time. If each takes 5 seconds, sequential execution costs you 10 seconds when parallel execution would take only 5. Cloud Workflows supports parallel execution through the `parallel` keyword, letting you run independent branches simultaneously.

This guide covers how to use parallel execution effectively, including shared variables, error handling in parallel branches, and real-world patterns.

## Basic Parallel Execution

The `parallel` keyword creates branches that run simultaneously.

```yaml
# basic-parallel.yaml
# Fetch data from three independent APIs at the same time

main:
  steps:
    - fetch_all_data:
        parallel:
          shared: [weather_data, news_data, stock_data]
          branches:
            - get_weather:
                steps:
                  - call_weather_api:
                      call: http.get
                      args:
                        url: https://api.example.com/weather
                      result: weather_response
                  - store_weather:
                      assign:
                        - weather_data: ${weather_response.body}

            - get_news:
                steps:
                  - call_news_api:
                      call: http.get
                      args:
                        url: https://api.example.com/news
                      result: news_response
                  - store_news:
                      assign:
                        - news_data: ${news_response.body}

            - get_stocks:
                steps:
                  - call_stock_api:
                      call: http.get
                      args:
                        url: https://api.example.com/stocks
                      result: stock_response
                  - store_stocks:
                      assign:
                        - stock_data: ${stock_response.body}

    - combine_results:
        return:
          weather: ${weather_data}
          news: ${news_data}
          stocks: ${stock_data}
```

All three API calls execute at the same time. The workflow waits for all branches to complete before moving to `combine_results`.

## Understanding Shared Variables

Variables declared in the `shared` list are accessible across all parallel branches. Without `shared`, each branch has its own isolated scope.

```yaml
# shared-variables.yaml
main:
  steps:
    # Initialize shared variables before the parallel block
    - init:
        assign:
          - results: {}
          - error_count: 0

    - parallel_processing:
        parallel:
          # These variables can be read and written by all branches
          shared: [results, error_count]
          branches:
            - branch_a:
                steps:
                  - do_work_a:
                      try:
                        call: http.get
                        args:
                          url: https://api.example.com/endpoint-a
                        result: response_a
                      except:
                        as: e
                        steps:
                          - count_error_a:
                              assign:
                                - error_count: ${error_count + 1}
                  - save_result_a:
                      assign:
                        - results["service_a"]: ${response_a.body}

            - branch_b:
                steps:
                  - do_work_b:
                      try:
                        call: http.get
                        args:
                          url: https://api.example.com/endpoint-b
                        result: response_b
                      except:
                        as: e
                        steps:
                          - count_error_b:
                              assign:
                                - error_count: ${error_count + 1}
                  - save_result_b:
                      assign:
                        - results["service_b"]: ${response_b.body}

    - summary:
        return:
          results: ${results}
          errors: ${error_count}
```

## Parallel For Loops

When you need to process a list of items in parallel, use `parallel` with a `for` loop.

```yaml
# parallel-for.yaml
# Process multiple items in parallel

main:
  steps:
    - setup:
        assign:
          - items:
              - {id: "item-1", url: "https://api.example.com/process/1"}
              - {id: "item-2", url: "https://api.example.com/process/2"}
              - {id: "item-3", url: "https://api.example.com/process/3"}
              - {id: "item-4", url: "https://api.example.com/process/4"}
              - {id: "item-5", url: "https://api.example.com/process/5"}
          - processed_results: []

    - process_in_parallel:
        parallel:
          shared: [processed_results]
          for:
            value: item
            in: ${items}
            steps:
              - process_item:
                  call: http.post
                  args:
                    url: ${item.url}
                    body:
                      item_id: ${item.id}
                  result: item_result

              - collect_result:
                  assign:
                    - processed_results: ${list.concat(processed_results, item_result.body)}

    - return_all:
        return:
          total_processed: ${len(processed_results)}
          results: ${processed_results}
```

## Controlling Concurrency

You can limit how many parallel branches run at the same time to avoid overwhelming downstream services.

```yaml
# concurrency-control.yaml
# Process items in parallel but limit to 5 concurrent executions

main:
  steps:
    - setup:
        assign:
          - urls: []
          - results: []
          # Generate a list of 20 URLs to process
          - i: 0

    - build_url_list:
        for:
          value: i
          range: [1, 21]
          steps:
            - add_url:
                assign:
                  - urls: ${list.concat(urls, "https://api.example.com/item/" + string(i))}

    - parallel_with_limit:
        parallel:
          shared: [results]
          # Limit concurrent branches to 5
          concurrency_limit: 5
          for:
            value: url
            in: ${urls}
            steps:
              - fetch:
                  call: http.get
                  args:
                    url: ${url}
                    timeout: 30
                  result: response

              - save:
                  assign:
                    - results: ${list.concat(results, response.body)}

    - done:
        return:
          count: ${len(results)}
```

The `concurrency_limit` parameter ensures no more than 5 branches execute simultaneously, even though there are 20 items to process.

## Error Handling in Parallel Branches

By default, if any parallel branch fails, the entire parallel block fails. Use try/except within branches to handle errors independently.

```yaml
# parallel-error-handling.yaml
main:
  steps:
    - init:
        assign:
          - successful: []
          - failed: []

    - parallel_with_error_handling:
        parallel:
          shared: [successful, failed]
          branches:
            - branch_1:
                steps:
                  - try_branch_1:
                      try:
                        call: http.get
                        args:
                          url: https://api.example.com/reliable-service
                        result: result_1
                      except:
                        as: e
                        steps:
                          - record_failure_1:
                              assign:
                                - failed: ${list.concat(failed, {"service": "reliable", "error": e.message})}
                              next: end
                  - record_success_1:
                      assign:
                        - successful: ${list.concat(successful, {"service": "reliable", "data": result_1.body})}

            - branch_2:
                steps:
                  - try_branch_2:
                      try:
                        call: http.get
                        args:
                          url: https://api.example.com/unreliable-service
                          timeout: 10
                        result: result_2
                      except:
                        as: e
                        steps:
                          - record_failure_2:
                              assign:
                                - failed: ${list.concat(failed, {"service": "unreliable", "error": e.message})}
                              next: end
                  - record_success_2:
                      assign:
                        - successful: ${list.concat(successful, {"service": "unreliable", "data": result_2.body})}

            - branch_3:
                steps:
                  - try_branch_3:
                      try:
                        call: http.get
                        args:
                          url: https://api.example.com/flaky-service
                          timeout: 10
                        result: result_3
                      except:
                        as: e
                        steps:
                          - record_failure_3:
                              assign:
                                - failed: ${list.concat(failed, {"service": "flaky", "error": e.message})}
                              next: end
                  - record_success_3:
                      assign:
                        - successful: ${list.concat(successful, {"service": "flaky", "data": result_3.body})}

    - return_summary:
        return:
          successful_count: ${len(successful)}
          failed_count: ${len(failed)}
          successful: ${successful}
          failed: ${failed}
```

## A Practical Example: Parallel Notification Delivery

Here is a real-world pattern - sending notifications through multiple channels simultaneously.

```yaml
# parallel-notifications.yaml
# Send notifications via email, Slack, and SMS in parallel

main:
  params: [args]
  steps:
    - validate:
        assign:
          - message: ${args.message}
          - severity: ${args.severity}
          - delivery_results: {}

    - send_all_notifications:
        parallel:
          shared: [delivery_results]
          branches:
            - email_branch:
                steps:
                  - send_email:
                      try:
                        call: http.post
                        args:
                          url: https://email-service-xxxxx-uc.a.run.app/send
                          auth:
                            type: OIDC
                          body:
                            to: ${args.email_recipients}
                            subject: ${"[" + severity + "] " + message}
                            body: ${args.detail}
                        result: email_result
                      except:
                        as: e
                        steps:
                          - email_failed:
                              assign:
                                - delivery_results["email"]: {"status": "failed", "error": ${e.message}}
                              next: end
                  - email_success:
                      assign:
                        - delivery_results["email"]: {"status": "sent"}

            - slack_branch:
                steps:
                  - send_slack:
                      try:
                        call: http.post
                        args:
                          url: https://hooks.slack.com/services/xxx/yyy/zzz
                          body:
                            text: ${"*[" + severity + "]* " + message + "\n" + args.detail}
                        result: slack_result
                      except:
                        as: e
                        steps:
                          - slack_failed:
                              assign:
                                - delivery_results["slack"]: {"status": "failed", "error": ${e.message}}
                              next: end
                  - slack_success:
                      assign:
                        - delivery_results["slack"]: {"status": "sent"}

            - sms_branch:
                steps:
                  - check_sms_needed:
                      switch:
                        - condition: ${severity != "critical"}
                          assign:
                            - delivery_results["sms"]: {"status": "skipped", "reason": "not critical"}
                          next: end
                  - send_sms:
                      try:
                        call: http.post
                        args:
                          url: https://sms-service-xxxxx-uc.a.run.app/send
                          auth:
                            type: OIDC
                          body:
                            phone: ${args.sms_number}
                            message: ${"[" + severity + "] " + message}
                        result: sms_result
                      except:
                        as: e
                        steps:
                          - sms_failed:
                              assign:
                                - delivery_results["sms"]: {"status": "failed", "error": ${e.message}}
                              next: end
                  - sms_success:
                      assign:
                        - delivery_results["sms"]: {"status": "sent"}

    - return_delivery_report:
        return:
          message: ${message}
          delivery: ${delivery_results}
```

## Wrapping Up

Parallel execution in Cloud Workflows is essential for workflows that call multiple independent services. Use `parallel` with `branches` for a fixed set of concurrent tasks, and `parallel` with `for` for dynamic lists. Always declare shared variables explicitly, use `concurrency_limit` to avoid overwhelming downstream services, and wrap each branch in try/except to prevent one failure from canceling everything. The time savings from parallel execution add up quickly - a workflow that calls five services sequentially at 3 seconds each takes 15 seconds total, while running them in parallel takes only 3 seconds.
