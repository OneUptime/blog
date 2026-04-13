# How to Use MongoDB with Hugging Face Transformers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Hugging Face, Transformers, NLP, Python

Description: Learn how to use Hugging Face Transformers to generate embeddings and run inference on data stored in MongoDB, integrating NLP models into your data pipeline.

---

## Overview

Hugging Face Transformers provides thousands of pre-trained NLP models for classification, embedding generation, summarization, and more. By connecting Transformers directly to MongoDB, you can run inference on stored documents and write results back, building ML-powered data pipelines without a separate data warehouse.

## Installation

```bash
pip install transformers torch pymongo
```

## Generating Embeddings for Documents in MongoDB

Use a sentence transformer model to embed documents stored in MongoDB:

```python
from pymongo import MongoClient
from transformers import AutoTokenizer, AutoModel
import torch

client = MongoClient(MONGODB_URI)
collection = client["nlp"]["articles"]

tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

def embed_text(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    with torch.no_grad():
        outputs = model(**inputs)
    embedding = mean_pooling(outputs, inputs["attention_mask"])
    return torch.nn.functional.normalize(embedding, p=2, dim=1).squeeze().tolist()

# Embed all documents missing embeddings
for doc in collection.find({"embedding": {"$exists": False}}):
    embedding = embed_text(doc["content"])
    collection.update_one(
        {"_id": doc["_id"]},
        {"$set": {"embedding": embedding}}
    )
    print(f"Embedded document: {doc['_id']}")
```

## Running Sentiment Classification on MongoDB Documents

```python
from transformers import pipeline

sentiment_classifier = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

reviews = collection.find({"sentiment": {"$exists": False}}).limit(100)
for doc in reviews:
    result = sentiment_classifier(doc["text"][:512])[0]
    collection.update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "sentiment": result["label"].lower(),
            "sentimentScore": result["score"]
        }}
    )
```

## Batch Processing for Efficiency

Process documents in batches to maximize GPU throughput:

```python
def batch_classify(texts, batch_size=32):
    results = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        outputs = sentiment_classifier(batch, truncation=True, max_length=512)
        results.extend(outputs)
    return results

docs = list(collection.find({"sentiment": {"$exists": False}}).limit(1000))
texts = [doc["text"] for doc in docs]
predictions = batch_classify(texts)

from pymongo import UpdateOne
operations = [
    UpdateOne(
        {"_id": doc["_id"]},
        {"$set": {"sentiment": pred["label"].lower(), "sentimentScore": pred["score"]}}
    )
    for doc, pred in zip(docs, predictions)
]
collection.bulk_write(operations)
```

## Summarizing Long Documents

```python
from transformers import pipeline

summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

for doc in collection.find({"summary": {"$exists": False}, "wordCount": {"$gt": 200}}):
    text = doc["content"][:4096]  # Rough character limit; pipeline handles token truncation
    result = summarizer(text, max_length=150, min_length=40, do_sample=False, truncation=True)
    summary = result[0]["summary_text"]

    collection.update_one(
        {"_id": doc["_id"]},
        {"$set": {"summary": summary}}
    )
```

## Indexing Results for Querying

```javascript
db.articles.createIndex({ sentiment: 1, sentimentScore: -1 })
```

To enable vector similarity search on embeddings, create an Atlas Vector Search index via the Atlas UI or the `createSearchIndex` command:

```javascript
db.articles.createSearchIndex(
  "vector_index",
  "vectorSearch",
  {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: 384,
        similarity: "cosine"
      }
    ]
  }
)
```

Query by classification results:

```python
# Find highly confident negative reviews
negative_reviews = collection.find({
    "sentiment": "negative",
    "sentimentScore": {"$gt": 0.95}
}).sort("sentimentScore", -1).limit(20)
```

## Best Practices

- Process embeddings in batches of 32-64 documents using `bulk_write` for updates - this is 10-50x faster than individual updates.
- Truncate text to the model's maximum token length (512 for BERT-based models) before inference to avoid errors.
- Store model name and version alongside inference results (`modelName: "distilbert-sst-2"`) so you can re-run inference when upgrading models.
- Use `{"$exists": False}` filters to process only documents missing results, making your pipeline safe to re-run after interruption.

## Summary

Hugging Face Transformers integrates with MongoDB by reading documents, running inference (embedding, classification, summarization), and writing results back as new fields. Use batch processing with `bulk_write` for efficiency, and store model metadata alongside results for reproducibility.
