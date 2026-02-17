# How to Call Cloud Functions and Cloud Run Services from a Cloud Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Workflows, Cloud Functions, Cloud Run, Serverless

Description: Learn how to invoke Cloud Functions and Cloud Run services from Google Cloud Workflows to build orchestrated serverless pipelines with authenticated service calls.

---

Cloud Workflows shines when it connects multiple services into a coordinated pipeline. The most common services you will call from a workflow are Cloud Functions (for compute logic) and Cloud Run (for containerized services). Both are serverless, both scale to zero, and both integrate cleanly with Workflows. The trick is getting authentication right and handling the responses properly.

In this guide, I will show you how to call both Cloud Functions and Cloud Run services from your workflows, with authentication, error handling, and practical examples.

## Calling a Cloud Function (HTTP)

Cloud Functions Gen2 are HTTP-triggered by default. Here is how to call one from a workflow.

```yaml
# call-cloud-function.yaml
# Workflow that calls a Cloud Function to process data

main:
  params: [args]
  steps:
    - call_function:
        call: http.post
        args:
          url: https://us-central1-my-project.cloudfunctions.net/process-data
          auth:
            type: OIDC
          body:
            input_data: ${args.data}
            processing_mode: "full"
          headers:
            Content-Type: "application/json"
        result: function_response

    - check_response:
        switch:
          - condition: ${function_response.code == 200}
            next: handle_success
          - condition: ${function_response.code >= 400}
            next: handle_error

    - handle_success:
        return:
          status: "success"
          result: ${function_response.body}

    - handle_error:
        raise:
          code: ${function_response.code}
          message: ${"Function returned error: " + json.encode_to_string(function_response.body)}
```

The `auth.type: OIDC` is critical. Without it, your workflow cannot authenticate with the Cloud Function.

## Setting Up Authentication

The workflow's service account needs permission to invoke the Cloud Function or Cloud Run service.

```bash
# Get the workflow's service account (or create a dedicated one)
gcloud iam service-accounts create workflow-sa \
  --display-name="Workflow Service Account"

# Grant permission to invoke Cloud Functions
gcloud functions add-invoker-policy-binding process-data \
  --region=us-central1 \
  --member="serviceAccount:workflow-sa@my-project.iam.gserviceaccount.com"

# Grant permission to invoke Cloud Run services
gcloud run services add-iam-policy-binding my-service \
  --region=us-central1 \
  --member="serviceAccount:workflow-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# Deploy the workflow with this service account
gcloud workflows deploy my-workflow \
  --location=us-central1 \
  --source=workflow.yaml \
  --service-account="workflow-sa@my-project.iam.gserviceaccount.com"
```

## Calling a Cloud Run Service

Cloud Run services work the same way - they are HTTP endpoints that need OIDC authentication.

```yaml
# call-cloud-run.yaml
# Workflow that calls a Cloud Run service to generate a report

main:
  params: [args]
  steps:
    - generate_report:
        call: http.post
        args:
          url: https://report-generator-xxxxx-uc.a.run.app/generate
          auth:
            type: OIDC
          body:
            report_type: ${args.report_type}
            date_range:
              start: ${args.start_date}
              end: ${args.end_date}
          headers:
            Content-Type: "application/json"
          timeout: 300  # 5 minutes - reports can take a while
        result: report_response

    - save_report_metadata:
        call: http.post
        args:
          url: https://firestore.googleapis.com/v1/projects/my-project/databases/(default)/documents/reports
          auth:
            type: OAuth2
          body:
            fields:
              report_url:
                stringValue: ${report_response.body.download_url}
              generated_at:
                stringValue: ${time.format(sys.now())}
              report_type:
                stringValue: ${args.report_type}
        result: metadata_response

    - return_result:
        return:
          report_url: ${report_response.body.download_url}
          metadata_id: ${metadata_response.body.name}
```

## Chaining Multiple Services

The real power comes from chaining services together. Here is a workflow that uses both Cloud Functions and Cloud Run in sequence.

```yaml
# data-pipeline-workflow.yaml
# Multi-step pipeline: validate -> process -> store -> notify

main:
  params: [args]
  steps:
    # Step 1: Validate input with a Cloud Function
    - validate_input:
        call: http.post
        args:
          url: https://us-central1-my-project.cloudfunctions.net/validate-input
          auth:
            type: OIDC
          body:
            data: ${args.input_data}
            schema: ${args.schema_name}
        result: validation_result

    - check_validation:
        switch:
          - condition: ${not(validation_result.body.is_valid)}
            raise:
              code: 400
              message: ${"Validation failed: " + validation_result.body.error}

    # Step 2: Process the data with a Cloud Run service
    - process_data:
        call: http.post
        args:
          url: https://data-processor-xxxxx-uc.a.run.app/process
          auth:
            type: OIDC
          body:
            validated_data: ${validation_result.body.cleaned_data}
            processing_config:
              format: "json"
              enrich: true
          timeout: 600
        result: processing_result

    # Step 3: Store results with another Cloud Function
    - store_results:
        call: http.post
        args:
          url: https://us-central1-my-project.cloudfunctions.net/store-results
          auth:
            type: OIDC
          body:
            processed_data: ${processing_result.body}
            destination: "bigquery"
            table: "results.processed_data"
        result: storage_result

    # Step 4: Send notification via Cloud Run
    - send_notification:
        call: http.post
        args:
          url: https://notifier-xxxxx-uc.a.run.app/notify
          auth:
            type: OIDC
          body:
            channel: "slack"
            message: ${"Data pipeline complete. " + string(storage_result.body.rows_inserted) + " rows processed."}
            recipients: ${args.notify_emails}
        result: notification_result

    - return_summary:
        return:
          status: "complete"
          rows_processed: ${storage_result.body.rows_inserted}
          notification_sent: ${notification_result.code == 200}
```

## Passing Data Between Steps

Data flows through workflows via the `result` keyword and variable references. Each step can access results from previous steps.

```yaml
# data-flow-example.yaml
# Shows how data moves between Cloud Function calls

main:
  steps:
    # Call function A - get a list of items to process
    - get_items:
        call: http.get
        args:
          url: https://us-central1-my-project.cloudfunctions.net/get-items
          auth:
            type: OIDC
        result: items_response

    # Store the items in a variable for later use
    - extract_items:
        assign:
          - items: ${items_response.body.items}
          - total_count: ${len(items_response.body.items)}

    # Process each item by calling function B
    - process_each_item:
        for:
          value: item
          in: ${items}
          steps:
            - call_processor:
                call: http.post
                args:
                  url: https://us-central1-my-project.cloudfunctions.net/process-item
                  auth:
                    type: OIDC
                  body:
                    item_id: ${item.id}
                    item_data: ${item}
                result: process_result

            - log_progress:
                call: sys.log
                args:
                  text: ${"Processed item " + item.id + " - status: " + process_result.body.status}
                  severity: "INFO"

    - done:
        return:
          total_processed: ${total_count}
```

## Handling Timeouts

Cloud Functions and Cloud Run services have different timeout characteristics. Configure your workflow steps accordingly.

```yaml
# timeout-handling.yaml
main:
  steps:
    # Quick function call - short timeout
    - fast_lookup:
        call: http.get
        args:
          url: https://us-central1-my-project.cloudfunctions.net/quick-lookup
          auth:
            type: OIDC
          timeout: 30  # 30 seconds
        result: lookup_result

    # Long-running service - extended timeout
    - heavy_processing:
        call: http.post
        args:
          url: https://processor-xxxxx-uc.a.run.app/heavy-task
          auth:
            type: OIDC
          body:
            data: ${lookup_result.body}
          timeout: 1800  # 30 minutes
        result: processing_result

    - return_result:
        return: ${processing_result.body}
```

## Using Connectors Instead of Direct HTTP

Workflows provides built-in connectors for Cloud Functions and Cloud Run that simplify the syntax.

```yaml
# Using the Cloud Functions connector
main:
  steps:
    - call_with_connector:
        call: googleapis.cloudfunctions.v2.projects.locations.functions.call
        args:
          function_name: projects/my-project/locations/us-central1/functions/my-function
          body:
            data: "input payload"
        result: connector_result

    - return_result:
        return: ${connector_result}
```

## Testing Your Workflow Locally

Before deploying, validate your workflow syntax.

```bash
# Validate workflow syntax without deploying
gcloud workflows deploy test-validation \
  --location=us-central1 \
  --source=my-workflow.yaml \
  --validate-only

# If validation passes, deploy for real
gcloud workflows deploy my-workflow \
  --location=us-central1 \
  --source=my-workflow.yaml \
  --service-account="workflow-sa@my-project.iam.gserviceaccount.com"
```

## Wrapping Up

Calling Cloud Functions and Cloud Run services from Cloud Workflows is the bread and butter of serverless orchestration on GCP. The pattern is always the same: make an HTTP call with OIDC authentication, capture the result, and pass it to the next step. Get authentication right by granting the workflow's service account the invoker role on each service it calls. Use timeouts appropriate for each service, and build error handling around each call. Once these patterns are in place, you can compose complex pipelines from simple, independently deployable services.
