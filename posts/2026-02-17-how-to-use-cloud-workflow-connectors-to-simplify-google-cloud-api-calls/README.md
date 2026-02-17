# How to Use Cloud Workflow Connectors to Simplify Google Cloud API Calls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Workflows, Connectors, API Integration, Automation

Description: Learn how to use built-in Cloud Workflow connectors to call Google Cloud services like BigQuery, Firestore, Pub/Sub, and Cloud Storage without writing raw HTTP requests.

---

When you call Google Cloud APIs from a workflow using raw HTTP requests, you end up writing a lot of boilerplate - constructing URLs, setting up OAuth2 authentication, formatting request bodies to match the API spec, and parsing nested responses. Cloud Workflow connectors eliminate that boilerplate. They are pre-built integrations with Google Cloud services that handle authentication automatically and provide a cleaner syntax for common operations.

In this guide, I will show you how to use connectors for the most popular Google Cloud services and compare them with the raw HTTP approach so you can see the difference.

## What Connectors Do

Connectors are essentially typed wrappers around Google Cloud REST APIs. They:

- Handle OAuth2 authentication automatically (no `auth: type: OAuth2` needed)
- Provide a cleaner call syntax with named parameters
- Map to specific API methods with proper request/response types
- Handle long-running operations automatically (for services that use them)

## Connector Naming Convention

Connector calls follow this pattern:

```
googleapis.{service}.{version}.{resource_path}.{method}
```

For example:
- `googleapis.bigquery.v2.jobs.insert` - Insert a BigQuery job
- `googleapis.firestore.v1.projects.databases.documents.createDocument` - Create a Firestore document
- `googleapis.storage.v1.objects.get` - Get an object from Cloud Storage

## BigQuery Connector

Run queries and manage BigQuery datasets without constructing raw HTTP requests.

### Running a Query

```yaml
# bigquery-connector.yaml
main:
  steps:
    # Run a BigQuery query using the connector
    - run_query:
        call: googleapis.bigquery.v2.jobs.query
        args:
          projectId: "my-gcp-project"
          body:
            query: "SELECT COUNT(*) as total FROM `my-dataset.my-table` WHERE date = CURRENT_DATE()"
            useLegacySql: false
        result: query_result

    - extract_count:
        assign:
          - total_rows: ${query_result.totalRows}
          - row_data: ${query_result.rows[0].f[0].v}

    - return_result:
        return:
          total: ${row_data}
          complete: ${query_result.jobComplete}
```

Compare that with the raw HTTP approach:

```yaml
# Same thing with raw HTTP - much more verbose
main:
  steps:
    - run_query_raw:
        call: http.post
        args:
          url: https://bigquery.googleapis.com/bigquery/v2/projects/my-gcp-project/queries
          auth:
            type: OAuth2
          body:
            query: "SELECT COUNT(*) as total FROM `my-dataset.my-table`"
            useLegacySql: false
        result: query_result
```

### Inserting Data into BigQuery

```yaml
main:
  params: [args]
  steps:
    # Insert rows using the streaming insert connector
    - insert_rows:
        call: googleapis.bigquery.v2.tabledata.insertAll
        args:
          projectId: "my-gcp-project"
          datasetId: "my_dataset"
          tableId: "events"
          body:
            rows:
              - json:
                  event_name: ${args.event_name}
                  timestamp: ${time.format(sys.now())}
                  user_id: ${args.user_id}
        result: insert_result

    - check_errors:
        switch:
          - condition: ${"insertErrors" in insert_result and len(insert_result.insertErrors) > 0}
            raise:
              code: 500
              message: "BigQuery insert errors"
          - condition: true
            return:
              status: "inserted"
```

## Firestore Connector

Create, read, update, and delete Firestore documents.

```yaml
# firestore-connector.yaml
main:
  params: [args]
  steps:
    # Create a document in Firestore
    - create_document:
        call: googleapis.firestore.v1.projects.databases.documents.createDocument
        args:
          collectionId: "orders"
          parent: "projects/my-gcp-project/databases/(default)/documents"
          body:
            fields:
              order_id:
                stringValue: ${args.order_id}
              total:
                doubleValue: ${args.total}
              status:
                stringValue: "pending"
              created_at:
                timestampValue: ${time.format(sys.now())}
        result: created_doc

    # Read the document back
    - get_document:
        call: googleapis.firestore.v1.projects.databases.documents.get
        args:
          name: ${created_doc.name}
        result: fetched_doc

    # Update the document
    - update_document:
        call: googleapis.firestore.v1.projects.databases.documents.patch
        args:
          name: ${created_doc.name}
          updateMask:
            fieldPaths: ["status"]
          body:
            fields:
              status:
                stringValue: "confirmed"
        result: updated_doc

    - return_result:
        return:
          document_id: ${created_doc.name}
          status: "confirmed"
```

## Pub/Sub Connector

Publish messages to Pub/Sub topics.

```yaml
# pubsub-connector.yaml
main:
  params: [args]
  steps:
    # Publish a message to a Pub/Sub topic
    - publish_message:
        call: googleapis.pubsub.v1.projects.topics.publish
        args:
          topic: "projects/my-gcp-project/topics/order-events"
          body:
            messages:
              - data: ${base64.encode(json.encode(args.event_data))}
                attributes:
                  event_type: ${args.event_type}
                  source: "workflow"
        result: publish_result

    - return_result:
        return:
          message_ids: ${publish_result.messageIds}
          count: ${len(publish_result.messageIds)}
```

## Cloud Storage Connector

Work with Cloud Storage objects.

```yaml
# storage-connector.yaml
main:
  params: [args]
  steps:
    # List objects in a bucket
    - list_objects:
        call: googleapis.storage.v1.objects.list
        args:
          bucket: "my-data-bucket"
          prefix: ${args.folder}
          maxResults: 100
        result: objects_list

    - count_objects:
        assign:
          - file_count: ${len(objects_list.items)}
          - file_names: []

    - collect_names:
        for:
          value: obj
          in: ${objects_list.items}
          steps:
            - add_name:
                assign:
                  - file_names: ${list.concat(file_names, obj.name)}

    # Copy an object
    - copy_object:
        call: googleapis.storage.v1.objects.copy
        args:
          sourceBucket: "my-data-bucket"
          sourceObject: ${args.source_file}
          destinationBucket: "my-archive-bucket"
          destinationObject: ${"archive/" + args.source_file}
        result: copy_result

    - return_result:
        return:
          files_found: ${file_count}
          file_names: ${file_names}
          copied: ${copy_result.name}
```

## Secret Manager Connector

Securely access secrets without handling raw API calls.

```yaml
# secret-manager-connector.yaml
main:
  steps:
    # Access a secret value
    - get_secret:
        call: googleapis.secretmanager.v1.projects.secrets.versions.accessString
        args:
          secret_id: "my-api-key"
          project_id: "my-gcp-project"
        result: api_key

    # Use the secret in an API call
    - use_secret:
        call: http.get
        args:
          url: https://api.example.com/data
          headers:
            Authorization: ${"Bearer " + api_key}
        result: api_response

    - return_data:
        return: ${api_response.body}
```

## Cloud Tasks Connector

Create tasks in Cloud Tasks queues.

```yaml
# cloud-tasks-connector.yaml
main:
  params: [args]
  steps:
    - create_task:
        call: googleapis.cloudtasks.v2.projects.locations.queues.tasks.create
        args:
          parent: "projects/my-gcp-project/locations/us-central1/queues/my-queue"
          body:
            task:
              httpRequest:
                url: "https://my-worker-xxxxx-uc.a.run.app/process"
                httpMethod: "POST"
                headers:
                  Content-Type: "application/json"
                body: ${base64.encode(json.encode(args.task_data))}
              # Schedule for 30 seconds from now
              scheduleTime: ${time.format(sys.now() + duration.value(30, "SECONDS"))}
        result: task_result

    - return_task:
        return:
          task_name: ${task_result.name}
          scheduled: true
```

## Combining Multiple Connectors in One Workflow

Here is a practical example that uses several connectors together.

```yaml
# multi-connector-pipeline.yaml
# Pipeline: Read from Firestore -> Process -> Store in BigQuery -> Notify via Pub/Sub

main:
  params: [args]
  steps:
    # Step 1: Get API key from Secret Manager
    - get_credentials:
        call: googleapis.secretmanager.v1.projects.secrets.versions.accessString
        args:
          secret_id: "processing-api-key"
          project_id: "my-gcp-project"
        result: api_key

    # Step 2: Read pending items from Firestore
    - get_pending_items:
        call: googleapis.firestore.v1.projects.databases.documents.list
        args:
          collectionId: "pending_items"
          parent: "projects/my-gcp-project/databases/(default)/documents"
          pageSize: 50
        result: pending_docs

    # Step 3: Process each item
    - process_items:
        assign:
          - processed_count: 0

    - process_loop:
        for:
          value: doc
          in: ${pending_docs.documents}
          steps:
            - call_processor:
                call: http.post
                args:
                  url: https://api.example.com/process
                  headers:
                    Authorization: ${"Bearer " + api_key}
                  body:
                    item_id: ${doc.fields.item_id.stringValue}
                result: process_result

            # Step 4: Store result in BigQuery
            - store_in_bigquery:
                call: googleapis.bigquery.v2.tabledata.insertAll
                args:
                  projectId: "my-gcp-project"
                  datasetId: "results"
                  tableId: "processed_items"
                  body:
                    rows:
                      - json:
                          item_id: ${doc.fields.item_id.stringValue}
                          result: ${process_result.body.output}
                          processed_at: ${time.format(sys.now())}

            # Step 5: Update Firestore document status
            - update_status:
                call: googleapis.firestore.v1.projects.databases.documents.patch
                args:
                  name: ${doc.name}
                  updateMask:
                    fieldPaths: ["status"]
                  body:
                    fields:
                      status:
                        stringValue: "processed"

            - increment_counter:
                assign:
                  - processed_count: ${processed_count + 1}

    # Step 6: Publish completion notification
    - notify_completion:
        call: googleapis.pubsub.v1.projects.topics.publish
        args:
          topic: "projects/my-gcp-project/topics/pipeline-events"
          body:
            messages:
              - data: ${base64.encode(json.encode({"event": "batch_complete", "count": processed_count}))}
                attributes:
                  event_type: "batch_complete"

    - return_summary:
        return:
          processed: ${processed_count}
          status: "complete"
```

## When to Use Connectors vs Raw HTTP

Use connectors when:
- You are calling a supported Google Cloud service
- You want automatic authentication
- You prefer cleaner, more readable syntax
- You need automatic handling of long-running operations

Use raw HTTP when:
- The connector does not support the specific API method you need
- You are calling third-party or custom APIs
- You need fine-grained control over request headers or parameters
- The connector has not been updated for a new API feature

## Wrapping Up

Cloud Workflow connectors simplify Google Cloud API calls by handling authentication, URL construction, and request formatting for you. They make workflows shorter, cleaner, and easier to maintain. Start with connectors for the services you use most - BigQuery, Firestore, Pub/Sub, Cloud Storage, and Secret Manager are the most common. Fall back to raw HTTP calls when you need to call services that do not have connectors yet or when you need capabilities that connectors do not expose. The two approaches work side by side in the same workflow, so you can use the best tool for each step.
