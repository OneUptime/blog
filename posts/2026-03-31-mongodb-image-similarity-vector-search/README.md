# How to Build Image Similarity Search with MongoDB Atlas Vector Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Vector Search, Machine Learning

Description: Build an image similarity search system by generating CLIP embeddings from images, storing them in MongoDB, and querying with Atlas Vector Search.

---

Image similarity search lets users upload a photo and find visually similar products, stock images, or documents. The key is representing images as embedding vectors using a vision model, storing those vectors in MongoDB, and using Atlas Vector Search to find the nearest neighbors.

## Architecture

```text
Image -> CLIP/ViT Encoder -> 512-dim embedding -> MongoDB document
                                                         |
User query image -> CLIP encoder -> $vectorSearch -> Similar images
```

## Setup

```bash
pip install pymongo torch torchvision transformers pillow flask
```

## Step 1: Generate Image Embeddings with CLIP

OpenAI's CLIP model can embed both images and text into the same vector space - this enables text-to-image search as well:

```python
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import torch
import numpy as np

model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

def embed_image(image_path: str) -> list[float]:
    image = Image.open(image_path).convert("RGB")
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        features = model.get_image_features(**inputs)
    # Normalize to unit vector for cosine similarity
    features = features / features.norm(dim=-1, keepdim=True)
    return features.squeeze().tolist()

def embed_text(text: str) -> list[float]:
    inputs = processor(text=[text], return_tensors="pt", padding=True)
    with torch.no_grad():
        features = model.get_text_features(**inputs)
    features = features / features.norm(dim=-1, keepdim=True)
    return features.squeeze().tolist()
```

CLIP-vit-base-patch32 produces 512-dimensional embeddings.

## Step 2: Store Images with Embeddings in MongoDB

```python
from pymongo import MongoClient
import os

client = MongoClient("mongodb+srv://user:pass@cluster.mongodb.net/")
collection = client["imagedb"]["products"]

def index_product_images(image_dir: str):
    documents = []
    for filename in os.listdir(image_dir):
        if not filename.endswith((".jpg", ".png")):
            continue
        path = os.path.join(image_dir, filename)
        try:
            embedding = embed_image(path)
            documents.append({
                "filename": filename,
                "category": filename.split("_")[0],  # e.g. "shoes_001.jpg" -> "shoes"
                "image_url": f"https://cdn.example.com/images/{filename}",
                "embedding": embedding
            })
        except Exception as e:
            print(f"Failed to embed {filename}: {e}")

    if documents:
        result = collection.insert_many(documents)
        print(f"Indexed {len(result.inserted_ids)} images")

index_product_images("./product_images")
```

## Step 3: Create the Vector Search Index

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 512,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "category"
    }
  ]
}
```

## Step 4: Find Similar Images

Query by uploading an image or using text (thanks to CLIP's joint embedding space):

```python
def find_similar_by_image(query_image_path: str, limit: int = 6, category: str = None) -> list:
    query_vec = embed_image(query_image_path)
    return vector_search(query_vec, limit, category)

def find_similar_by_text(query_text: str, limit: int = 6) -> list:
    query_vec = embed_text(query_text)  # CLIP shares text/image embedding space
    return vector_search(query_vec, limit)

def vector_search(query_vec: list, limit: int, category: str = None) -> list:
    pipeline = [
        {
            "$vectorSearch": {
                "index": "image_index",
                "path": "embedding",
                "queryVector": query_vec,
                "numCandidates": limit * 10,
                "limit": limit,
                **({"filter": {"category": {"$eq": category}}} if category else {})
            }
        },
        {
            "$project": {
                "_id": 0,
                "filename": 1,
                "image_url": 1,
                "category": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ]
    return list(collection.aggregate(pipeline))

# Text-to-image search
results = find_similar_by_text("red running shoes")
for r in results:
    print(r["filename"], r["image_url"], round(r["score"], 4))
```

## Step 5: Expose as an API

```python
from flask import Flask, request, jsonify
import tempfile

app = Flask(__name__)

@app.route("/search/image", methods=["POST"])
def search_by_image():
    file = request.files["image"]
    with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
        file.save(tmp.name)
        results = find_similar_by_image(tmp.name, limit=12)
    return jsonify(results)

@app.route("/search/text", methods=["GET"])
def search_by_text():
    query = request.args.get("q", "")
    results = find_similar_by_text(query, limit=12)
    return jsonify(results)
```

## Summary

Image similarity search with MongoDB uses CLIP to generate 512-dimensional embeddings from images, stores them in documents alongside metadata, and uses Atlas Vector Search to find visually similar items via `$vectorSearch`. CLIP's shared text-image embedding space also enables text-to-image queries, letting users describe what they are looking for in natural language.
