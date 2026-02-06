# How to Monitor Medical Imaging (DICOM/PACS) Transfer and Rendering Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, DICOM, PACS, Medical Imaging

Description: Monitor DICOM image transfers and PACS rendering performance with OpenTelemetry to ensure radiologists get images without delays.

Medical imaging generates some of the largest data volumes in healthcare. A single CT scan can produce hundreds of DICOM images, each several megabytes. These images flow from the modality (CT scanner, MRI machine) through the PACS (Picture Archiving and Communication System) to the radiologist's workstation. Delays at any point in this chain mean radiologists are waiting for images, and in emergency situations, those delays can impact patient outcomes.

This post covers instrumenting the DICOM image transfer and rendering pipeline with OpenTelemetry to measure performance at every stage.

## Understanding the DICOM Transfer Pipeline

The flow starts at the imaging modality, which performs a DICOM C-STORE operation to send images to the PACS server. The PACS archives the images and makes them available for retrieval via C-FIND (search) and C-MOVE/C-GET (retrieve) operations. A viewer application then fetches and renders the images for the radiologist.

Each DICOM operation (C-STORE, C-FIND, C-MOVE, C-GET) can be traced as a distinct span.

## Instrumenting DICOM C-STORE (Image Ingestion)

Here is how to wrap the DICOM C-STORE handler on your PACS server using pydicom and pynetdicom:

```python
from pynetdicom import AE, evt
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import time

# Tracing setup
trace_provider = TracerProvider()
trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(trace_provider)
tracer = trace.get_tracer("pacs-server", "1.0.0")

# Metrics setup
metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter())
metrics.set_meter_provider(MeterProvider(metric_readers=[metric_reader]))
meter = metrics.get_meter("pacs-server", "1.0.0")

# Metrics instruments
store_latency = meter.create_histogram(
    "dicom.cstore.latency_ms",
    description="C-STORE operation latency in milliseconds",
    unit="ms",
)

store_size = meter.create_histogram(
    "dicom.cstore.image_size_bytes",
    description="Size of stored DICOM images",
    unit="bytes",
)

images_stored = meter.create_counter(
    "dicom.images_stored_total",
    description="Total DICOM images stored",
)

def handle_store(event):
    """Handle incoming DICOM C-STORE requests."""
    start = time.time()
    ds = event.dataset
    ds.file_meta = event.file_meta

    with tracer.start_as_current_span("dicom.cstore") as span:
        # DICOM metadata attributes (none of these are PHI)
        modality = str(ds.get("Modality", "UNKNOWN"))
        sop_class = str(ds.get("SOPClassUID", ""))
        study_uid = str(ds.get("StudyInstanceUID", ""))
        series_uid = str(ds.get("SeriesInstanceUID", ""))

        span.set_attribute("dicom.operation", "C-STORE")
        span.set_attribute("dicom.modality", modality)
        span.set_attribute("dicom.sop_class_uid", sop_class)
        span.set_attribute("dicom.study_instance_uid", study_uid)
        span.set_attribute("dicom.series_instance_uid", series_uid)

        # Calculate image size
        image_size = len(event.request.DataSet.getvalue())
        span.set_attribute("dicom.image_size_bytes", image_size)

        # Store the image
        with tracer.start_as_current_span("dicom.archive.write") as archive_span:
            archive_result = archive_image(ds)
            archive_span.set_attribute("dicom.archive.backend", "filesystem")
            archive_span.set_attribute("dicom.archive.success", archive_result["success"])

        duration_ms = (time.time() - start) * 1000
        attrs = {"dicom.modality": modality, "dicom.operation": "C-STORE"}

        store_latency.record(duration_ms, attrs)
        store_size.record(image_size, attrs)
        images_stored.add(1, attrs)

        return 0x0000  # Success status
```

## Instrumenting C-FIND (Study Search)

When a radiologist searches for a patient's imaging studies, the C-FIND operation runs. We trace the search and measure how long it takes:

```python
def handle_find(event):
    """Handle DICOM C-FIND requests (study/series/image level search)."""
    with tracer.start_as_current_span("dicom.cfind") as span:
        identifier = event.identifier

        # Determine query level
        query_level = str(identifier.get("QueryRetrieveLevel", "STUDY"))
        span.set_attribute("dicom.operation", "C-FIND")
        span.set_attribute("dicom.query_level", query_level)

        # Count the search criteria provided
        search_criteria_count = sum(
            1 for elem in identifier if elem.value and elem.keyword != "QueryRetrieveLevel"
        )
        span.set_attribute("dicom.cfind.criteria_count", search_criteria_count)

        # Log which modality is being searched for (if specified)
        if hasattr(identifier, "ModalitiesInStudy"):
            span.set_attribute("dicom.cfind.modality_filter",
                             str(identifier.ModalitiesInStudy))

        # Execute the search
        with tracer.start_as_current_span("dicom.cfind.db_query") as db_span:
            db_span.set_attribute("db.system", "postgresql")
            results = query_dicom_index(identifier)
            db_span.set_attribute("dicom.cfind.result_count", len(results))

        span.set_attribute("dicom.cfind.result_count", len(results))

        # Yield matching results
        for result in results:
            yield (0xFF00, result)  # Pending status with result
```

## Instrumenting Image Retrieval and Rendering

The viewer side is where radiologists feel the impact of slow transfers. Here is how to instrument a web-based DICOM viewer:

```javascript
// dicom-viewer-instrumentation.js
import { trace } from '@opentelemetry/api';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

const provider = new WebTracerProvider();
provider.addSpanProcessor(
  new BatchSpanProcessor(
    new OTLPTraceExporter({ url: '/v1/traces' })
  )
);
provider.register();

const viewerTracer = trace.getTracer('dicom-viewer', '1.0.0');

async function loadStudy(studyInstanceUID) {
  // Trace the full study loading process
  const span = viewerTracer.startSpan('dicom.viewer.load_study');
  span.setAttribute('dicom.study_instance_uid', studyInstanceUID);

  try {
    // Step 1: Fetch the study metadata via DICOMweb WADO-RS
    const metadataSpan = viewerTracer.startSpan('dicom.viewer.fetch_metadata');
    const metadata = await fetch(
      `/dicomweb/studies/${studyInstanceUID}/metadata`
    ).then((r) => r.json());
    metadataSpan.setAttribute('dicom.series_count', metadata.length);
    metadataSpan.end();

    // Step 2: Fetch pixel data for the first series
    const pixelSpan = viewerTracer.startSpan('dicom.viewer.fetch_pixels');
    const seriesUID = metadata[0]['0020000E'].Value[0];
    pixelSpan.setAttribute('dicom.series_instance_uid', seriesUID);

    const startFetch = performance.now();
    const pixelData = await fetch(
      `/dicomweb/studies/${studyInstanceUID}/series/${seriesUID}/instances`
    ).then((r) => r.arrayBuffer());

    const fetchDuration = performance.now() - startFetch;
    pixelSpan.setAttribute('dicom.fetch_duration_ms', fetchDuration);
    pixelSpan.setAttribute('dicom.pixel_data_size_bytes', pixelData.byteLength);
    pixelSpan.end();

    // Step 3: Render the images
    const renderSpan = viewerTracer.startSpan('dicom.viewer.render');
    const renderStart = performance.now();
    await renderDicomImages(pixelData);
    const renderDuration = performance.now() - renderStart;
    renderSpan.setAttribute('dicom.render_duration_ms', renderDuration);
    renderSpan.end();

    span.setAttribute('dicom.total_load_ms', performance.now());
  } catch (error) {
    span.setStatus({ code: 2, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

## Key Performance Indicators

For medical imaging, these are the numbers that matter:

- C-STORE latency: Images from the modality should be archived within 2 seconds per image
- C-FIND response time: Study searches should return results in under 1 second
- Study load time in the viewer: A radiologist opening a CT study should see the first image within 3 seconds
- Transfer throughput: Monitor bytes per second during bulk transfers to catch network bottlenecks

With OpenTelemetry tracing across the full DICOM pipeline, you can distinguish between a slow modality, a bottlenecked archive, a slow database index, and a network transfer problem. That granularity is what turns a vague "images are slow" complaint into an actionable fix.
