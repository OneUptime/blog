# How to Build a Document Processing Pipeline with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pipeline, Document, Pub/Sub, Workflow

Description: Build a scalable document processing pipeline with Dapr using pub/sub chaining, state management for job tracking, and actors for per-document coordination.

---

## Document Processing Pipeline Architecture

A document processing pipeline receives raw documents (PDFs, Word files, images) and passes them through a sequence of processing stages: upload, extraction, transformation, indexing, and notification.

With Dapr, each stage is an independent microservice connected via pub/sub topic chaining:

```text
Upload --> [doc-uploaded] --> Extraction Service
                                   |
                              [doc-extracted] --> Transformation Service
                                                        |
                                                  [doc-transformed] --> Index Service
                                                                              |
                                                                        [doc-indexed] --> Notify
```

## Upload Service

```python
# upload_service.py
from fastapi import FastAPI, UploadFile, File
from dapr.clients import DaprClient
import uuid
import json

app = FastAPI()

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...), user_id: str = ""):
    doc_id = str(uuid.uuid4())
    content = await file.read()

    with DaprClient() as client:
        # Save document binary to state store
        import base64
        client.save_state("statestore", f"doc-raw-{doc_id}", json.dumps({
            "docId": doc_id,
            "filename": file.filename,
            "contentType": file.content_type,
            "content": base64.b64encode(content).decode('ascii'),
            "uploadedBy": user_id
        }))

        # Initialize job tracking
        client.save_state("statestore", f"job-{doc_id}", json.dumps({
            "docId": doc_id,
            "status": "uploaded",
            "stages": {"uploaded": True, "extracted": False,
                       "transformed": False, "indexed": False},
            "filename": file.filename
        }))

        # Trigger pipeline
        client.publish_event("pubsub", "doc-uploaded", {
            "docId": doc_id,
            "filename": file.filename,
            "contentType": file.content_type,
            "uploadedBy": user_id
        })

    return {"docId": doc_id, "status": "processing"}
```

## Extraction Service

```go
// extraction/main.go
package main

import (
    "context"
    "encoding/json"
    "log"

    dapr "github.com/dapr/go-sdk/client"
    "github.com/dapr/go-sdk/service/common"
)

func handleDocUploaded(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var event map[string]interface{}
    json.Unmarshal(e.RawData, &event)

    docId := event["docId"].(string)
    contentType := event["contentType"].(string)

    log.Printf("Extracting document docId=%s contentType=%s", docId, contentType)

    client, _ := dapr.NewClient()
    defer client.Close()

    // Get raw document from state
    rawState, _ := client.GetState(ctx, "statestore", "doc-raw-"+docId, nil)
    var docData map[string]interface{}
    json.Unmarshal(rawState.Value, &docData)

    // Extract text based on content type
    extractedText := extractText(docData, contentType)
    metadata := extractMetadata(docData, contentType)

    // Save extracted content
    extracted := map[string]interface{}{
        "docId":         docId,
        "extractedText": extractedText,
        "metadata":      metadata,
        "wordCount":     len(splitWords(extractedText)),
        "language":      detectLanguage(extractedText),
    }
    extractedJSON, _ := json.Marshal(extracted)
    client.SaveState(ctx, "statestore", "doc-extracted-"+docId, extractedJSON, nil)

    // Update job status
    updateJobStatus(ctx, client, docId, "extracted")

    // Publish to next stage
    client.PublishEvent(ctx, "pubsub", "doc-extracted", map[string]interface{}{
        "docId": docId, "wordCount": extracted["wordCount"],
    })

    return false, nil
}
```

## Transformation Service

```csharp
// TransformationService.cs
[Topic("pubsub", "doc-extracted")]
[HttpPost("pipeline/transform")]
public async Task<IActionResult> HandleExtractedDocument(
    [FromBody] CloudEvent<DocExtractedEvent> cloudEvent)
{
    var docId = cloudEvent.Data!.DocId;

    // Get extracted content
    var extracted = await _dapr.GetStateAsync<ExtractedDocument>(
        "statestore", $"doc-extracted-{docId}");

    // Apply transformations
    var transformed = new TransformedDocument
    {
        DocId = docId,
        NormalizedText = NormalizeText(extracted!.ExtractedText),
        Chunks = ChunkText(extracted.ExtractedText, maxChunkSize: 512),
        Embeddings = await GenerateEmbeddingsAsync(extracted.ExtractedText),
        Summary = await GenerateSummaryAsync(extracted.ExtractedText),
        Keywords = ExtractKeywords(extracted.ExtractedText),
        Sentiment = AnalyzeSentiment(extracted.ExtractedText)
    };

    await _dapr.SaveStateAsync("statestore",
        $"doc-transformed-{docId}", transformed);

    await UpdateJobStatus(docId, "transformed");

    await _dapr.PublishEventAsync("pubsub", "doc-transformed",
        new { DocId = docId, ChunkCount = transformed.Chunks.Count });

    return Ok();
}
```

## Job Status Actor for Pipeline Coordination

```csharp
public class DocumentJobActor : Actor, IDocumentJobActor
{
    public async Task UpdateStageAsync(string stage, bool success, string? errorMessage = null)
    {
        var result = await StateManager.TryGetStateAsync<DocumentJob>("job");
        var job = result.HasValue ? result.Value : new DocumentJob();
        job.Stages[stage] = new StageResult { Success = success, CompletedAt = DateTime.UtcNow };

        if (!success)
        {
            job.Status = "failed";
            job.Error = errorMessage;
        }
        else if (job.Stages.Values.All(s => s.Success))
        {
            job.Status = "completed";
        }

        await StateManager.SetStateAsync("job", job);
    }
}
```

## Summary

A Dapr document processing pipeline chains services together through sequential pub/sub topics, where each stage subscribes to the previous stage's completion event, processes the document, and publishes to the next topic. State management tracks the raw document, intermediate results, and job status at each stage. Document job actors provide a coordination point for monitoring pipeline progress and handling stage failures with structured error reporting.
