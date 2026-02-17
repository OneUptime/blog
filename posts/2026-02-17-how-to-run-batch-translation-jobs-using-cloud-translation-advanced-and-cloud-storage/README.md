# How to Run Batch Translation Jobs Using Cloud Translation Advanced and Cloud Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Translation, Batch Translation, Cloud Storage, Localization

Description: Learn how to run batch translation jobs using Google Cloud Translation Advanced API with Cloud Storage for efficiently translating large volumes of content.

---

When you need to translate thousands of documents, millions of support tickets, or an entire website's content library, calling the translation API one request at a time is painfully slow and expensive in terms of API overhead. Cloud Translation Advanced (v3) offers batch translation that processes files directly from Cloud Storage, handles multiple target languages in a single job, and runs asynchronously so you do not need to keep a connection open.

In this guide, I will show you how to set up and run batch translation jobs, handle the output, and build it into your content localization workflow.

## How Batch Translation Works

The batch translation flow is straightforward:

1. Upload your source files to a Cloud Storage bucket
2. Submit a batch translation request specifying source and target languages
3. The API processes all files asynchronously
4. Results are written to an output Cloud Storage bucket
5. You download or process the translated files

The API supports plain text files, HTML files, and TSV files as input. Each file can be up to 10MB, and you can process up to 100 files per batch request.

## Prerequisites

Set up the required resources:

```bash
# Enable the Translation API
gcloud services enable translate.googleapis.com

# Create input and output buckets
gsutil mb -l us-central1 gs://your-translation-input
gsutil mb -l us-central1 gs://your-translation-output

# Install the Python client
pip install google-cloud-translate google-cloud-storage
```

## Preparing Input Files

Upload your source content to Cloud Storage. The files can be plain text, HTML, or TSV:

```python
from google.cloud import storage
import os

def upload_files_for_translation(local_dir, bucket_name, prefix="source/"):
    """Upload text files to Cloud Storage for batch translation."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)

    uploaded = []

    for filename in os.listdir(local_dir):
        # Only upload supported file types
        if not filename.endswith((".txt", ".html", ".tsv")):
            continue

        local_path = os.path.join(local_dir, filename)
        blob_name = f"{prefix}{filename}"
        blob = bucket.blob(blob_name)

        blob.upload_from_filename(local_path)
        uploaded.append(f"gs://{bucket_name}/{blob_name}")
        print(f"Uploaded: {blob_name}")

    print(f"\nUploaded {len(uploaded)} files to gs://{bucket_name}/{prefix}")
    return uploaded

# Upload your content files
upload_files_for_translation(
    local_dir="/path/to/content",
    bucket_name="your-translation-input",
    prefix="en-source/"
)
```

## Running a Basic Batch Translation

Here is how to submit a batch translation job:

```python
from google.cloud import translate_v3 as translate

def batch_translate_text(
    project_id,
    location,
    input_uri,
    output_uri,
    source_language,
    target_languages,
):
    """Run a batch translation job from Cloud Storage files."""
    client = translate.TranslationServiceClient()

    parent = f"projects/{project_id}/locations/{location}"

    # Configure the input source
    gcs_source = translate.GcsSource(input_uri=input_uri)
    input_config = translate.InputConfig(
        gcs_source=gcs_source,
        mime_type="text/plain",  # Use "text/html" for HTML files
    )

    # Configure the output destination for each target language
    output_configs = []
    for target_lang in target_languages:
        gcs_destination = translate.GcsDestination(
            output_uri_prefix=f"{output_uri}{target_lang}/"
        )
        output_config = translate.OutputConfig(gcs_destination=gcs_destination)
        output_configs.append(output_config)

    # Build the target language codes map
    target_language_codes = target_languages

    # Submit the batch translation request
    operation = client.batch_translate_text(
        request={
            "parent": parent,
            "source_language_code": source_language,
            "target_language_codes": target_language_codes,
            "input_configs": [input_config],
            "output_config": translate.OutputConfig(
                gcs_destination=translate.GcsDestination(
                    output_uri_prefix=output_uri
                )
            ),
        }
    )

    print("Batch translation started...")
    print(f"Operation: {operation.operation.name}")

    # Wait for completion
    result = operation.result(timeout=3600)

    print(f"\nTranslation complete!")
    print(f"Total characters: {result.total_characters}")
    print(f"Translated characters: {result.translated_characters}")
    print(f"Failed characters: {result.failed_characters}")

    return result

# Translate all text files in the source directory to multiple languages
batch_translate_text(
    project_id="your-project-id",
    location="us-central1",
    input_uri="gs://your-translation-input/en-source/*",
    output_uri="gs://your-translation-output/",
    source_language="en",
    target_languages=["es", "fr", "de", "ja"],
)
```

## Batch Translation with a Glossary

Combine batch translation with a glossary for consistent terminology:

```python
from google.cloud import translate_v3 as translate

def batch_translate_with_glossary(
    project_id,
    location,
    input_uri,
    output_uri,
    source_language,
    target_languages,
    glossary_id,
):
    """Run batch translation with a glossary applied."""
    client = translate.TranslationServiceClient()

    parent = f"projects/{project_id}/locations/{location}"
    glossary_path = f"{parent}/glossaries/{glossary_id}"

    # Configure glossary for each target language
    glossaries = {}
    for target_lang in target_languages:
        glossaries[target_lang] = translate.TranslateTextGlossaryConfig(
            glossary=glossary_path,
        )

    input_config = translate.InputConfig(
        gcs_source=translate.GcsSource(input_uri=input_uri),
        mime_type="text/plain",
    )

    output_config = translate.OutputConfig(
        gcs_destination=translate.GcsDestination(
            output_uri_prefix=output_uri
        )
    )

    operation = client.batch_translate_text(
        request={
            "parent": parent,
            "source_language_code": source_language,
            "target_language_codes": target_languages,
            "input_configs": [input_config],
            "output_config": output_config,
            "glossaries": glossaries,
        }
    )

    print("Batch translation with glossary started...")
    result = operation.result(timeout=3600)

    print(f"Total characters: {result.total_characters}")
    print(f"Translated characters: {result.translated_characters}")

    return result
```

## Translating HTML Content

For HTML files, use the appropriate MIME type to preserve markup:

```python
from google.cloud import translate_v3 as translate

def batch_translate_html(project_id, location, input_uri, output_uri, source_lang, target_langs):
    """Batch translate HTML files while preserving markup."""
    client = translate.TranslationServiceClient()

    parent = f"projects/{project_id}/locations/{location}"

    # Use text/html MIME type for HTML files
    input_config = translate.InputConfig(
        gcs_source=translate.GcsSource(input_uri=input_uri),
        mime_type="text/html",  # This preserves HTML tags during translation
    )

    output_config = translate.OutputConfig(
        gcs_destination=translate.GcsDestination(
            output_uri_prefix=output_uri
        )
    )

    operation = client.batch_translate_text(
        request={
            "parent": parent,
            "source_language_code": source_lang,
            "target_language_codes": target_langs,
            "input_configs": [input_config],
            "output_config": output_config,
        }
    )

    print("Translating HTML files...")
    result = operation.result(timeout=3600)
    print(f"Complete. Translated {result.translated_characters} characters")

    return result

# Translate HTML pages
batch_translate_html(
    project_id="your-project-id",
    location="us-central1",
    input_uri="gs://your-translation-input/html-pages/*.html",
    output_uri="gs://your-translation-output/html/",
    source_lang="en",
    target_langs=["es", "fr"],
)
```

## Downloading and Processing Results

After the job completes, download the translated files:

```python
from google.cloud import storage
import os

def download_translations(bucket_name, prefix, local_dir):
    """Download translated files from Cloud Storage."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)

    blobs = list(bucket.list_blobs(prefix=prefix))

    os.makedirs(local_dir, exist_ok=True)
    downloaded = []

    for blob in blobs:
        if blob.name.endswith("/"):
            continue  # Skip directory markers

        # Preserve directory structure
        relative_path = blob.name[len(prefix):]
        local_path = os.path.join(local_dir, relative_path)

        # Create subdirectories as needed
        os.makedirs(os.path.dirname(local_path), exist_ok=True)

        blob.download_to_filename(local_path)
        downloaded.append(local_path)
        print(f"Downloaded: {relative_path}")

    print(f"\nDownloaded {len(downloaded)} files to {local_dir}")
    return downloaded

# Download Spanish translations
download_translations(
    bucket_name="your-translation-output",
    prefix="es/",
    local_dir="/path/to/translations/es"
)
```

## Monitoring Batch Job Progress

For long-running batch jobs, check progress without waiting for completion:

```python
from google.cloud import translate_v3 as translate
import time

def batch_translate_with_progress(project_id, location, input_uri, output_uri, source_lang, target_langs):
    """Run batch translation with progress monitoring."""
    client = translate.TranslationServiceClient()
    parent = f"projects/{project_id}/locations/{location}"

    input_config = translate.InputConfig(
        gcs_source=translate.GcsSource(input_uri=input_uri),
        mime_type="text/plain",
    )

    output_config = translate.OutputConfig(
        gcs_destination=translate.GcsDestination(
            output_uri_prefix=output_uri
        )
    )

    operation = client.batch_translate_text(
        request={
            "parent": parent,
            "source_language_code": source_lang,
            "target_language_codes": target_langs,
            "input_configs": [input_config],
            "output_config": output_config,
        }
    )

    print(f"Operation started: {operation.operation.name}")

    # Poll for progress
    while not operation.done():
        metadata = operation.metadata
        if metadata:
            state = metadata.state.name if hasattr(metadata, 'state') else "RUNNING"
            print(f"Status: {state}")
        time.sleep(30)

    if operation.exception():
        print(f"Error: {operation.exception()}")
    else:
        result = operation.result()
        print(f"Complete!")
        print(f"  Total characters: {result.total_characters}")
        print(f"  Translated: {result.translated_characters}")
        print(f"  Failed: {result.failed_characters}")

    return operation
```

## Building a Content Localization Pipeline

Here is a complete pipeline for localizing content:

```python
from google.cloud import translate_v3 as translate
from google.cloud import storage
import os
import json
from datetime import datetime

class LocalizationPipeline:
    """Automated content localization pipeline using batch translation."""

    def __init__(self, project_id, location, input_bucket, output_bucket):
        self.project_id = project_id
        self.location = location
        self.input_bucket = input_bucket
        self.output_bucket = output_bucket
        self.translate_client = translate.TranslationServiceClient()
        self.storage_client = storage.Client()

    def run(self, source_dir, source_lang, target_langs, glossary_id=None):
        """Run the full localization pipeline."""
        job_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        print(f"Starting localization job: {job_id}")

        # Step 1: Upload source files
        input_prefix = f"jobs/{job_id}/source/"
        self._upload_source_files(source_dir, input_prefix)

        # Step 2: Run batch translation
        input_uri = f"gs://{self.input_bucket}/{input_prefix}*"
        output_uri = f"gs://{self.output_bucket}/jobs/{job_id}/"

        result = self._run_translation(
            input_uri, output_uri, source_lang, target_langs, glossary_id
        )

        # Step 3: Generate job report
        report = {
            "job_id": job_id,
            "source_language": source_lang,
            "target_languages": target_langs,
            "total_characters": result.total_characters,
            "translated_characters": result.translated_characters,
            "failed_characters": result.failed_characters,
            "timestamp": datetime.now().isoformat(),
        }

        print(f"\nJob complete: {json.dumps(report, indent=2)}")
        return report

    def _upload_source_files(self, source_dir, prefix):
        """Upload source files to the input bucket."""
        bucket = self.storage_client.bucket(self.input_bucket)

        for filename in os.listdir(source_dir):
            if filename.endswith((".txt", ".html")):
                blob = bucket.blob(f"{prefix}{filename}")
                blob.upload_from_filename(os.path.join(source_dir, filename))
                print(f"  Uploaded: {filename}")

    def _run_translation(self, input_uri, output_uri, source_lang, target_langs, glossary_id):
        """Execute the batch translation."""
        parent = f"projects/{self.project_id}/locations/{self.location}"

        request = {
            "parent": parent,
            "source_language_code": source_lang,
            "target_language_codes": target_langs,
            "input_configs": [
                translate.InputConfig(
                    gcs_source=translate.GcsSource(input_uri=input_uri),
                    mime_type="text/plain",
                )
            ],
            "output_config": translate.OutputConfig(
                gcs_destination=translate.GcsDestination(
                    output_uri_prefix=output_uri
                )
            ),
        }

        if glossary_id:
            glossary_path = f"{parent}/glossaries/{glossary_id}"
            request["glossaries"] = {
                lang: translate.TranslateTextGlossaryConfig(glossary=glossary_path)
                for lang in target_langs
            }

        operation = self.translate_client.batch_translate_text(request=request)
        print("  Translation in progress...")
        return operation.result(timeout=3600)

# Run the pipeline
pipeline = LocalizationPipeline(
    project_id="your-project-id",
    location="us-central1",
    input_bucket="your-translation-input",
    output_bucket="your-translation-output",
)

pipeline.run(
    source_dir="/path/to/content",
    source_lang="en",
    target_langs=["es", "fr", "de", "ja", "ko"],
    glossary_id="tech-terms-multilingual",
)
```

## Wrapping Up

Batch translation through Cloud Storage is the most efficient way to handle large-scale content localization on GCP. It eliminates the overhead of individual API calls, supports multiple target languages in a single job, and integrates cleanly with glossaries for consistent terminology. For any localization workflow that involves more than a handful of documents, batch translation is the way to go.

For monitoring your batch translation jobs and ensuring your localization pipeline runs on schedule, [OneUptime](https://oneuptime.com) provides monitoring and alerting that helps you keep your multilingual content delivery reliable.
