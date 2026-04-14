# How to Build a Search Indexing Pipeline with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Search, Indexing, Pipeline, Elasticsearch

Description: Build a real-time search indexing pipeline with Dapr that extracts, transforms, and indexes content from multiple sources into Elasticsearch or OpenSearch.

---

## Search Indexing Pipeline Architecture

A search indexing pipeline collects content from multiple source systems (databases, file stores, APIs), processes and enriches it, then writes it to a search index. Dapr's pub/sub and bindings building blocks enable a decoupled, scalable indexing architecture.

```text
Source Services --> [content-published] --> Extractor
                                               |
                                          [content-extracted] --> Enricher
                                                                      |
                                                                 [content-enriched] --> Indexer
                                                                                            |
                                                                                      Elasticsearch
```

## Content Publisher (Source Service)

```python
# Any service that creates/updates content publishes this event
from dapr.clients import DaprClient
import json

class ContentPublisher:
    def publish_content_change(self, content_type: str, content_id: str,
                                action: str, data: dict):
        """
        action: "created", "updated", "deleted"
        """
        with DaprClient() as client:
            client.publish_event(
                pubsub_name="pubsub",
                topic_name="content-published",
                data=json.dumps({
                    "contentType": content_type,  # "article", "product", "user"
                    "contentId": content_id,
                    "action": action,
                    "data": data,
                    "source": "product-service"
                }),
                data_content_type="application/json",
            )

# Example usage in a product service
publisher = ContentPublisher()
publisher.publish_content_change(
    content_type="product",
    content_id="prod-123",
    action="updated",
    data={
        "productId": "prod-123",
        "name": "Wireless Headphones",
        "description": "Premium noise-cancelling headphones with 40h battery",
        "price": 149.99,
        "categories": ["electronics", "audio"],
        "tags": ["wireless", "noise-cancelling", "bluetooth"]
    }
)
```

## Extraction Service

```go
// extractor/main.go
package main

import (
    "context"
    "encoding/json"
    "strings"

    dapr "github.com/dapr/go-sdk/client"
    "github.com/dapr/go-sdk/service/common"
)

type ContentEvent struct {
    ContentType string                 `json:"contentType"`
    ContentID   string                 `json:"contentId"`
    Action      string                 `json:"action"`
    Data        map[string]interface{} `json:"data"`
    Source      string                 `json:"source"`
}

func handleContentPublished(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var event ContentEvent
    json.Unmarshal(e.RawData, &event)

    if event.Action == "deleted" {
        // Publish delete event directly to indexer
        publishDeleteEvent(ctx, event.ContentType, event.ContentID)
        return false, nil
    }

    // Extract searchable fields based on content type
    extracted := extractSearchableFields(event)

    client, _ := dapr.NewClient()
    defer client.Close()

    extractedJSON, _ := json.Marshal(extracted)
    client.SaveState(ctx, "statestore",
        "extracted-"+event.ContentType+"-"+event.ContentID, extractedJSON, nil)

    client.PublishEvent(ctx, "pubsub", "content-extracted", extracted)
    return false, nil
}

func extractSearchableFields(event ContentEvent) map[string]interface{} {
    base := map[string]interface{}{
        "contentType": event.ContentType,
        "contentId":   event.ContentID,
        "action":      event.Action,
        "source":      event.Source,
    }

    switch event.ContentType {
    case "product":
        base["title"] = event.Data["name"]
        base["body"] = event.Data["description"]
        base["price"] = event.Data["price"]
        base["categories"] = event.Data["categories"]
        base["tags"] = event.Data["tags"]
        base["searchText"] = strings.Join([]string{
            getString(event.Data, "name"),
            getString(event.Data, "description"),
        }, " ")
    case "article":
        base["title"] = event.Data["title"]
        base["body"] = event.Data["content"]
        base["author"] = event.Data["author"]
        base["searchText"] = getString(event.Data, "content")
    }

    return base
}
```

## Enricher Service

```javascript
// enricher-service.js
const { DaprServer, DaprClient } = require('@dapr/dapr');

const server = new DaprServer({ serverPort: '3001' });
const client = new DaprClient();

server.pubsub.subscribe('pubsub', 'content-extracted', async (data) => {
  const enriched = { ...data };

  // Add normalized text for better search
  if (data.searchText) {
    enriched.searchTextNormalized = normalizeText(data.searchText);
    enriched.wordCount = data.searchText.split(/\s+/).length;
  }

  // Add timestamp for recency ranking
  enriched.indexedAt = new Date().toISOString();

  // Categorize content
  enriched.contentGroup = categorize(data.categories || data.tags || []);

  await client.pubsub.publish('pubsub', 'content-enriched', enriched);
});

function normalizeText(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

server.start();
```

## Elasticsearch Indexer

```python
# indexer_service.py
from fastapi import FastAPI
from dapr.ext.fastapi import DaprApp
from elasticsearch import AsyncElasticsearch
import os

app = FastAPI()
dapr_app = DaprApp(app)
es = AsyncElasticsearch(hosts=[os.getenv("ES_HOST", "http://elasticsearch:9200")])

@dapr_app.subscribe(pubsub="pubsub", topic="content-enriched")
async def index_content(event: dict):
    data = event.get("data", {})
    content_type = data.get("contentType")
    content_id = data.get("contentId")
    action = data.get("action", "created")

    if action == "deleted":
        await es.options(ignore_status=[404]).delete(index=content_type, id=content_id)
    else:
        await es.index(
            index=content_type,
            id=content_id,
            document=data
        )

    return {"status": "SUCCESS"}
```

## Summary

A Dapr search indexing pipeline connects content-producing services to search indexes through pub/sub event chaining. Each stage (extraction, enrichment, indexing) is a dedicated microservice that can scale independently based on indexing volume. Dapr's resiliency policies handle Elasticsearch connection failures with automatic retries, and the pub/sub decoupling means source services are never blocked by indexing delays.
