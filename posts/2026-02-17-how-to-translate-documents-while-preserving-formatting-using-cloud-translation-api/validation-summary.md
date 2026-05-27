# Validation Summary: How to Translate Documents While Preserving Formatting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Translation API Advanced
- Cloud Translation document translation
- Cloud Storage document input and output
- Cloud Translation glossaries
- Python Google Cloud Translation client library
- PDF, DOC, DOCX, PPT, PPTX, XLS, and XLSX document formats

## Sources Consulted
- Google Cloud Translation documentation: Translate documents: https://docs.cloud.google.com/translate/docs/advanced/translate-documents
- Google Cloud Translation documentation: Supported formats quick reference: https://docs.cloud.google.com/translate/docs/supported-formats
- Google Cloud Python client documentation: TranslationServiceClient translate_document and batch_translate_document: https://cloud.google.com/python/docs/reference/translate/latest/google.cloud.translate_v3.services.translation_service.TranslationServiceClient
- Google Cloud Python client documentation: TranslateDocumentRequest fields: https://docs.cloud.google.com/python/docs/reference/translate/latest/google.cloud.translate_v3beta1.types.TranslateDocumentRequest
- Google Cloud Python client documentation: DocumentInputConfig fields and supported MIME types: https://docs.cloud.google.com/python/docs/reference/translate/latest/google.cloud.translate_v3.types.DocumentInputConfig
- Google Cloud Translation documentation: DocumentOutputConfig behavior: https://docs.cloud.google.com/python/docs/reference/translate/latest/google.cloud.translate_v3beta1.types.DocumentOutputConfig

## Issues Found
- The post said scanned PDFs are not supported. Google Cloud Translation now documents support for scanned PDFs, with lower page limits and more formatting loss than native PDFs. Updated the supported-format description and PDF tips accordingly.
- The supported format list omitted legacy Office formats DOC, PPT, and XLS, which are listed in Google Cloud's supported formats. Added them to the format overview and MIME-type maps.
- The Cloud Storage example did not handle XLSX and would default an XLSX file to `application/pdf`. Replaced the conditional MIME detection with the same extension-to-MIME map used elsewhere.
- The glossary example omitted XLSX and would default an XLSX file to `application/pdf`. Added XLSX and legacy Office MIME types.
- The batch loop only selected PDF, DOCX, PPTX, and XLSX files. Updated it to include DOC, PPT, and XLS as supported inputs.
- The PDF tips used a single `max_pages` value of 300. Google documents 300 pages for online native PDF translation only when `is_translate_native_pdf_only` is true, and 20 pages for scanned PDFs. Split the values into native and scanned PDF limits.
- The DOCX tips implied text boxes were generally safe. Google documents that content inside text boxes is not translated for DOC/DOCX, so added a caveat.
- The XLSX tips claimed number formats follow the target locale. I could not verify that behavior in official documentation, so changed it to a manual-review caveat.
- The wrap-up claimed formatting is preserved without qualification. Updated it to "preserving much of the original formatting," matching Google's documented wording more closely.

## Review Notes
The examples use the current `google.cloud.translate_v3` Python client surface, including `TranslationServiceClient.translate_document`, `DocumentInputConfig`, `DocumentOutputConfig`, `GcsSource`, `GcsDestination`, and `TranslateTextGlossaryConfig`. The section titled "Batch Document Translation" demonstrates looping over synchronous `translate_document` calls rather than using the Cloud Translation `batch_translate_document` long-running API; this is technically valid for small local batches, but a future revision could rename the section or add the official batch API for larger Cloud Storage workloads.
