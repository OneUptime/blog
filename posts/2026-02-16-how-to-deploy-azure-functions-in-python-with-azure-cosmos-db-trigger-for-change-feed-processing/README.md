# How to Deploy Azure Functions in Python with Azure Cosmos DB Trigger for Change Feed Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, Python, Cosmos DB, Change Feed, Serverless, Event-Driven, Trigger

Description: Deploy Python Azure Functions that use the Cosmos DB trigger to process change feed events for event-driven data processing pipelines.

---

The Cosmos DB change feed is one of the most powerful features of Azure Cosmos DB. It provides an ordered log of every insert and update that happens in a container. When you combine it with Azure Functions, you get an event-driven processing pipeline where your code runs automatically every time data changes - no polling, no cron jobs, no infrastructure to manage.

In this post, we will build Python Azure Functions that process the Cosmos DB change feed for several real-world scenarios: materializing views, sending notifications, and syncing data to external systems.

## How the Change Feed Works

Every time a document is created or updated in a Cosmos DB container, the change appears in the change feed. The feed is ordered by modification time within each partition. Azure Functions uses a lease container to track its position in the feed, so if your function goes down and comes back up, it picks up where it left off.

Important details to know:

- The change feed does not capture deletes (unless you enable soft delete)
- Each change contains the full document, not just the fields that changed
- The feed is append-only and ordered per partition
- Multiple consumers can read the same feed independently using different lease containers

## Project Setup

```bash
# Create a new Azure Functions project
func init cosmos-change-feed --python
cd cosmos-change-feed

# Install dependencies
pip install azure-functions azure-cosmos
```

## Function 1: Materialize a View

A common pattern is using the change feed to build a denormalized view of your data. For example, when an order is created or updated, update a customer summary document.

```python
# function_app.py
# Azure Functions app with Cosmos DB trigger for change feed processing
import azure.functions as func
import json
import logging
from datetime import datetime

app = func.FunctionApp()

@app.cosmos_db_trigger(
    arg_name="documents",
    container_name="Orders",
    database_name="ECommerceDB",
    connection="CosmosDBConnection",
    lease_container_name="leases",
    create_lease_container_if_not_exists=True,
)
@app.cosmos_db_output(
    arg_name="outputDoc",
    container_name="CustomerSummaries",
    database_name="ECommerceDB",
    connection="CosmosDBConnection",
    create_if_not_exists=True,
)
def materialize_customer_summary(documents: func.DocumentList, outputDoc: func.Out[func.Document]):
    """
    Triggered when orders are created or updated.
    Materializes a customer summary document with order totals.
    """
    if not documents:
        return

    logging.info(f"Processing {len(documents)} order changes")

    # Group changes by customer
    customer_updates = {}
    for doc in documents:
        order = doc.to_dict()
        customer_id = order.get("customerId")

        if customer_id not in customer_updates:
            customer_updates[customer_id] = {
                "orders": [],
                "total_spent": 0,
            }

        customer_updates[customer_id]["orders"].append({
            "orderId": order["id"],
            "total": order.get("total", 0),
            "status": order.get("status", "unknown"),
        })
        customer_updates[customer_id]["total_spent"] += order.get("total", 0)

    # Write a summary document for each customer
    summaries = []
    for customer_id, data in customer_updates.items():
        summary = {
            "id": f"summary-{customer_id}",
            "customerId": customer_id,
            "recentOrders": data["orders"][-10:],  # Keep last 10 orders
            "totalSpent": data["total_spent"],
            "lastUpdated": datetime.utcnow().isoformat(),
        }
        summaries.append(func.Document.from_dict(summary))

    # The output binding writes these to the CustomerSummaries container
    outputDoc.set(summaries[0] if len(summaries) == 1 else summaries)
    logging.info(f"Updated summaries for {len(customer_updates)} customers")
```

## Function 2: Send Notifications on Status Change

Trigger an email or push notification when an order status changes to "shipped" or "delivered".

```python
@app.cosmos_db_trigger(
    arg_name="documents",
    container_name="Orders",
    database_name="ECommerceDB",
    connection="CosmosDBConnection",
    lease_container_name="notification-leases",
    create_lease_container_if_not_exists=True,
)
def send_order_notifications(documents: func.DocumentList):
    """
    Watches for order status changes and sends notifications.
    Uses a separate lease container so it processes the feed independently.
    """
    if not documents:
        return

    for doc in documents:
        order = doc.to_dict()
        status = order.get("status", "")
        customer_id = order.get("customerId", "")
        order_id = order.get("id", "")

        # Only send notifications for specific status changes
        if status in ("shipped", "delivered", "cancelled"):
            notification = {
                "customerId": customer_id,
                "orderId": order_id,
                "status": status,
                "message": get_notification_message(status, order_id),
            }

            logging.info(f"Sending notification for order {order_id}: {status}")
            # In production, send this to a notification service
            # For example: send to Azure Service Bus, SendGrid, or Azure Notification Hubs
            send_notification(notification)

def get_notification_message(status, order_id):
    """Generate a human-readable notification message."""
    messages = {
        "shipped": f"Your order {order_id} has been shipped and is on its way.",
        "delivered": f"Your order {order_id} has been delivered.",
        "cancelled": f"Your order {order_id} has been cancelled.",
    }
    return messages.get(status, f"Your order {order_id} status updated to {status}.")

def send_notification(notification):
    """Placeholder for actual notification sending logic."""
    logging.info(f"Notification: {json.dumps(notification)}")
```

## Function 3: Sync to an External System

Replicate Cosmos DB changes to an external system like Elasticsearch or a data warehouse.

```python
import os
import requests

@app.cosmos_db_trigger(
    arg_name="documents",
    container_name="Products",
    database_name="ECommerceDB",
    connection="CosmosDBConnection",
    lease_container_name="sync-leases",
    create_lease_container_if_not_exists=True,
    max_items_per_invocation=100,  # Process up to 100 changes at once
    start_from_beginning=False,     # Only process new changes
)
def sync_to_search_index(documents: func.DocumentList):
    """
    Sync product changes to an external search index.
    Processes changes in batches for efficiency.
    """
    if not documents:
        return

    logging.info(f"Syncing {len(documents)} product changes to search index")

    # Build a batch of updates for the search index
    batch = []
    for doc in documents:
        product = doc.to_dict()

        # Transform the Cosmos DB document into the search index format
        search_doc = {
            "id": product["id"],
            "name": product.get("name", ""),
            "description": product.get("description", ""),
            "category": product.get("category", ""),
            "price": product.get("price", 0),
            "tags": product.get("tags", []),
            "inStock": product.get("stockCount", 0) > 0,
        }
        batch.append(search_doc)

    # Send the batch to the search service
    try:
        search_endpoint = os.environ.get("SEARCH_ENDPOINT")
        search_key = os.environ.get("SEARCH_API_KEY")

        if search_endpoint:
            response = requests.post(
                f"{search_endpoint}/indexes/products/docs/index",
                headers={
                    "Content-Type": "application/json",
                    "api-key": search_key,
                },
                json={"value": [{"@search.action": "mergeOrUpload", **doc} for doc in batch]},
            )
            logging.info(f"Search index response: {response.status_code}")
        else:
            logging.warning("SEARCH_ENDPOINT not configured, skipping sync")
    except Exception as e:
        logging.error(f"Failed to sync to search index: {e}")
        raise  # Re-raise to trigger function retry
```

## Configuration

Configure the connection strings and settings in `local.settings.json` for local development.

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "python",
    "CosmosDBConnection": "AccountEndpoint=https://your-account.documents.azure.com:443/;AccountKey=your-key;",
    "SEARCH_ENDPOINT": "https://your-search.search.windows.net",
    "SEARCH_API_KEY": "your-search-key"
  }
}
```

## Deploy to Azure

```bash
# Create the Function App
az functionapp create \
  --resource-group ecommerce-rg \
  --consumption-plan-location eastus \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --name ecommerce-change-feed \
  --storage-account ecommercestorage

# Set the connection strings
az functionapp config appsettings set \
  --name ecommerce-change-feed \
  --resource-group ecommerce-rg \
  --settings \
    CosmosDBConnection="AccountEndpoint=...;AccountKey=..." \
    SEARCH_ENDPOINT="https://..." \
    SEARCH_API_KEY="..."

# Deploy the function
func azure functionapp publish ecommerce-change-feed
```

## Error Handling and Retries

When a change feed function fails, the Azure Functions runtime will retry the batch. The lease position does not advance until the batch is processed successfully. This means:

- If your function throws an exception, the same batch of changes will be retried
- Implement idempotent processing so that retries do not cause duplicate side effects
- For operations that cannot be retried (like sending emails), use a queue as an intermediate step

```python
# Idempotent processing pattern
def process_with_dedup(documents):
    """
    Process changes idempotently by checking a processed-events store.
    """
    for doc in documents:
        event_id = f"{doc['id']}-{doc['_ts']}"  # Unique event identifier

        # Check if we already processed this event
        if is_already_processed(event_id):
            logging.info(f"Skipping already processed event: {event_id}")
            continue

        # Process the event
        process_event(doc)

        # Mark as processed
        mark_as_processed(event_id)
```

## Monitoring

Monitor your change feed functions in Azure Portal. Key metrics to watch:

- **Function execution count**: How often the function is being triggered
- **Function duration**: How long each batch takes to process
- **Change feed lag**: The delay between when a change happens and when your function processes it. If this grows, you might need to increase your function's throughput.

## Performance Tuning

Use `max_items_per_invocation` to control batch sizes. Larger batches are more efficient but take longer to process. Start with 100 and adjust based on your processing time. If each document takes 100ms to process, a batch of 100 takes 10 seconds, which is reasonable.

The `feed_poll_delay` setting (in milliseconds) controls how often the trigger checks for new changes when there are none. The default is 5000ms (5 seconds). Lower it for lower latency, raise it if you want to reduce Cosmos DB RU consumption during quiet periods.

## Summary

The Cosmos DB change feed combined with Azure Functions gives you a reactive, event-driven architecture. Changes to your data automatically trigger processing without any polling or scheduling logic. The lease mechanism ensures at-least-once delivery, and the serverless model means you only pay for actual processing time. Use separate lease containers for different consumers so they can process the same feed independently. This pattern is the foundation for materialized views, event-driven notifications, search index synchronization, and data replication.
