# Validation Summary: How to Monitor Medical Imaging Transfer and Rendering Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript SDK
- DICOM DIMSE services: C-STORE, C-FIND, C-MOVE, C-GET
- DICOMweb WADO-RS
- pydicom
- pynetdicom
- PACS medical imaging workflows

## Sources Consulted
- pynetdicom C-STORE handler documentation: https://pydicom.github.io/pynetdicom/dev/reference/generated/pynetdicom._handlers.doc_handle_store.html
- pynetdicom Event documentation: https://pydicom.github.io/pynetdicom/stable/reference/generated/pynetdicom.events.Event.html
- pynetdicom C-FIND handler documentation: https://pydicom.github.io/pynetdicom/dev/reference/generated/pynetdicom._handlers.doc_handle_find.html
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript WebTracerProvider API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-web.WebTracerProvider.html
- DICOMweb WADO-RS overview: https://www.dicomstandard.org/using/dicomweb/retrieve-wado-rs-and-wado-uri/
- DICOM PS3.18 Web Services: https://dicom.nema.org/medical/DICOM/2021b/output/html/part18.html
- DICOM PS3.15 Retain UIDs Option: https://dicom.nema.org/medical/dicom/current/output/chtml/part15/sect_e.3.9.html

## Issues Found
- The C-STORE snippet said the exported DICOM metadata attributes were not PHI. This was too broad for Study/Series UIDs, which can be sensitive operational identifiers depending on policy and de-identification context. Changed the comment to warn readers to confirm their privacy policy before exporting instance-specific UIDs.
- The C-STORE size calculation used `event.request.DataSet.getvalue()`. Updated it to `event.encoded_dataset(include_meta=False)`, which is the documented pynetdicom API for accessing the encoded C-STORE dataset bytes.
- The browser OpenTelemetry setup used `provider.addSpanProcessor(...)`, but current OpenTelemetry JS WebTracerProvider API configures processors through the `spanProcessors` constructor option. Updated the snippet accordingly.
- The browser snippet created child spans with `startSpan`, which would not make them children of the study-load span unless context was explicitly propagated. Updated the example to use `startActiveSpan` for the load, fetch, and render spans.
- The browser snippet used numeric span status code `2`. Updated it to import and use `SpanStatusCode.ERROR`, matching OpenTelemetry JS documentation.
- The browser snippet set `dicom.total_load_ms` to `performance.now()`, which is a timestamp relative to the page time origin rather than elapsed load duration. Added a `loadStart` timestamp and recorded elapsed milliseconds.
- The viewer snippet counted WADO-RS study metadata array length as a series count. Study metadata returns instance metadata, so the attribute was corrected to `dicom.instance_count`.
- The viewer snippet fetched `/studies/{study}/series/{series}/instances` as if it were the WADO-RS pixel data retrieval endpoint. Updated it to fetch `/studies/{study}/series/{series}` with an `Accept: multipart/related; type="application/dicom"` header, matching WADO-RS series retrieval.

## Review Notes
- The Python and JavaScript examples now pass syntax checks. The snippets still assume application-specific functions such as `archive_image`, `query_dicom_index`, and `renderDicomImages` exist.
- The KPI thresholds are reasonable operational targets but not DICOM or OpenTelemetry standard requirements; teams should tune them to modality, network, archive, and viewer expectations.
