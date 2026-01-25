# How to Configure Hugging Face Transformers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Hugging Face, Transformers, NLP, Machine Learning, Python

Description: Learn how to use Hugging Face Transformers for NLP tasks including text classification, question answering, summarization, and deploying models in production.

---

Hugging Face Transformers provides access to thousands of pre-trained models through a consistent API. Whether you need text classification, named entity recognition, translation, or text generation, you can get started with just a few lines of code and fine-tune models on your own data.

## Installation

Install the transformers library and related packages:

```bash
# Core library
pip install transformers

# PyTorch backend (recommended)
pip install torch torchvision

# Or TensorFlow backend
pip install tensorflow

# Additional utilities
pip install datasets           # For loading datasets
pip install accelerate        # For distributed training
pip install sentencepiece     # For some tokenizers
pip install safetensors       # For safe model loading
```

## Quick Start with Pipelines

Pipelines provide the simplest way to use models for common tasks:

```python
from transformers import pipeline

# Text classification (sentiment analysis)
classifier = pipeline("sentiment-analysis")
result = classifier("I love using this monitoring tool!")
print(result)  # [{'label': 'POSITIVE', 'score': 0.9998}]

# Named Entity Recognition
ner = pipeline("ner", grouped_entities=True)
entities = ner("OneUptime is a monitoring platform built in New York.")
print(entities)

# Question Answering
qa = pipeline("question-answering")
answer = qa(
    question="What is Kubernetes?",
    context="Kubernetes is an open-source container orchestration platform that automates deployment, scaling, and management of containerized applications."
)
print(answer)

# Text Generation
generator = pipeline("text-generation", model="gpt2")
text = generator("The future of observability is", max_length=50)
print(text)

# Summarization
summarizer = pipeline("summarization")
summary = summarizer(
    "Observability is the ability to understand the internal state of a system by examining its outputs. It encompasses three pillars: logs, metrics, and traces. Logs provide discrete events, metrics offer aggregated numerical data, and traces show the flow of requests through distributed systems.",
    max_length=50
)
print(summary)
```

## Loading Models Manually

For more control, load models and tokenizers separately:

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

# Load tokenizer and model
model_name = "distilbert-base-uncased-finetuned-sst-2-english"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

# Prepare input
text = "This service is running smoothly!"
inputs = tokenizer(
    text,
    return_tensors="pt",    # Return PyTorch tensors
    padding=True,
    truncation=True,
    max_length=512
)

# Run inference
with torch.no_grad():
    outputs = model(**inputs)
    predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)

# Get label
labels = ["NEGATIVE", "POSITIVE"]
predicted_label = labels[predictions.argmax().item()]
confidence = predictions.max().item()
print(f"Label: {predicted_label}, Confidence: {confidence:.4f}")
```

## Working with Different Model Types

### Text Embeddings

Generate embeddings for semantic search and similarity:

```python
from transformers import AutoTokenizer, AutoModel
import torch

# Load a sentence transformer model
model_name = "sentence-transformers/all-MiniLM-L6-v2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name)

def mean_pooling(model_output, attention_mask):
    """Pool token embeddings into sentence embedding."""
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

def get_embedding(text):
    """Generate embedding for a single text."""
    inputs = tokenizer(text, padding=True, truncation=True, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
    return mean_pooling(outputs, inputs["attention_mask"])[0]

# Compare similarity
text1 = "How do I set up monitoring?"
text2 = "Configure observability for your application"
text3 = "The weather is nice today"

emb1 = get_embedding(text1)
emb2 = get_embedding(text2)
emb3 = get_embedding(text3)

def cosine_similarity(a, b):
    return torch.dot(a, b) / (torch.norm(a) * torch.norm(b))

print(f"Similarity (1,2): {cosine_similarity(emb1, emb2):.4f}")  # High
print(f"Similarity (1,3): {cosine_similarity(emb1, emb3):.4f}")  # Low
```

### Token Classification (NER)

```python
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

# Load NER model
model_name = "dslim/bert-base-NER"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForTokenClassification.from_pretrained(model_name)

# Create pipeline
ner_pipeline = pipeline(
    "ner",
    model=model,
    tokenizer=tokenizer,
    aggregation_strategy="simple"
)

# Extract entities
text = "John works at Google in San Francisco on the Kubernetes team."
entities = ner_pipeline(text)

for entity in entities:
    print(f"{entity['word']}: {entity['entity_group']} ({entity['score']:.2f})")
```

### Text Generation with Causal LMs

```python
from transformers import AutoTokenizer, AutoModelForCausalLM

# Load a code generation model
model_name = "Salesforce/codegen-350M-mono"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

# Generate code
prompt = "def fibonacci(n):"
inputs = tokenizer(prompt, return_tensors="pt")

outputs = model.generate(
    **inputs,
    max_new_tokens=100,
    temperature=0.7,
    do_sample=True,
    top_p=0.95,
    pad_token_id=tokenizer.eos_token_id
)

generated_code = tokenizer.decode(outputs[0], skip_special_tokens=True)
print(generated_code)
```

## Fine-Tuning Models

Fine-tune a pre-trained model on your own dataset:

```python
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer
)
from datasets import Dataset
import numpy as np

# Prepare your data
train_data = {
    "text": [
        "Server CPU usage is at 95%",
        "All systems operational",
        "Database connection timeout",
        "Response time within SLA",
        "Memory leak detected in service"
    ],
    "label": [1, 0, 1, 0, 1]  # 1 = alert, 0 = normal
}
train_dataset = Dataset.from_dict(train_data)

# Load model and tokenizer
model_name = "distilbert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=2
)

# Tokenize dataset
def tokenize_function(examples):
    return tokenizer(
        examples["text"],
        padding="max_length",
        truncation=True,
        max_length=128
    )

tokenized_dataset = train_dataset.map(tokenize_function, batched=True)

# Define training arguments
training_args = TrainingArguments(
    output_dir="./alert-classifier",
    num_train_epochs=3,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    warmup_steps=100,
    weight_decay=0.01,
    logging_dir="./logs",
    logging_steps=10,
    save_strategy="epoch"
)

# Create trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset,
)

# Fine-tune the model
trainer.train()

# Save the fine-tuned model
model.save_pretrained("./alert-classifier-final")
tokenizer.save_pretrained("./alert-classifier-final")
```

## Optimizing for Production

### Quantization

Reduce model size and speed up inference:

```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

model_name = "distilbert-base-uncased-finetuned-sst-2-english"
model = AutoModelForSequenceClassification.from_pretrained(model_name)
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Dynamic quantization (CPU)
quantized_model = torch.quantization.quantize_dynamic(
    model,
    {torch.nn.Linear},
    dtype=torch.qint8
)

# Compare model sizes
def get_model_size(model):
    param_size = sum(p.numel() * p.element_size() for p in model.parameters())
    return param_size / (1024 * 1024)  # MB

print(f"Original size: {get_model_size(model):.2f} MB")
print(f"Quantized size: {get_model_size(quantized_model):.2f} MB")
```

### ONNX Export

Export models to ONNX for deployment:

```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from transformers.onnx import export
from pathlib import Path
import torch

model_name = "distilbert-base-uncased-finetuned-sst-2-english"
model = AutoModelForSequenceClassification.from_pretrained(model_name)
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Export to ONNX
onnx_path = Path("model.onnx")

# Create dummy input
dummy_input = tokenizer(
    "Sample text for export",
    return_tensors="pt",
    padding="max_length",
    max_length=128
)

torch.onnx.export(
    model,
    (dummy_input["input_ids"], dummy_input["attention_mask"]),
    onnx_path,
    input_names=["input_ids", "attention_mask"],
    output_names=["logits"],
    dynamic_axes={
        "input_ids": {0: "batch_size", 1: "sequence"},
        "attention_mask": {0: "batch_size", 1: "sequence"},
        "logits": {0: "batch_size"}
    },
    opset_version=14
)

print(f"Model exported to {onnx_path}")
```

## Deploying with FastAPI

Create a production API endpoint:

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline
import torch

app = FastAPI()

# Load model once at startup
device = 0 if torch.cuda.is_available() else -1
classifier = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english",
    device=device
)

class TextRequest(BaseModel):
    text: str

class ClassificationResponse(BaseModel):
    label: str
    score: float

@app.post("/classify", response_model=ClassificationResponse)
async def classify_text(request: TextRequest):
    if len(request.text) > 1000:
        raise HTTPException(status_code=400, detail="Text too long")

    result = classifier(request.text)[0]
    return ClassificationResponse(
        label=result["label"],
        score=result["score"]
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": True}
```

## GPU Memory Management

Handle GPU memory efficiently:

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# Clear GPU cache before loading
torch.cuda.empty_cache()

# Load model with specific device mapping
model = AutoModelForCausalLM.from_pretrained(
    "mistralai/Mistral-7B-v0.1",
    torch_dtype=torch.float16,     # Use half precision
    device_map="auto",             # Automatically distribute across GPUs
    low_cpu_mem_usage=True         # Load directly to GPU
)

# Monitor memory usage
if torch.cuda.is_available():
    print(f"GPU Memory allocated: {torch.cuda.memory_allocated() / 1e9:.2f} GB")
    print(f"GPU Memory cached: {torch.cuda.memory_reserved() / 1e9:.2f} GB")

# Clean up when done
del model
torch.cuda.empty_cache()
```

---

Hugging Face Transformers democratizes access to state-of-the-art NLP models. Start with pipelines for quick prototyping, then dive deeper into manual model loading and fine-tuning as your needs grow. The ecosystem provides everything from data loading to deployment, making it the go-to library for production NLP.
