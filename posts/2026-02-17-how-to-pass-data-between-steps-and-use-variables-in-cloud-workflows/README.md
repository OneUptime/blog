# How to Pass Data Between Steps and Use Variables in Cloud Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Workflows, Variables, Serverless, Orchestration

Description: A practical guide to passing data between steps, assigning variables, and managing state in Google Cloud Workflows for building reliable orchestration pipelines.

---

One of the first things you need to figure out when building a Cloud Workflow is how data flows from one step to the next. Unlike traditional programming where variables are just there, Cloud Workflows uses a YAML-based syntax with specific patterns for variable assignment, step outputs, and data transformation. This post covers everything you need to know about managing data in your workflows.

## Variable Assignment Basics

In Cloud Workflows, you assign variables using the `assign` step type. Variables are scoped to the workflow execution, meaning once you assign a value, it is available in any subsequent step within the same subworkflow.

```yaml
# Basic variable assignment in Cloud Workflows
main:
  steps:
    - initialize_variables:
        assign:
          # Simple string assignment
          - project_name: "my-project"
          # Numeric assignment
          - max_retries: 5
          # Boolean assignment
          - debug_mode: true
          # List assignment
          - regions:
              - "us-central1"
              - "us-east1"
              - "europe-west1"
          # Map (dictionary) assignment
          - config:
              timeout: 300
              batch_size: 100
              environment: "production"

    - use_variables:
        call: sys.log
        args:
          text: ${"Project - " + project_name + ", Max retries - " + string(max_retries)}
          severity: "INFO"
```

Notice how expressions are wrapped in `${}`. Any time you want to reference a variable or perform an operation, you need that expression wrapper.

## Capturing Step Results

When a step calls an HTTP endpoint or a built-in function, you capture the result using the `result` field. This is how data flows from one step to the next.

```yaml
main:
  steps:
    - fetch_data:
        # Make an HTTP GET request and store the response
        call: http.get
        args:
          url: https://api.example.com/users
          headers:
            Authorization: "Bearer my-token"
        result: api_response

    - process_response:
        # Access different parts of the HTTP response
        assign:
          - status_code: ${api_response.code}
          - response_body: ${api_response.body}
          - users: ${api_response.body.users}
          - first_user: ${api_response.body.users[0]}
          - first_user_name: ${api_response.body.users[0].name}

    - log_results:
        call: sys.log
        args:
          text: ${"Found " + string(len(users)) + " users. First user - " + first_user_name}
          severity: "INFO"
```

The `result` keyword stores the entire response object. For HTTP calls, this includes `code` (status code), `body` (parsed response body), and `headers`.

## Working with Maps and Nested Data

Cloud Workflows supports complex data structures. Here is how to work with nested maps and dynamically build data objects.

```yaml
main:
  steps:
    - build_payload:
        assign:
          # Build a nested data structure
          - request_payload:
              metadata:
                created_at: ${sys.now()}
                source: "cloud-workflow"
              data:
                items:
                  - id: 1
                    name: "Item A"
                    tags: ["important", "urgent"]
                  - id: 2
                    name: "Item B"
                    tags: ["low-priority"]

    - access_nested:
        assign:
          # Access nested values using dot notation and indexing
          - creation_time: ${request_payload.metadata.created_at}
          - first_item_name: ${request_payload.data.items[0].name}
          - first_item_first_tag: ${request_payload.data.items[0].tags[0]}

    - send_data:
        # Pass the built payload to an API
        call: http.post
        args:
          url: https://api.example.com/process
          body: ${request_payload}
        result: send_result
```

## String Operations and Type Conversions

You will frequently need to manipulate strings and convert between types. Cloud Workflows provides several built-in functions for this.

```yaml
main:
  steps:
    - string_operations:
        assign:
          - base_url: "https://api.example.com"
          - endpoint: "/v2/users"
          # Concatenation
          - full_url: ${base_url + endpoint}
          # Convert number to string
          - count: 42
          - count_str: ${string(count)}
          # Convert string to integer
          - num_str: "100"
          - num_val: ${int(num_str)}
          # String interpolation pattern
          - user_id: "abc123"
          - user_url: ${base_url + "/users/" + user_id}

    - math_operations:
        assign:
          - total: ${100 + 50}
          - average: ${total / 2}
          - remainder: ${total % 3}
```

## Passing Data Between Subworkflows

When you break your workflow into subworkflows (like functions), you pass data through arguments and return values.

```yaml
# Main workflow that calls subworkflows and passes data between them
main:
  steps:
    - get_config:
        call: fetch_configuration
        args:
          env: "production"
        result: config

    - process_items:
        call: batch_processor
        args:
          items: ${config.items}
          batch_size: ${config.batch_size}
        result: processing_result

    - final_log:
        call: sys.log
        args:
          text: ${"Processed " + string(processing_result.count) + " items"}
          severity: "INFO"

# Subworkflow that fetches and returns configuration
fetch_configuration:
  params: [env]
  steps:
    - get_config:
        switch:
          - condition: ${env == "production"}
            assign:
              - config:
                  batch_size: 50
                  items: ["item1", "item2", "item3"]
                  timeout: 300
          - condition: ${env == "staging"}
            assign:
              - config:
                  batch_size: 10
                  items: ["test_item"]
                  timeout: 60
    - return_config:
        return: ${config}

# Subworkflow that processes items in batches
batch_processor:
  params: [items, batch_size]
  steps:
    - init:
        assign:
          - processed_count: 0
    - process_loop:
        for:
          value: item
          in: ${items}
          steps:
            - process_item:
                call: sys.log
                args:
                  text: ${"Processing " + item}
                  severity: "INFO"
            - increment:
                assign:
                  - processed_count: ${processed_count + 1}
    - return_result:
        return:
          count: ${processed_count}
          status: "complete"
```

## Using Runtime Arguments

You can pass data into a workflow at execution time using runtime arguments. This is great for making workflows reusable.

```yaml
# Workflow that accepts runtime arguments
main:
  params: [args]
  steps:
    - extract_args:
        assign:
          - target_env: ${args.environment}
          - version: ${args.version}
          - dry_run: ${default(map.get(args, "dry_run"), false)}

    - validate:
        switch:
          - condition: ${target_env == "production" AND dry_run == false}
            steps:
              - prod_warning:
                  call: sys.log
                  args:
                    text: ${"Deploying version " + version + " to production"}
                    severity: "WARNING"
          - condition: true
            steps:
              - normal_log:
                  call: sys.log
                  args:
                    text: ${"Deploying version " + version + " to " + target_env}
                    severity: "INFO"
```

Execute this workflow with arguments like so.

```bash
# Execute the workflow with runtime arguments as JSON
gcloud workflows execute my-workflow \
  --location=us-central1 \
  --data='{"environment": "production", "version": "2.1.0", "dry_run": true}'
```

## Using the default() Function for Optional Values

The `default()` function is extremely useful when you are not sure if a value exists. It prevents your workflow from failing on missing keys.

```yaml
main:
  params: [args]
  steps:
    - set_defaults:
        assign:
          # If args.timeout is not provided, use 300 as default
          - timeout: ${default(map.get(args, "timeout"), 300)}
          # If args.region is not provided, use us-central1
          - region: ${default(map.get(args, "region"), "us-central1")}
          # If args.notify is not provided, default to true
          - should_notify: ${default(map.get(args, "notify"), true)}
```

## Iterating Over Data with For Loops

Loops are essential when processing lists of data. The `for` step lets you iterate and accumulate results.

```yaml
main:
  steps:
    - init:
        assign:
          - servers: ["web-1", "web-2", "web-3", "api-1", "api-2"]
          - health_results: []

    - check_each_server:
        for:
          value: server
          in: ${servers}
          steps:
            - check_health:
                call: http.get
                args:
                  url: ${"https://" + server + ".example.com/health"}
                result: health_response
            - record_result:
                assign:
                  - health_results: ${list.concat(health_results, [{"server": server, "status": health_response.code}])}

    - summarize:
        call: sys.log
        args:
          text: ${"Checked " + string(len(health_results)) + " servers"}
          severity: "INFO"
```

## Environment Variables and Project Metadata

Cloud Workflows provides access to project-level information through the `sys.get_env` function.

```yaml
main:
  steps:
    - get_env:
        assign:
          # Access built-in environment values
          - project_id: ${sys.get_env("GOOGLE_CLOUD_PROJECT_ID")}
          - project_number: ${sys.get_env("GOOGLE_CLOUD_PROJECT_NUMBER")}
          - location: ${sys.get_env("GOOGLE_CLOUD_LOCATION")}
          - workflow_id: ${sys.get_env("GOOGLE_CLOUD_WORKFLOW_ID")}
          - execution_id: ${sys.get_env("GOOGLE_CLOUD_WORKFLOW_EXECUTION_ID")}
```

## Wrapping Up

Managing data in Cloud Workflows boils down to a few patterns: assign variables with `assign`, capture outputs with `result`, pass data to subworkflows through `params`, and use `default()` for optional values. Once you internalize these patterns, building even complex orchestration flows becomes straightforward. The key is to think of each step as a small unit that takes input, does something, and produces output for the next step.
