# How to Use the google-cloud-translate Python Library to Build a Translation Microservice on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Translate, Python, Cloud Run, Microservices

Description: Build a translation microservice using the google-cloud-translate Python library deployed on Cloud Run for scalable multilingual text translation.

---

Adding translation capabilities to your application opens it up to a global audience. Google Cloud Translation API supports over 100 languages and handles everything from simple text translation to detecting the source language automatically. Wrapping it in a FastAPI microservice on Cloud Run gives you a reusable, scalable translation service that any part of your system can call.

## Setup

Install the Translation API client library.

```bash
# Install the Translation API client and FastAPI
pip install google-cloud-translate fastapi uvicorn

# Enable the Translation API
gcloud services enable translate.googleapis.com
```

## Basic Translation

Here is how translation works with the Python client library.

```python
from google.cloud import translate_v2 as translate

def translate_text(text, target_language, source_language=None):
    """Translate text to the target language."""
    client = translate.Client()

    # If source_language is None, the API auto-detects it
    result = client.translate(
        text,
        target_language=target_language,
        source_language=source_language,
    )

    return {
        "original_text": result["input"],
        "translated_text": result["translatedText"],
        "detected_source_language": result.get("detectedSourceLanguage"),
        "target_language": target_language,
    }

# Translate English to Spanish
result = translate_text("Hello, how are you?", "es")
print(f"Translation: {result['translated_text']}")
# Output: Hola, como estas?
```

## Building the Translation Microservice

Here is a complete FastAPI microservice that exposes translation functionality through a REST API.

```python
# main.py - Translation microservice
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from google.cloud import translate_v2 as translate
from typing import List, Optional
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Translation Microservice",
    description="Translate text between languages using Google Cloud Translation API",
    version="1.0.0",
)

# Initialize the translation client once
translate_client = translate.Client()

# Request and response models
class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to translate")
    target_language: str = Field(..., min_length=2, max_length=5, description="Target language code (e.g., 'es', 'fr', 'de')")
    source_language: Optional[str] = Field(None, description="Source language code (auto-detected if not provided)")

class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str
    source_language: str
    target_language: str

class BatchTranslationRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=100)
    target_language: str = Field(..., min_length=2, max_length=5)
    source_language: Optional[str] = None

class DetectionResponse(BaseModel):
    text: str
    language: str
    confidence: float

class LanguageInfo(BaseModel):
    code: str
    name: str
```

## Single Text Translation Endpoint

The main endpoint translates a single text string.

```python
@app.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """Translate a single text to the target language."""
    try:
        result = translate_client.translate(
            request.text,
            target_language=request.target_language,
            source_language=request.source_language,
        )

        return TranslationResponse(
            original_text=result["input"],
            translated_text=result["translatedText"],
            source_language=result.get("detectedSourceLanguage", request.source_language),
            target_language=request.target_language,
        )

    except Exception as e:
        logger.error(f"Translation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")
```

## Batch Translation Endpoint

For translating multiple texts at once, a batch endpoint is more efficient.

```python
@app.post("/translate/batch", response_model=List[TranslationResponse])
async def translate_batch(request: BatchTranslationRequest):
    """Translate multiple texts in a single request."""
    if len(request.texts) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 texts per batch")

    try:
        # The translate method accepts a list of strings
        results = translate_client.translate(
            request.texts,
            target_language=request.target_language,
            source_language=request.source_language,
        )

        translations = []
        for result in results:
            translations.append(TranslationResponse(
                original_text=result["input"],
                translated_text=result["translatedText"],
                source_language=result.get("detectedSourceLanguage", request.source_language or "auto"),
                target_language=request.target_language,
            ))

        logger.info(f"Batch translated {len(translations)} texts to {request.target_language}")
        return translations

    except Exception as e:
        logger.error(f"Batch translation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

## Language Detection Endpoint

Sometimes you just need to detect what language a text is written in.

```python
@app.post("/detect", response_model=List[DetectionResponse])
async def detect_language(texts: List[str] = Field(..., min_length=1, max_length=100)):
    """Detect the language of one or more texts."""
    try:
        results = translate_client.detect_language(texts)

        detections = []
        for i, result in enumerate(results):
            # result can be a list of detections; take the most confident one
            if isinstance(result, list):
                result = result[0]

            detections.append(DetectionResponse(
                text=texts[i][:100],  # Truncate for response
                language=result["language"],
                confidence=round(result.get("confidence", 0), 4),
            ))

        return detections

    except Exception as e:
        logger.error(f"Language detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

## Listing Supported Languages

Expose the list of supported languages so clients know what is available.

```python
@app.get("/languages", response_model=List[LanguageInfo])
async def list_languages(display_language: str = Query(default="en", description="Language for display names")):
    """List all supported translation languages."""
    try:
        languages = translate_client.get_languages(target_language=display_language)

        return [
            LanguageInfo(
                code=lang["language"],
                name=lang.get("name", lang["language"]),
            )
            for lang in languages
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Adding Translation Caching

For repeated translations (common in web applications), caching reduces API calls and costs.

```python
from functools import lru_cache
import hashlib

# Simple in-memory cache for translations
# In production, use Redis or Memorystore for a shared cache
translation_cache = {}

def get_cache_key(text, target_language, source_language):
    """Generate a cache key for a translation request."""
    raw = f"{text}:{target_language}:{source_language or 'auto'}"
    return hashlib.sha256(raw.encode()).hexdigest()

@app.post("/translate/cached", response_model=TranslationResponse)
async def translate_cached(request: TranslationRequest):
    """Translate with caching to reduce API calls."""
    cache_key = get_cache_key(request.text, request.target_language, request.source_language)

    # Check cache first
    if cache_key in translation_cache:
        logger.info("Cache hit for translation")
        return translation_cache[cache_key]

    # Cache miss - call the API
    result = translate_client.translate(
        request.text,
        target_language=request.target_language,
        source_language=request.source_language,
    )

    response = TranslationResponse(
        original_text=result["input"],
        translated_text=result["translatedText"],
        source_language=result.get("detectedSourceLanguage", request.source_language or "auto"),
        target_language=request.target_language,
    )

    # Store in cache
    translation_cache[cache_key] = response

    # Limit cache size to prevent memory issues
    if len(translation_cache) > 10000:
        # Remove the oldest half of the cache
        keys = list(translation_cache.keys())
        for key in keys[:5000]:
            del translation_cache[key]

    return response
```

## Using the Translation V3 API

The V3 API (Advanced) offers additional features like glossaries and batch document translation.

```python
from google.cloud import translate_v3 as translate_v3

def translate_with_glossary(project_id, text, target_language, glossary_id):
    """Translate using a custom glossary for domain-specific terms."""
    client = translate_v3.TranslationServiceClient()
    parent = f"projects/{project_id}/locations/us-central1"

    # Reference the glossary
    glossary_path = client.glossary_path(project_id, "us-central1", glossary_id)
    glossary_config = translate_v3.TranslateTextGlossaryConfig(glossary=glossary_path)

    response = client.translate_text(
        request={
            "parent": parent,
            "contents": [text],
            "target_language_code": target_language,
            "glossary_config": glossary_config,
            "mime_type": "text/plain",
        }
    )

    # Get the glossary-applied translation
    for translation in response.glossary_translations:
        return translation.translated_text
```

## Deploying to Cloud Run

Package and deploy the translation microservice.

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/my-project/translation-service

gcloud run deploy translation-service \
    --image gcr.io/my-project/translation-service \
    --region us-central1 \
    --memory 256Mi \
    --max-instances 10 \
    --allow-unauthenticated
```

## Health Check

Add a health endpoint that verifies the Translation API is accessible.

```python
@app.get("/health")
async def health():
    """Check service health and API connectivity."""
    try:
        # Quick test translation to verify API access
        translate_client.translate("test", target_language="es")
        return {"status": "healthy", "api": "connected"}
    except Exception as e:
        return {"status": "degraded", "api": str(e)}
```

## Monitoring Your Translation Service

Translation services can hit API quotas, experience latency spikes, or encounter unsupported language pairs. OneUptime (https://oneuptime.com) can monitor your Cloud Run translation service, track response times for different language pairs, and alert you when the service degrades.

## Summary

Building a translation microservice with the Cloud Translate API and Cloud Run gives you a reusable service that any part of your system can call for multilingual support. Keep the API simple with single and batch translation endpoints, add language detection for automatic source language handling, cache frequent translations to reduce costs, and include a health check endpoint. The V2 API covers most use cases, while the V3 API adds glossaries and document translation when you need them.
