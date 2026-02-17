# How to Translate Text Between Languages Using Azure Translator API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Translator, Translation, NLP, Localization, AI, Multilingual

Description: Translate text between over 100 languages using Azure Translator API with language detection, batch translation, and customization options.

---

Building multilingual applications used to require maintaining separate content for each language or hiring professional translators for every piece of text. Azure Translator API provides neural machine translation between over 100 languages, and the quality has gotten remarkably good. It handles everything from single sentences to entire documents, supports automatic language detection, and even lets you train custom translation models for domain-specific terminology. In this post, I will show you how to integrate Azure Translator into your applications.

## Step 1: Create a Translator Resource

In the Azure Portal:

1. Search for "Translator" in the marketplace.
2. Click "Create."
3. Select your subscription, resource group, and region. Note: for the global endpoint, select "Global" as the region.
4. Choose the Free F0 tier (2 million characters per month) or Standard S1 for production.
5. Review and create.

Copy the API key and the region from the resource. The Translator API uses a different authentication pattern than most Azure Cognitive Services - it requires a region parameter in the request header.

## Step 2: Translate Text

The Translator API uses a REST interface. Let us start with a simple translation.

```python
import requests
import json

# Configuration
translator_key = "your-translator-key"
translator_region = "eastus"  # Your resource's region
translator_endpoint = "https://api.cognitive.microsofttranslator.com"

def translate_text(text, target_language, source_language=None):
    """
    Translate text to the target language.
    If source_language is not specified, the API auto-detects it.
    """
    url = f"{translator_endpoint}/translate"

    params = {
        "api-version": "3.0",
        "to": target_language
    }

    # Optionally specify the source language
    if source_language:
        params["from"] = source_language

    headers = {
        "Ocp-Apim-Subscription-Key": translator_key,
        "Ocp-Apim-Subscription-Region": translator_region,
        "Content-Type": "application/json"
    }

    body = [{"text": text}]

    response = requests.post(url, params=params, headers=headers, json=body)
    response.raise_for_status()

    result = response.json()

    translation = result[0]["translations"][0]
    detected_language = result[0].get("detectedLanguage", {})

    return {
        "original": text,
        "translated": translation["text"],
        "target_language": translation["to"],
        "detected_source": detected_language.get("language"),
        "detection_confidence": detected_language.get("score")
    }


# Translate English to French
result = translate_text("Hello, how are you today?", "fr")
print(f"Original: {result['original']}")
print(f"Translated: {result['translated']}")
print(f"Detected source: {result['detected_source']}")
```

## Step 3: Translate to Multiple Languages at Once

You can translate to multiple target languages in a single API call. This is more efficient than making separate calls.

```python
def translate_to_multiple(text, target_languages):
    """
    Translate text to multiple languages in a single API call.
    More efficient than making separate calls for each language.
    """
    url = f"{translator_endpoint}/translate"

    # Pass multiple target languages as repeated 'to' parameters
    params = {
        "api-version": "3.0",
        "to": target_languages  # e.g., ["fr", "de", "es", "ja"]
    }

    headers = {
        "Ocp-Apim-Subscription-Key": translator_key,
        "Ocp-Apim-Subscription-Region": translator_region,
        "Content-Type": "application/json"
    }

    body = [{"text": text}]

    response = requests.post(url, params=params, headers=headers, json=body)
    response.raise_for_status()

    result = response.json()

    translations = {}
    for translation in result[0]["translations"]:
        translations[translation["to"]] = translation["text"]

    return translations


# Translate to 5 languages at once
languages = ["fr", "de", "es", "ja", "zh-Hans"]
results = translate_to_multiple(
    "Welcome to our platform. We are happy to have you.",
    languages
)

for lang, text in results.items():
    print(f"  {lang}: {text}")
```

## Step 4: Batch Translation

For translating multiple texts efficiently, batch them into a single request. The API accepts up to 100 elements per request, with a total limit of 10,000 characters.

```python
def translate_batch(texts, target_language, source_language=None):
    """
    Translate multiple texts in a single API call.
    Accepts up to 100 texts, max 10,000 characters total.
    """
    url = f"{translator_endpoint}/translate"

    params = {
        "api-version": "3.0",
        "to": target_language
    }
    if source_language:
        params["from"] = source_language

    headers = {
        "Ocp-Apim-Subscription-Key": translator_key,
        "Ocp-Apim-Subscription-Region": translator_region,
        "Content-Type": "application/json"
    }

    # Each text is a separate element in the body array
    body = [{"text": t} for t in texts]

    response = requests.post(url, params=params, headers=headers, json=body)
    response.raise_for_status()

    results = response.json()

    translations = []
    for i, result in enumerate(results):
        translations.append({
            "original": texts[i],
            "translated": result["translations"][0]["text"]
        })

    return translations


# Translate a batch of product descriptions
descriptions = [
    "Wireless noise-canceling headphones with 30-hour battery life.",
    "Ergonomic office chair with lumbar support and adjustable armrests.",
    "Stainless steel water bottle that keeps drinks cold for 24 hours.",
    "Portable Bluetooth speaker with waterproof design.",
    "LED desk lamp with adjustable brightness and color temperature."
]

translated = translate_batch(descriptions, "de")
for item in translated:
    print(f"EN: {item['original']}")
    print(f"DE: {item['translated']}\n")
```

## Step 5: Language Detection

If you do not know the source language, the Translator API can detect it automatically. You can also use the dedicated language detection endpoint for when you just need to know the language without translating.

```python
def detect_language(texts):
    """
    Detect the language of one or more texts.
    Returns the detected language code and confidence score.
    """
    url = f"{translator_endpoint}/detect"

    headers = {
        "Ocp-Apim-Subscription-Key": translator_key,
        "Ocp-Apim-Subscription-Region": translator_region,
        "Content-Type": "application/json"
    }

    body = [{"text": t} for t in texts]

    response = requests.post(
        url,
        params={"api-version": "3.0"},
        headers=headers,
        json=body
    )
    response.raise_for_status()

    results = response.json()

    detections = []
    for i, result in enumerate(results):
        detections.append({
            "text": texts[i][:50],
            "language": result["language"],
            "confidence": result["score"],
            "alternatives": result.get("alternatives", [])
        })

    return detections


# Detect languages
mixed_texts = [
    "Bonjour, comment allez-vous?",
    "Guten Morgen, wie geht es Ihnen?",
    "Buenos dias, como estas?",
    "Good morning, how are you?",
    "Ohayo gozaimasu, genki desu ka?"
]

detections = detect_language(mixed_texts)
for d in detections:
    print(f"'{d['text']}...' -> {d['language']} (confidence: {d['confidence']:.2f})")
```

## Step 6: Transliteration

Transliteration converts text from one script to another without translating the meaning. This is useful for languages with multiple writing systems.

```python
def transliterate(text, language, from_script, to_script):
    """
    Convert text from one script to another.
    For example, Japanese Kanji to Latin (Romaji) or Hindi Devanagari to Latin.
    """
    url = f"{translator_endpoint}/transliterate"

    params = {
        "api-version": "3.0",
        "language": language,
        "fromScript": from_script,
        "toScript": to_script
    }

    headers = {
        "Ocp-Apim-Subscription-Key": translator_key,
        "Ocp-Apim-Subscription-Region": translator_region,
        "Content-Type": "application/json"
    }

    body = [{"text": text}]

    response = requests.post(url, params=params, headers=headers, json=body)
    response.raise_for_status()

    result = response.json()
    return result[0]["text"]


# Convert Japanese to Romaji
romaji = transliterate("こんにちは", "ja", "Jpan", "Latn")
print(f"Transliterated: {romaji}")  # Output: Konnichiwa
```

## Step 7: List Supported Languages

Query the API to get the full list of supported languages, which is useful for building language selector UI components.

```python
def get_supported_languages():
    """
    Get all languages supported by the Translator API.
    No authentication required for this endpoint.
    """
    url = f"{translator_endpoint}/languages"
    params = {"api-version": "3.0"}

    response = requests.get(url, params=params)
    response.raise_for_status()

    result = response.json()

    # Translation languages
    translation_langs = result.get("translation", {})
    print(f"Translation: {len(translation_langs)} languages supported")

    # Show a sample
    for code, info in list(translation_langs.items())[:10]:
        print(f"  {code}: {info['name']} (native: {info['nativeName']})")

    return result


languages = get_supported_languages()
```

## Building a Translation Helper Class

For production applications, wrap the API calls in a reusable class with error handling and rate limiting.

```python
import time

class AzureTranslator:
    """
    A production-ready wrapper around Azure Translator API.
    Handles batching, retries, and character limit enforcement.
    """

    def __init__(self, key, region, endpoint=None):
        self.key = key
        self.region = region
        self.endpoint = endpoint or "https://api.cognitive.microsofttranslator.com"
        self.headers = {
            "Ocp-Apim-Subscription-Key": self.key,
            "Ocp-Apim-Subscription-Region": self.region,
            "Content-Type": "application/json"
        }

    def translate(self, texts, target, source=None, max_retries=3):
        """
        Translate a list of texts, automatically batching to stay within limits.
        """
        if isinstance(texts, str):
            texts = [texts]

        all_translations = []

        # Process in batches to respect the 10,000 character limit
        batch = []
        batch_chars = 0

        for text in texts:
            text_len = len(text)

            # If adding this text would exceed the limit, process the current batch
            if batch_chars + text_len > 9500 or len(batch) >= 100:
                result = self._translate_batch(batch, target, source, max_retries)
                all_translations.extend(result)
                batch = []
                batch_chars = 0

            batch.append(text)
            batch_chars += text_len

        # Process the remaining batch
        if batch:
            result = self._translate_batch(batch, target, source, max_retries)
            all_translations.extend(result)

        return all_translations

    def _translate_batch(self, texts, target, source, max_retries):
        """Send a batch of texts for translation with retry logic."""
        url = f"{self.endpoint}/translate"
        params = {"api-version": "3.0", "to": target}
        if source:
            params["from"] = source

        body = [{"text": t} for t in texts]

        for attempt in range(max_retries):
            try:
                response = requests.post(
                    url, params=params,
                    headers=self.headers, json=body
                )
                response.raise_for_status()
                results = response.json()
                return [r["translations"][0]["text"] for r in results]

            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:
                    # Rate limited - wait and retry
                    wait = 2 ** attempt
                    print(f"Rate limited, waiting {wait}s...")
                    time.sleep(wait)
                else:
                    raise

        raise Exception("Max retries exceeded for translation batch")


# Usage
translator = AzureTranslator(
    key=translator_key,
    region=translator_region
)

results = translator.translate(
    ["Hello world", "How are you?", "Thank you very much"],
    target="es"
)
for r in results:
    print(r)
```

## Cost Considerations

Azure Translator pricing is based on the number of characters translated:

- **Free tier (F0)**: 2 million characters per month
- **Standard tier (S1)**: $10 per million characters

Characters are counted in the source text, not the translated output. Every character counts, including spaces and punctuation. For high-volume scenarios, this is significantly cheaper than professional human translation while providing near-instant results.

## Wrapping Up

Azure Translator API provides high-quality neural machine translation that is easy to integrate into any application. The REST API approach means it works with any programming language, and the support for batch translation and multiple target languages in a single call makes it efficient for production use. Start with the Free tier to evaluate quality for your specific content, build a wrapper class with proper error handling and batching, and consider custom models if you have domain-specific terminology that the standard models struggle with.
