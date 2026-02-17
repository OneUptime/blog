# How to Create and Use Glossaries in Cloud Translation Advanced for Domain-Specific Terms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Translation, Glossaries, Translation API, Localization

Description: Learn how to create and use glossaries in Google Cloud Translation Advanced API to ensure consistent, accurate translations of domain-specific terminology.

---

Machine translation is great at general-purpose text, but it consistently gets domain-specific terminology wrong. Your product name "CloudGuard" might get translated to a local language equivalent. The technical term "endpoint" might become "final point" in Spanish. Medical terms, legal jargon, and branded phrases all suffer from the same problem.

Glossaries in Cloud Translation Advanced (v3) solve this by letting you define exactly how specific terms should be translated - or not translated - across languages. When the API encounters a glossary term, it uses your specified translation instead of its own judgment.

## How Glossaries Work

A glossary is a lookup table that maps terms from one language to another. When you make a translation request with a glossary attached, the API:

1. Translates the full text normally
2. Scans the result for any terms that appear in your glossary
3. Replaces those translations with your glossary definitions
4. Returns the modified translation

You can create two types of glossaries:

**Unidirectional**: Maps terms from one source language to one target language. Good when you always translate in one direction.

**Equivalent term sets**: Maps the same concept across multiple languages simultaneously. Better for multilingual applications where you translate to many languages.

## Setting Up

Enable the Translation API v3 and install the library:

```bash
# Enable the Translation API
gcloud services enable translate.googleapis.com

# Install the Python client (v3 is included in the standard package)
pip install google-cloud-translate

# Create a GCS bucket for glossary files
gsutil mb -l us-central1 gs://your-glossary-bucket
```

## Creating a Glossary File

Glossaries are defined in CSV or TSV files stored in Cloud Storage. Here is the format for a unidirectional glossary (English to Spanish):

```python
# First, create the glossary CSV file
glossary_content = """en,es
OneUptime,OneUptime
endpoint,punto de enlace
dashboard,panel de control
uptime,tiempo de actividad
downtime,tiempo de inactividad
incident,incidente
alert,alerta
monitor,monitor
status page,pagina de estado
webhook,webhook
SLA,SLA
API key,clave API
throughput,rendimiento
latency,latencia
"""

# Write the CSV file locally
with open("/tmp/glossary_en_es.csv", "w") as f:
    f.write(glossary_content)

# Upload to Cloud Storage
import subprocess
subprocess.run([
    "gsutil", "cp", "/tmp/glossary_en_es.csv",
    "gs://your-glossary-bucket/glossaries/en_es.csv"
])
```

For an equivalent term set (multilingual), use this format:

```python
# Multilingual glossary - each row maps the same concept across languages
multilingual_glossary = """en,es,fr,de,ja
OneUptime,OneUptime,OneUptime,OneUptime,OneUptime
dashboard,panel de control,tableau de bord,Dashboard,ダッシュボード
endpoint,punto de enlace,point de terminaison,Endpunkt,エンドポイント
webhook,webhook,webhook,Webhook,Webhook
monitor,monitor,moniteur,Monitor,モニター
uptime,tiempo de actividad,temps de disponibilite,Verfuegbarkeit,アップタイム
"""

with open("/tmp/glossary_multilingual.csv", "w") as f:
    f.write(multilingual_glossary)
```

## Creating a Glossary Resource

After uploading your CSV to Cloud Storage, create a glossary resource in the Translation API:

```python
from google.cloud import translate_v3 as translate

def create_glossary(project_id, location, glossary_id, gcs_uri, source_lang, target_lang):
    """Create a unidirectional glossary from a CSV file in GCS."""
    client = translate.TranslationServiceClient()

    parent = f"projects/{project_id}/locations/{location}"
    glossary_name = f"{parent}/glossaries/{glossary_id}"

    # Define the glossary with language pair
    glossary = translate.Glossary(
        name=glossary_name,
        language_pair=translate.Glossary.LanguageCodePair(
            source_language_code=source_lang,
            target_language_code=target_lang,
        ),
        input_config=translate.GlossaryInputConfig(
            gcs_source=translate.GcsSource(input_uri=gcs_uri)
        ),
    )

    # Create the glossary (long-running operation)
    operation = client.create_glossary(
        parent=parent,
        glossary=glossary,
    )

    print("Creating glossary...")
    result = operation.result(timeout=300)
    print(f"Glossary created: {result.name}")
    print(f"Entry count: {result.entry_count}")

    return result

# Create the English to Spanish glossary
create_glossary(
    project_id="your-project-id",
    location="us-central1",
    glossary_id="en-es-tech-terms",
    gcs_uri="gs://your-glossary-bucket/glossaries/en_es.csv",
    source_lang="en",
    target_lang="es",
)
```

For a multilingual equivalent term set glossary:

```python
from google.cloud import translate_v3 as translate

def create_multilingual_glossary(project_id, location, glossary_id, gcs_uri, language_codes):
    """Create a multilingual glossary with equivalent term sets."""
    client = translate.TranslationServiceClient()

    parent = f"projects/{project_id}/locations/{location}"
    glossary_name = f"{parent}/glossaries/{glossary_id}"

    # Use language_codes_set for multilingual glossaries
    glossary = translate.Glossary(
        name=glossary_name,
        language_codes_set=translate.Glossary.LanguageCodesSet(
            language_codes=language_codes
        ),
        input_config=translate.GlossaryInputConfig(
            gcs_source=translate.GcsSource(input_uri=gcs_uri)
        ),
    )

    operation = client.create_glossary(
        parent=parent,
        glossary=glossary,
    )

    print("Creating multilingual glossary...")
    result = operation.result(timeout=300)
    print(f"Glossary created: {result.name}")
    print(f"Entry count: {result.entry_count}")

    return result

create_multilingual_glossary(
    project_id="your-project-id",
    location="us-central1",
    glossary_id="tech-terms-multilingual",
    gcs_uri="gs://your-glossary-bucket/glossaries/multilingual.csv",
    language_codes=["en", "es", "fr", "de", "ja"],
)
```

## Translating with a Glossary

Now use the glossary in your translation requests:

```python
from google.cloud import translate_v3 as translate

def translate_with_glossary(project_id, location, text, source_lang, target_lang, glossary_id):
    """Translate text using a glossary for domain-specific terms."""
    client = translate.TranslationServiceClient()

    parent = f"projects/{project_id}/locations/{location}"
    glossary_path = f"{parent}/glossaries/{glossary_id}"

    # Configure the glossary
    glossary_config = translate.TranslateTextGlossaryConfig(
        glossary=glossary_path,
    )

    # Make the translation request with the glossary
    response = client.translate_text(
        request={
            "parent": parent,
            "contents": [text],
            "mime_type": "text/plain",
            "source_language_code": source_lang,
            "target_language_code": target_lang,
            "glossary_config": glossary_config,
        }
    )

    # The response includes both regular and glossary-applied translations
    for translation in response.translations:
        print(f"Standard:  {translation.translated_text}")

    for translation in response.glossary_translations:
        print(f"Glossary:  {translation.translated_text}")

    return response

# Translate with the glossary
translate_with_glossary(
    project_id="your-project-id",
    location="us-central1",
    text="Check the dashboard for endpoint latency and uptime metrics.",
    source_lang="en",
    target_lang="es",
    glossary_id="en-es-tech-terms",
)
```

## Managing Glossaries

List, get, and delete glossaries:

```python
from google.cloud import translate_v3 as translate

def list_glossaries(project_id, location):
    """List all glossaries in a project."""
    client = translate.TranslationServiceClient()
    parent = f"projects/{project_id}/locations/{location}"

    glossaries = client.list_glossaries(parent=parent)

    for glossary in glossaries:
        print(f"Name: {glossary.name}")
        print(f"  Entry count: {glossary.entry_count}")

        if glossary.language_pair.source_language_code:
            print(f"  Source: {glossary.language_pair.source_language_code}")
            print(f"  Target: {glossary.language_pair.target_language_code}")

        if glossary.language_codes_set.language_codes:
            print(f"  Languages: {list(glossary.language_codes_set.language_codes)}")
        print()

def delete_glossary(project_id, location, glossary_id):
    """Delete a glossary."""
    client = translate.TranslationServiceClient()
    glossary_path = f"projects/{project_id}/locations/{location}/glossaries/{glossary_id}"

    operation = client.delete_glossary(name=glossary_path)
    result = operation.result(timeout=300)
    print(f"Deleted glossary: {result.name}")

# List all glossaries
list_glossaries("your-project-id", "us-central1")
```

## Updating a Glossary

The API does not support in-place updates. To update a glossary, you need to delete it and recreate it:

```python
def update_glossary(project_id, location, glossary_id, new_gcs_uri, source_lang, target_lang):
    """Update a glossary by deleting and recreating it."""
    client = translate.TranslationServiceClient()
    glossary_path = f"projects/{project_id}/locations/{location}/glossaries/{glossary_id}"

    # Delete the existing glossary
    print(f"Deleting old glossary: {glossary_id}")
    try:
        operation = client.delete_glossary(name=glossary_path)
        operation.result(timeout=300)
        print("Old glossary deleted")
    except Exception as e:
        print(f"Delete failed (may not exist): {e}")

    # Create the new glossary
    print(f"Creating new glossary: {glossary_id}")
    create_glossary(project_id, location, glossary_id, new_gcs_uri, source_lang, target_lang)
    print("Glossary updated")
```

## Best Practices for Glossary Management

Here is what I have found works well:

- Keep glossary entries focused. Include product names, technical terms, and domain jargon, but do not add common words.
- Include terms that should not be translated (like brand names) by mapping them to themselves.
- Test your glossary with real content before deploying. Sometimes glossary replacements create grammatically awkward results.
- Version your glossary files in source control alongside your application code.
- Keep separate glossaries for different domains or product lines rather than one giant glossary.
- Review and update glossaries regularly as your product terminology evolves.

## Wrapping Up

Glossaries are essential for professional-quality machine translation in specialized domains. They ensure that your product names stay consistent, technical terms get translated correctly, and branded phrases remain intact across languages. The setup requires a bit more work than basic translation, but the improvement in translation quality is significant.

For monitoring the reliability of your translation services and tracking API performance, [OneUptime](https://oneuptime.com) provides uptime monitoring that helps you maintain a consistent multilingual experience for your users.
