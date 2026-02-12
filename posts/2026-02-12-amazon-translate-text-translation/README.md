# How to Use Amazon Translate for Text Translation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Translate, Translation, NLP, Localization

Description: Learn how to use Amazon Translate for real-time and batch text translation, custom terminology, parallel data, and building multilingual applications.

---

Amazon Translate is AWS's neural machine translation service, and it's gotten remarkably good. It supports 75+ languages, handles context well, and you can customize it with your own terminology. Whether you're localizing a product, translating customer support tickets, or building multilingual content pipelines, Translate does the job without the overhead of managing translation models.

The API is dead simple - pass in text and a target language, get back translated text. But there's a lot more depth available when you need it, including custom terminology, parallel data for domain adaptation, and batch processing for large-scale jobs.

## Basic Translation

The simplest use case: translate a piece of text from one language to another.

```python
import boto3

translate = boto3.client('translate', region_name='us-east-1')

def translate_text(text, target_language, source_language='auto'):
    """Translate text to the target language.

    Args:
        text: The text to translate
        target_language: Language code (e.g., 'es', 'fr', 'de', 'ja')
        source_language: Source language code, or 'auto' for auto-detection
    """
    response = translate.translate_text(
        Text=text,
        SourceLanguageCode=source_language,
        TargetLanguageCode=target_language
    )

    return {
        'translated_text': response['TranslatedText'],
        'source_language': response['SourceLanguageCode'],
        'target_language': response['TargetLanguageCode']
    }

# Translate to several languages
text = "Our monitoring platform helps you detect and resolve incidents faster."

languages = {
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ja': 'Japanese',
    'pt': 'Portuguese',
    'zh': 'Chinese'
}

for code, name in languages.items():
    result = translate_text(text, code)
    print(f"{name}: {result['translated_text']}")
```

## Auto-Detecting the Source Language

When you don't know what language the input is in, set the source to 'auto' and Translate will figure it out.

```python
def detect_and_translate(text, target_language):
    """Auto-detect source language and translate."""
    result = translate_text(text, target_language, source_language='auto')

    print(f"Detected source language: {result['source_language']}")
    print(f"Translation: {result['translated_text']}")

    return result

# Works with any input language
detect_and_translate("Bonjour, comment allez-vous?", 'en')
detect_and_translate("Wie geht es Ihnen heute?", 'en')
detect_and_translate("El servicio funciona perfectamente", 'en')
```

## Custom Terminology

Custom terminology ensures specific terms are translated consistently. This is critical for brand names, product names, and technical terms that shouldn't be translated or should be translated in a specific way.

```python
import csv
from io import StringIO

def create_terminology(name, terms):
    """Create a custom terminology for consistent translations.

    Args:
        name: Name for the terminology
        terms: List of dicts with 'en' and target language keys
    """
    # Build CSV format
    output = StringIO()
    # Header with language codes
    languages = set()
    for term in terms:
        languages.update(term.keys())
    languages = sorted(languages)

    writer = csv.writer(output)
    writer.writerow(languages)

    for term in terms:
        row = [term.get(lang, '') for lang in languages]
        writer.writerow(row)

    csv_content = output.getvalue().encode('utf-8')

    response = translate.import_terminology(
        Name=name,
        MergeStrategy='OVERWRITE',
        TerminologyData={
            'File': csv_content,
            'Format': 'CSV'
        }
    )

    print(f"Terminology '{name}' created with {len(terms)} terms")
    return response

# Create terminology to preserve brand and product names
terms = [
    {'en': 'OneUptime', 'es': 'OneUptime', 'fr': 'OneUptime', 'de': 'OneUptime'},
    {'en': 'StatusPage', 'es': 'StatusPage', 'fr': 'StatusPage', 'de': 'StatusPage'},
    {'en': 'incident', 'es': 'incidente', 'fr': 'incident', 'de': 'Vorfall'},
    {'en': 'uptime', 'es': 'tiempo de actividad', 'fr': 'disponibilite', 'de': 'Betriebszeit'}
]

create_terminology('monitoring-terms', terms)
```

Now use the terminology when translating.

```python
def translate_with_terminology(text, target_language, terminology_names):
    """Translate using custom terminology for consistent terms."""
    response = translate.translate_text(
        Text=text,
        SourceLanguageCode='en',
        TargetLanguageCode=target_language,
        TerminologyNames=terminology_names
    )

    # Show which terms were applied
    for term in response.get('AppliedTerminologies', []):
        name = term['Name']
        for match in term.get('Terms', []):
            print(f"  Applied term: {match.get('SourceText')} -> {match.get('TargetText')}")

    return response['TranslatedText']

# Translate with terminology
text = "OneUptime helps you monitor uptime and manage incidents on your StatusPage."
translated = translate_with_terminology(text, 'es', ['monitoring-terms'])
print(f"Translation: {translated}")
```

## Parallel Data for Domain Adaptation

Custom terminology handles individual terms, but parallel data lets you adapt the translation style and phrasing for your domain. You provide pairs of source and translated sentences, and Translate adjusts its behavior accordingly.

```python
def create_parallel_data(name, s3_uri, source_lang, target_langs):
    """Create a parallel data resource for domain adaptation."""
    response = translate.create_parallel_data(
        Name=name,
        ParallelDataConfig={
            'S3Uri': s3_uri,
            'Format': 'CSV'  # or 'TMX' or 'TSV'
        },
        Description=f'Parallel data for {source_lang} to {", ".join(target_langs)}'
    )

    print(f"Parallel data '{name}' creation started")
    print(f"Status: {response['Status']}")
    return response

# Upload parallel data to S3 first
# CSV format: source_text,target_text
parallel_csv = """en,es
"Monitor your infrastructure in real-time","Monitorea tu infraestructura en tiempo real"
"Set up alerts for downtime detection","Configura alertas para deteccion de caidas"
"View your service status at a glance","Ve el estado de tus servicios de un vistazo"
"""

s3 = boto3.client('s3', region_name='us-east-1')
s3.put_object(
    Bucket='translation-data',
    Key='parallel/monitoring-en-es.csv',
    Body=parallel_csv.encode('utf-8')
)

create_parallel_data(
    'monitoring-parallel',
    's3://translation-data/parallel/monitoring-en-es.csv',
    'en', ['es']
)
```

## Batch Translation

For translating large volumes of documents, use the asynchronous batch translation API. It processes files from S3 and writes the results back to S3.

```python
import time

def start_batch_translation(
    input_s3_uri,
    output_s3_uri,
    source_language,
    target_languages,
    role_arn,
    terminology_names=None
):
    """Start a batch translation job."""
    params = {
        'JobName': f'batch-translate-{int(time.time())}',
        'InputDataConfig': {
            'S3Uri': input_s3_uri,
            'ContentType': 'text/plain'  # or 'text/html'
        },
        'OutputDataConfig': {
            'S3Uri': output_s3_uri
        },
        'DataAccessRoleArn': role_arn,
        'SourceLanguageCode': source_language,
        'TargetLanguageCodes': target_languages
    }

    if terminology_names:
        params['TerminologyNames'] = terminology_names

    response = translate.start_text_translation_job(**params)
    job_id = response['JobId']
    print(f"Batch translation started: {job_id}")
    return job_id

def monitor_batch_job(job_id):
    """Monitor a batch translation job until completion."""
    while True:
        response = translate.describe_text_translation_job(JobId=job_id)
        job = response['TextTranslationJobProperties']
        status = job['JobStatus']

        print(f"Status: {status}")

        if status == 'COMPLETED':
            details = job.get('JobDetails', {})
            print(f"  Documents translated: {details.get('TranslatedDocumentsCount', 'N/A')}")
            print(f"  Errors: {details.get('DocumentsWithErrorsCount', 0)}")
            return job

        elif status in ['FAILED', 'COMPLETED_WITH_ERROR']:
            print(f"  Message: {job.get('Message', 'No message')}")
            return job

        time.sleep(30)

# Translate all files in an S3 prefix
job_id = start_batch_translation(
    input_s3_uri='s3://content-bucket/en/',
    output_s3_uri='s3://content-bucket/translated/',
    source_language='en',
    target_languages=['es', 'fr', 'de'],
    role_arn='arn:aws:iam::123456789012:role/TranslateRole'
)

monitor_batch_job(job_id)
```

## Building a Multilingual Application

Here's a practical pattern for adding multilingual support to a web application.

```python
class TranslationService:
    """Translation service with caching for web applications."""

    def __init__(self, default_language='en', cache_ttl=3600):
        self.translate = boto3.client('translate', region_name='us-east-1')
        self.dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        self.cache_table = self.dynamodb.Table('translation-cache')
        self.default_language = default_language
        self.cache_ttl = cache_ttl

    def get_translation(self, text, target_language, terminology=None):
        """Get translation with caching."""
        if target_language == self.default_language:
            return text

        # Check cache
        import hashlib
        cache_key = hashlib.sha256(
            f"{text}:{target_language}".encode()
        ).hexdigest()

        cached = self._get_cached(cache_key)
        if cached:
            return cached

        # Translate
        params = {
            'Text': text,
            'SourceLanguageCode': self.default_language,
            'TargetLanguageCode': target_language
        }
        if terminology:
            params['TerminologyNames'] = [terminology]

        response = self.translate.translate_text(**params)
        translated = response['TranslatedText']

        # Cache the result
        self._set_cached(cache_key, translated)

        return translated

    def _get_cached(self, key):
        """Retrieve from cache."""
        try:
            response = self.cache_table.get_item(Key={'cache_key': key})
            if 'Item' in response:
                return response['Item']['translated_text']
        except Exception:
            pass
        return None

    def _set_cached(self, key, text):
        """Store in cache."""
        import time
        try:
            self.cache_table.put_item(Item={
                'cache_key': key,
                'translated_text': text,
                'ttl': int(time.time()) + self.cache_ttl
            })
        except Exception:
            pass

    def translate_page(self, content_dict, target_language):
        """Translate all strings in a content dictionary."""
        translated = {}
        for key, value in content_dict.items():
            if isinstance(value, str):
                translated[key] = self.get_translation(value, target_language)
            else:
                translated[key] = value
        return translated

# Usage
service = TranslationService()

page_content = {
    'title': 'Welcome to our platform',
    'description': 'Monitor your services and keep your team informed',
    'cta_button': 'Get Started Free',
    'features_heading': 'Key Features'
}

spanish = service.translate_page(page_content, 'es')
for key, value in spanish.items():
    print(f"  {key}: {value}")
```

## HTML Translation

Translate can handle HTML content while preserving the markup structure.

```python
def translate_html(html_content, target_language):
    """Translate HTML content while preserving tags."""
    response = translate.translate_text(
        Text=html_content,
        SourceLanguageCode='en',
        TargetLanguageCode=target_language,
        Settings={
            'Formality': 'FORMAL'  # or 'INFORMAL'
        }
    )
    return response['TranslatedText']

html = '<h1>Welcome</h1><p>Monitor your <strong>infrastructure</strong> in real-time.</p>'
translated = translate_html(html, 'fr')
print(translated)  # HTML tags preserved, text translated
```

## Practical Tips

Keep text segments reasonably sized - Translate handles up to 10,000 bytes per request. For longer content, split at sentence or paragraph boundaries to maintain context.

Cache aggressively. Translation is deterministic for the same input and model version, so there's no reason to translate the same string twice.

Use formality settings when available. Some languages have formal and informal registers, and picking the right one matters for customer-facing content.

For applications that also need text analysis alongside translation, Amazon Comprehend works great as a complement. Check our guide on [text analysis with Amazon Comprehend](https://oneuptime.com/blog/post/amazon-comprehend-text-analysis/view) for details on combining these services.
