# How to Translate Documents While Preserving Formatting Using Cloud Translation API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Translation, Document Translation, PDF Translation, Localization

Description: Learn how to translate entire documents while preserving their original formatting using Google Cloud Translation API document translation feature.

---

Translating documents is not just about converting text from one language to another. You need the translated output to look like the original - same layout, same fonts, same images, same tables. If you extract the text, translate it, and try to reassemble the document, you end up spending more time on formatting than on the actual translation.

Cloud Translation API's document translation feature handles this by processing entire documents and preserving their formatting. It supports PDF, DOCX, PPTX, and XLSX files, translating the text content while keeping the layout intact. Let me show you how to use it.

## Supported Document Formats

The document translation feature supports:

- **PDF**: Scanned PDFs are not supported, only PDFs with selectable text
- **DOCX**: Microsoft Word documents
- **PPTX**: Microsoft PowerPoint presentations
- **XLSX**: Microsoft Excel spreadsheets

The output is a translated document in the same format as the input. A DOCX in, DOCX out. A PDF in, PDF out.

## Basic Document Translation

Here is how to translate a document stored locally:

```python
from google.cloud import translate_v3 as translate

def translate_document(project_id, location, input_path, output_path, source_lang, target_lang):
    """Translate a document while preserving its formatting."""
    client = translate.TranslationServiceClient()

    parent = f"projects/{project_id}/locations/{location}"

    # Read the document
    with open(input_path, "rb") as f:
        document_content = f.read()

    # Determine MIME type based on file extension
    mime_types = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }

    extension = "." + input_path.rsplit(".", 1)[-1].lower()
    mime_type = mime_types.get(extension, "application/pdf")

    # Create the document input config
    document_input_config = translate.DocumentInputConfig(
        content=document_content,
        mime_type=mime_type,
    )

    # Make the translation request
    response = client.translate_document(
        request={
            "parent": parent,
            "source_language_code": source_lang,
            "target_language_code": target_lang,
            "document_input_config": document_input_config,
        }
    )

    # Write the translated document
    translated_content = response.document_translation.byte_stream_outputs[0]

    with open(output_path, "wb") as f:
        f.write(translated_content)

    print(f"Translated document saved to: {output_path}")
    print(f"Detected source language: {response.document_translation.detected_language_code}")

    return response

# Translate a PDF from English to Spanish
translate_document(
    project_id="your-project-id",
    location="us-central1",
    input_path="report_en.pdf",
    output_path="report_es.pdf",
    source_lang="en",
    target_lang="es",
)
```

## Translating Documents from Cloud Storage

For larger documents or server-side processing, use Cloud Storage:

```python
from google.cloud import translate_v3 as translate

def translate_document_gcs(project_id, location, input_gcs_uri, output_gcs_uri, source_lang, target_lang):
    """Translate a document from Cloud Storage and save the result there too."""
    client = translate.TranslationServiceClient()

    parent = f"projects/{project_id}/locations/{location}"

    # Determine MIME type from the file extension
    if input_gcs_uri.endswith(".pdf"):
        mime_type = "application/pdf"
    elif input_gcs_uri.endswith(".docx"):
        mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif input_gcs_uri.endswith(".pptx"):
        mime_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    else:
        mime_type = "application/pdf"

    # Configure input from GCS
    document_input_config = translate.DocumentInputConfig(
        gcs_source=translate.GcsSource(input_uri=input_gcs_uri),
        mime_type=mime_type,
    )

    # Configure output to GCS
    document_output_config = translate.DocumentOutputConfig(
        gcs_destination=translate.GcsDestination(output_uri_prefix=output_gcs_uri),
        mime_type=mime_type,
    )

    response = client.translate_document(
        request={
            "parent": parent,
            "source_language_code": source_lang,
            "target_language_code": target_lang,
            "document_input_config": document_input_config,
            "document_output_config": document_output_config,
        }
    )

    print(f"Document translated and saved to: {output_gcs_uri}")
    return response

# Translate a document stored in GCS
translate_document_gcs(
    project_id="your-project-id",
    location="us-central1",
    input_gcs_uri="gs://your-bucket/documents/report.pdf",
    output_gcs_uri="gs://your-bucket/translations/es/",
    source_lang="en",
    target_lang="es",
)
```

## Translating with a Glossary

Apply a glossary to maintain consistent terminology in document translations:

```python
from google.cloud import translate_v3 as translate

def translate_document_with_glossary(
    project_id, location, input_path, output_path,
    source_lang, target_lang, glossary_id
):
    """Translate a document using a glossary for consistent terminology."""
    client = translate.TranslationServiceClient()

    parent = f"projects/{project_id}/locations/{location}"
    glossary_path = f"{parent}/glossaries/{glossary_id}"

    with open(input_path, "rb") as f:
        content = f.read()

    extension = "." + input_path.rsplit(".", 1)[-1].lower()
    mime_types = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }
    mime_type = mime_types.get(extension, "application/pdf")

    document_input_config = translate.DocumentInputConfig(
        content=content,
        mime_type=mime_type,
    )

    # Configure the glossary
    glossary_config = translate.TranslateTextGlossaryConfig(
        glossary=glossary_path,
    )

    response = client.translate_document(
        request={
            "parent": parent,
            "source_language_code": source_lang,
            "target_language_code": target_lang,
            "document_input_config": document_input_config,
            "glossary_config": glossary_config,
        }
    )

    # The glossary translation may be in glossary_document_translation
    if response.glossary_document_translation.byte_stream_outputs:
        translated = response.glossary_document_translation.byte_stream_outputs[0]
    else:
        translated = response.document_translation.byte_stream_outputs[0]

    with open(output_path, "wb") as f:
        f.write(translated)

    print(f"Translated with glossary: {output_path}")
    return response
```

## Batch Document Translation

When you have multiple documents to translate, process them in a loop with proper error handling:

```python
from google.cloud import translate_v3 as translate
import os

def batch_translate_documents(
    project_id, location, input_dir, output_dir,
    source_lang, target_langs
):
    """Translate multiple documents to multiple languages."""
    client = translate.TranslationServiceClient()
    parent = f"projects/{project_id}/locations/{location}"

    # Find all translatable documents
    supported_extensions = (".pdf", ".docx", ".pptx", ".xlsx")
    documents = [
        f for f in os.listdir(input_dir)
        if f.lower().endswith(supported_extensions)
    ]

    print(f"Found {len(documents)} documents to translate")

    results = []

    for doc_name in documents:
        input_path = os.path.join(input_dir, doc_name)

        with open(input_path, "rb") as f:
            content = f.read()

        extension = "." + doc_name.rsplit(".", 1)[-1].lower()
        mime_types = {
            ".pdf": "application/pdf",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
        mime_type = mime_types.get(extension, "application/pdf")

        for target_lang in target_langs:
            # Create language-specific output directory
            lang_dir = os.path.join(output_dir, target_lang)
            os.makedirs(lang_dir, exist_ok=True)

            output_path = os.path.join(lang_dir, doc_name)

            try:
                document_input_config = translate.DocumentInputConfig(
                    content=content,
                    mime_type=mime_type,
                )

                response = client.translate_document(
                    request={
                        "parent": parent,
                        "source_language_code": source_lang,
                        "target_language_code": target_lang,
                        "document_input_config": document_input_config,
                    }
                )

                translated = response.document_translation.byte_stream_outputs[0]

                with open(output_path, "wb") as f:
                    f.write(translated)

                results.append({
                    "document": doc_name,
                    "language": target_lang,
                    "status": "success",
                    "output": output_path,
                })
                print(f"  Translated {doc_name} -> {target_lang}")

            except Exception as e:
                results.append({
                    "document": doc_name,
                    "language": target_lang,
                    "status": "error",
                    "error": str(e),
                })
                print(f"  Failed {doc_name} -> {target_lang}: {e}")

    # Print summary
    success = sum(1 for r in results if r["status"] == "success")
    failed = sum(1 for r in results if r["status"] == "error")
    print(f"\nComplete: {success} successful, {failed} failed")

    return results

# Translate all documents in a directory
batch_translate_documents(
    project_id="your-project-id",
    location="us-central1",
    input_dir="/path/to/documents",
    output_dir="/path/to/translations",
    source_lang="en",
    target_langs=["es", "fr", "de"],
)
```

## Handling Different Document Types

Each document type has specific considerations:

```python
def get_translation_tips(file_extension):
    """Return tips for translating specific document types."""
    tips = {
        ".pdf": {
            "notes": [
                "Only PDFs with selectable text are supported",
                "Scanned PDFs need OCR first (use Vision API)",
                "Complex layouts may have minor formatting shifts",
                "Embedded fonts may be substituted",
            ],
            "max_pages": 300,
        },
        ".docx": {
            "notes": [
                "Headers, footers, and footnotes are translated",
                "Tables and text boxes are preserved",
                "Track changes may cause issues - accept all changes first",
                "Embedded images are kept but not translated",
            ],
            "max_size_mb": 20,
        },
        ".pptx": {
            "notes": [
                "Slide layouts and themes are preserved",
                "Speaker notes are translated",
                "Charts may need manual adjustment",
                "Animations and transitions are kept",
            ],
            "max_size_mb": 20,
        },
        ".xlsx": {
            "notes": [
                "Formulas are preserved but cell references stay the same",
                "Sheet names are translated",
                "Charts and pivot tables may need review",
                "Number formats follow the target locale",
            ],
            "max_size_mb": 20,
        },
    }

    return tips.get(file_extension.lower(), {"notes": ["Unknown format"], "max_size_mb": 10})
```

## Quality Assurance Tips

A few things to keep in mind for production document translation:

- Always review translated documents before publishing. Machine translation quality varies by language pair and content complexity.
- Tables and structured content translate better than free-form text with complex formatting.
- Right-to-left languages (Arabic, Hebrew) may need layout adjustments in PDFs.
- Very large documents may hit API limits. Split them into smaller sections if needed.
- Keep a feedback loop - track which translations need manual corrections and use that data to improve your glossary.

## Wrapping Up

Document translation in Cloud Translation API saves enormous amounts of time compared to extracting text, translating it, and reformatting it manually. The ability to process PDFs, Word documents, PowerPoint presentations, and Excel spreadsheets while preserving formatting makes it practical for real-world document localization workflows.

For monitoring the health of your document translation pipeline and tracking job success rates, [OneUptime](https://oneuptime.com) provides the monitoring tools you need to keep your localization infrastructure running smoothly.
