# How to Use Subworkflows to Organize Complex Cloud Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Workflows, Subworkflows, Code Organization, Best Practices

Description: Learn how to use subworkflows in Google Cloud Workflows to break complex processes into reusable, modular components that are easier to maintain and test.

---

Workflows start simple - a few steps, a couple of API calls. Then requirements grow. You add error handling, conditional logic, parallel branches, and suddenly your workflow definition is 500 lines long and impossible to follow. Subworkflows solve this by letting you break a large workflow into smaller, named functions that can be called from the main flow or from each other.

Think of subworkflows like functions in a programming language. They accept parameters, do work, and return results. They keep your workflow definition organized and let you reuse common patterns.

## Basic Subworkflow Structure

A workflow file can contain multiple workflow definitions. The one named `main` is the entry point. Everything else is a subworkflow.

```yaml
# subworkflow-basics.yaml

# Entry point - this runs when the workflow is executed
main:
  params: [args]
  steps:
    - call_greeting:
        call: create_greeting
        args:
          name: ${args.name}
          language: ${args.language}
        result: greeting

    - return_result:
        return: ${greeting}

# This is a subworkflow - it is called, not run directly
create_greeting:
  params: [name, language]
  steps:
    - choose_greeting:
        switch:
          - condition: ${language == "spanish"}
            assign:
              - prefix: "Hola"
          - condition: ${language == "french"}
            assign:
              - prefix: "Bonjour"
          - condition: true
            assign:
              - prefix: "Hello"

    - format_greeting:
        return: ${prefix + ", " + name + "!"}
```

## Subworkflows with Default Parameters

You can set default values for parameters to make subworkflows more flexible.

```yaml
main:
  steps:
    # Call with all parameters
    - full_call:
        call: send_notification
        args:
          message: "Server is down"
          severity: "critical"
          channel: "pager"
        result: result_1

    # Call with defaults - severity and channel use defaults
    - default_call:
        call: send_notification
        args:
          message: "Disk usage above 80%"
        result: result_2

    - done:
        return:
          notification_1: ${result_1}
          notification_2: ${result_2}

send_notification:
  params:
    - message
    - severity: "info"       # Default value
    - channel: "slack"        # Default value
  steps:
    - determine_endpoint:
        switch:
          - condition: ${channel == "slack"}
            assign:
              - url: "https://hooks.slack.com/services/xxx"
          - condition: ${channel == "email"}
            assign:
              - url: "https://email-service.run.app/send"
          - condition: ${channel == "pager"}
            assign:
              - url: "https://pager-service.run.app/alert"

    - send:
        call: http.post
        args:
          url: ${url}
          body:
            text: ${"[" + severity + "] " + message}
        result: send_result

    - return_status:
        return:
          sent: true
          channel: ${channel}
          status_code: ${send_result.code}
```

## Building a Library of Reusable Subworkflows

Create subworkflows for common patterns you use across multiple workflows.

```yaml
# A workflow with reusable utility subworkflows

main:
  params: [args]
  steps:
    # Use the retry wrapper subworkflow
    - fetch_with_retry:
        call: http_with_retry
        args:
          url: "https://api.example.com/data"
          method: "GET"
          max_retries: 3
        result: api_data

    # Use the logging subworkflow
    - log_success:
        call: structured_log
        args:
          message: "Data fetched successfully"
          severity: "INFO"
          metadata:
            source: "api.example.com"
            records: ${len(api_data.body.items)}

    # Use the validation subworkflow
    - validate_data:
        call: validate_response
        args:
          response: ${api_data}
          required_fields: ["items", "total_count", "page"]
        result: validation

    - return_result:
        return: ${api_data.body}

# Reusable: HTTP call with retry logic
http_with_retry:
  params:
    - url
    - method: "GET"
    - body: null
    - max_retries: 3
    - initial_delay: 1
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
            - try_request:
                try:
                  steps:
                    - dispatch_method:
                        switch:
                          - condition: ${method == "GET"}
                            steps:
                              - do_get:
                                  call: http.get
                                  args:
                                    url: ${url}
                                    timeout: 60
                                  result: response
                          - condition: ${method == "POST"}
                            steps:
                              - do_post:
                                  call: http.post
                                  args:
                                    url: ${url}
                                    body: ${body}
                                    timeout: 60
                                  result: response
                    - return_response:
                        return: ${response}
                except:
                  as: e
                  steps:
                    - update_state:
                        assign:
                          - attempt: ${attempt + 1}
                          - last_error: ${e}
                    - check_retryable:
                        switch:
                          - condition: ${e.code == 429 or e.code >= 500}
                            steps:
                              - backoff:
                                  call: sys.sleep
                                  args:
                                    seconds: ${initial_delay * int(math.pow(2, i))}
                          - condition: true
                            raise: ${e}

    - all_failed:
        raise:
          code: 503
          message: ${"Failed after " + string(max_retries) + " attempts: " + last_error.message}

# Reusable: Structured logging
structured_log:
  params:
    - message
    - severity: "INFO"
    - metadata: {}
  steps:
    - write_log:
        call: sys.log
        args:
          text: ${message}
          json: ${metadata}
          severity: ${severity}
    - done:
        return: true

# Reusable: Response validation
validate_response:
  params: [response, required_fields]
  steps:
    - check_status:
        switch:
          - condition: ${response.code != 200}
            raise:
              code: ${response.code}
              message: "Unexpected response status"

    - check_fields:
        for:
          value: field
          in: ${required_fields}
          steps:
            - verify_field:
                switch:
                  - condition: ${not(field in response.body)}
                    raise:
                      code: 422
                      message: ${"Missing required field: " + field}

    - valid:
        return:
          valid: true
          field_count: ${len(required_fields)}
```

## Organizing Multi-Stage Pipelines

For complex pipelines, use subworkflows to represent each stage clearly.

```yaml
# multi-stage-pipeline.yaml
# A data processing pipeline broken into clear stages

main:
  params: [args]
  steps:
    - stage_1:
        call: extract_data
        args:
          source: ${args.data_source}
          date_range: ${args.date_range}
        result: raw_data

    - stage_2:
        call: transform_data
        args:
          data: ${raw_data}
          transformations: ${args.transform_rules}
        result: transformed_data

    - stage_3:
        call: load_data
        args:
          data: ${transformed_data}
          destination: ${args.destination}
        result: load_result

    - stage_4:
        call: send_report
        args:
          stats: ${load_result}
          recipients: ${args.notify}
        result: report_result

    - complete:
        return:
          pipeline_status: "complete"
          records_processed: ${load_result.record_count}
          report_sent: ${report_result.sent}

# Stage 1: Extract data from the source
extract_data:
  params: [source, date_range]
  steps:
    - call_extraction_service:
        call: http.post
        args:
          url: https://extractor-xxxxx-uc.a.run.app/extract
          auth:
            type: OIDC
          body:
            source: ${source}
            start_date: ${date_range.start}
            end_date: ${date_range.end}
          timeout: 300
        result: extract_response

    - validate_extraction:
        switch:
          - condition: ${extract_response.body.record_count == 0}
            raise:
              code: 404
              message: "No data found for the given date range"

    - return_data:
        return: ${extract_response.body}

# Stage 2: Transform the extracted data
transform_data:
  params: [data, transformations]
  steps:
    - call_transform_service:
        call: http.post
        args:
          url: https://transformer-xxxxx-uc.a.run.app/transform
          auth:
            type: OIDC
          body:
            records: ${data.records}
            rules: ${transformations}
          timeout: 600
        result: transform_response

    - return_transformed:
        return: ${transform_response.body}

# Stage 3: Load data into the destination
load_data:
  params: [data, destination]
  steps:
    - call_load_service:
        call: http.post
        args:
          url: https://loader-xxxxx-uc.a.run.app/load
          auth:
            type: OIDC
          body:
            data: ${data.records}
            target: ${destination}
          timeout: 600
        result: load_response

    - return_load_result:
        return:
          record_count: ${load_response.body.inserted}
          destination: ${destination}

# Stage 4: Send a completion report
send_report:
  params: [stats, recipients]
  steps:
    - format_report:
        assign:
          - report_text: ${"Pipeline complete. " + string(stats.record_count) + " records loaded to " + stats.destination}

    - send_notification:
        call: http.post
        args:
          url: https://notifier-xxxxx-uc.a.run.app/send
          auth:
            type: OIDC
          body:
            message: ${report_text}
            recipients: ${recipients}
        result: send_result

    - return_status:
        return:
          sent: ${send_result.code == 200}
          message: ${report_text}
```

## Subworkflows Calling Subworkflows

Subworkflows can call other subworkflows, letting you build layered abstractions.

```yaml
main:
  steps:
    - process:
        call: process_order
        args:
          order_id: "ORD-12345"
        result: order_result
    - done:
        return: ${order_result}

process_order:
  params: [order_id]
  steps:
    - fetch_order:
        call: http_with_retry
        args:
          url: ${"https://api.example.com/orders/" + order_id}
          max_retries: 3
        result: order

    - validate:
        call: validate_order
        args:
          order: ${order.body}
        result: validation

    - done:
        return:
          order_id: ${order_id}
          valid: ${validation.valid}

validate_order:
  params: [order]
  steps:
    - check_items:
        switch:
          - condition: ${len(order.items) == 0}
            return:
              valid: false
              reason: "No items in order"
    - check_total:
        switch:
          - condition: ${order.total <= 0}
            return:
              valid: false
              reason: "Invalid total"
    - valid:
        return:
          valid: true

http_with_retry:
  params: [url, max_retries: 3]
  steps:
    - fetch:
        call: http.get
        args:
          url: ${url}
        result: response
    - done:
        return: ${response}
```

## Wrapping Up

Subworkflows are essential for keeping complex Cloud Workflows manageable. Break your workflow into logical stages, extract common patterns into reusable subworkflows, and use descriptive names that make the main flow read like a high-level process description. The main workflow should tell you what happens at each stage, while subworkflows contain the details of how each stage works. This separation makes workflows easier to understand, test, and maintain as they grow in complexity.
