# How to Translate Text Between Languages Using the Cloud Translation Basic API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Translation, Translation API, Localization, Multi-Language

Description: Learn how to translate text between languages using Google Cloud Translation Basic API with practical examples for building multilingual applications.

---

Building a multilingual application used to mean hiring translators and maintaining separate content for every language. While human translation is still the gold standard for marketing copy and nuanced content, machine translation has gotten remarkably good for many practical use cases - support tickets, user-generated content, real-time chat, documentation, and more.

Google Cloud Translation Basic API (v2) provides a straightforward way to translate text between over 100 languages. It is the same translation engine that powers Google Translate, exposed as an API you can call from your applications. Let me show you how to use it.

## Basic API vs Advanced API

Google offers two versions of the Translation API:

**Basic (v2)**: Simple text translation with language detection. Pay per character. No customization. Great for straightforward translation tasks.

**Advanced (v3)**: Adds glossaries, batch translation, custom models, and document translation. More features but more setup.

This post covers the Basic API. If you need glossaries, batch processing, or document translation, check out the Advanced API instead.

## Getting Started

Enable the API and install the client library:

```bash
# Enable the Cloud Translation API
gcloud services enable translate.googleapis.com

# Install the Python client library
pip install google-cloud-translate
```

## Simple Text Translation

Here is the most basic translation call:

```python
from google.cloud import translate_v2 as translate

def translate_text(text, target_language):
    """Translate text to the target language."""
    client = translate.Client()

    # Translate the text
    result = client.translate(text, target_language=target_language)

    print(f"Input:    {result['input']}")
    print(f"Output:   {result['translatedText']}")
    print(f"Detected: {result['detectedSourceLanguage']}")

    return result

# Translate English to Spanish
translate_text("How is your server performing today?", "es")

# Translate English to Japanese
translate_text("The deployment completed successfully.", "ja")

# Translate English to French
translate_text("Please check the monitoring dashboard.", "fr")
```

## Specifying the Source Language

If you know the source language, providing it improves accuracy and avoids detection errors:

```python
from google.cloud import translate_v2 as translate

def translate_with_source(text, source_language, target_language):
    """Translate text with an explicit source language."""
    client = translate.Client()

    result = client.translate(
        text,
        source_language=source_language,
        target_language=target_language,
    )

    return result["translatedText"]

# Translate from German to English
english_text = translate_with_source(
    "Der Server antwortet nicht mehr.",
    source_language="de",
    target_language="en"
)
print(english_text)
```

## Translating Multiple Texts

You can send multiple texts in a single API call to reduce latency:

```python
from google.cloud import translate_v2 as translate

def translate_batch(texts, target_language):
    """Translate multiple texts in a single API call."""
    client = translate.Client()

    # The API accepts a list of strings
    results = client.translate(texts, target_language=target_language)

    translations = []
    for result in results:
        translations.append({
            "original": result["input"],
            "translated": result["translatedText"],
            "source_language": result["detectedSourceLanguage"],
        })

    return translations

# Translate multiple error messages to Spanish
messages = [
    "Connection timeout",
    "Authentication failed",
    "Resource not found",
    "Rate limit exceeded",
    "Internal server error",
]

translated = translate_batch(messages, "es")
for t in translated:
    print(f"{t['original']} -> {t['translated']}")
```

## Building a Translation Middleware

Here is a practical example of a translation layer for an API or chat application:

```python
from google.cloud import translate_v2 as translate
from functools import lru_cache

class TranslationService:
    """Translation service with caching and batch support."""

    def __init__(self):
        self.client = translate.Client()
        self._cache = {}

    def translate(self, text, target_language, source_language=None):
        """Translate text with caching to reduce API calls."""
        # Create a cache key
        cache_key = f"{text}:{source_language}:{target_language}"

        if cache_key in self._cache:
            return self._cache[cache_key]

        result = self.client.translate(
            text,
            target_language=target_language,
            source_language=source_language,
        )

        translated = result["translatedText"]
        self._cache[cache_key] = translated

        return translated

    def translate_dict(self, data, target_language, fields=None):
        """Translate specific fields in a dictionary."""
        translated_data = data.copy()

        # If no fields specified, translate all string values
        if fields is None:
            fields = [k for k, v in data.items() if isinstance(v, str)]

        for field in fields:
            if field in data and isinstance(data[field], str):
                translated_data[field] = self.translate(
                    data[field], target_language
                )

        return translated_data

    def translate_for_user(self, text, user_language):
        """Translate text to the user's preferred language."""
        # Skip translation if already in the target language
        detected = self.client.detect_language(text)
        if detected["language"] == user_language:
            return text

        return self.translate(text, user_language)

# Usage in an application
translator = TranslationService()

# Translate a support ticket
ticket = {
    "subject": "Cannot access my dashboard",
    "body": "I have been trying to log in for the past hour but keep getting an error.",
    "priority": "high",  # This field should not be translated
    "status": "open",
}

# Translate subject and body to Spanish
translated_ticket = translator.translate_dict(
    ticket,
    target_language="es",
    fields=["subject", "body"],
)

print(translated_ticket)
```

## Listing Supported Languages

Find out which languages are available for translation:

```python
from google.cloud import translate_v2 as translate

def list_supported_languages(display_language="en"):
    """List all languages supported by the Translation API."""
    client = translate.Client()

    # Get supported languages with display names
    results = client.get_languages(target_language=display_language)

    print(f"Supported languages ({len(results)}):\n")

    for lang in results:
        print(f"  {lang['language']:5s} - {lang['name']}")

    return results

# List all supported languages with English display names
languages = list_supported_languages("en")
```

## Handling HTML Content

The Translation API can preserve HTML tags during translation:

```python
from google.cloud import translate_v2 as translate

def translate_html(html_content, target_language):
    """Translate HTML content while preserving markup."""
    client = translate.Client()

    # Set format to 'html' to preserve HTML tags
    result = client.translate(
        html_content,
        target_language=target_language,
        format_="html",  # Preserve HTML tags
    )

    return result["translatedText"]

# Translate an HTML snippet
html = '<p>Welcome to our <strong>monitoring platform</strong>. Please <a href="/setup">set up your first monitor</a>.</p>'
translated_html = translate_html(html, "fr")
print(translated_html)
```

## Error Handling

Handle common errors gracefully:

```python
from google.cloud import translate_v2 as translate
from google.api_core import exceptions

def safe_translate(text, target_language):
    """Translate with proper error handling."""
    client = translate.Client()

    try:
        # Check for empty input
        if not text or not text.strip():
            return text

        result = client.translate(text, target_language=target_language)
        return result["translatedText"]

    except exceptions.BadRequest as e:
        print(f"Bad request: {e}. Check language code: {target_language}")
        return text  # Return original on error

    except exceptions.ResourceExhausted as e:
        print(f"Quota exceeded: {e}")
        return text

    except exceptions.ServiceUnavailable as e:
        print(f"Service unavailable: {e}")
        return text

    except Exception as e:
        print(f"Translation error: {e}")
        return text
```

## Cost and Quota Considerations

The Translation Basic API charges $20 per million characters. Here are some tips to manage costs:

- Cache translations aggressively. The same phrases get translated repeatedly in most applications.
- Use batch translation for bulk content instead of individual API calls.
- Skip translation when the source language matches the target language.
- For very high volumes, consider the Advanced API which offers batch processing through Cloud Storage.

The default quota is 600,000 characters per minute. Request an increase if you need more.

## Wrapping Up

Cloud Translation Basic API is the quickest way to add multilingual support to your application. The API is dead simple - send text in, get translated text back. Combined with language detection and HTML-aware translation, it covers most common translation use cases without any model training or complex setup.

For monitoring the health and response times of your translation services in production, [OneUptime](https://oneuptime.com) helps you track API performance and catch degradation before it impacts your users.
