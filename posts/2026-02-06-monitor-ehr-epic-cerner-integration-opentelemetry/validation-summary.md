# Validation Summary: How to Monitor EHR System Integration Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector custom receivers
- OpenTelemetry Go Collector pdata APIs
- OpenTelemetry Python metrics API and OTLP metric exporter
- HL7 FHIR R4 APIs
- Epic on FHIR
- Oracle Health Millennium / Cerner FHIR APIs
- Mirth Connect / NextGen Connect Integration Engine REST API
- YAML OpenTelemetry Collector configuration

## Sources Consulted
- OpenTelemetry Collector custom receiver documentation: https://opentelemetry.io/docs/collector/extend/custom-component/receiver/
- OpenTelemetry Collector receiver package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/receiver
- OpenTelemetry Collector pmetric package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/pdata/pmetric
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python SDK metrics source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/metrics/_internal.html
- OpenTelemetry Python metric instrument source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/metrics/_internal/instrument.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- HL7 FHIR R4 CapabilityStatement documentation: https://hl7.org/fhir/r4/capabilitystatement.html
- Epic on FHIR documentation: https://fhir.epic.com/Documentation
- Oracle Health Millennium FHIR R4 overview: https://docs.oracle.com/en/industries/health/millennium-platform-apis/mfrap/r4_overview.html
- Oracle Health Millennium FHIR R4 metadata endpoint documentation: https://docs.oracle.com/en/industries/health/millennium-platform-apis/mfrap/op-metadata-get.html
- Mirth Connect user guide: https://downloads.mirthcorp.com/connect-user-guide/latest/mirth-connect-user-guide.pdf

## Issues Found
- The Go receiver snippet imported `receiver` without using it and used `pmetric.Timestamp`, which is not the correct timestamp type for pdata metric datapoints. Replaced the unused import with `pcommon` and changed the datapoint timestamp to `pcommon.Timestamp`, matching the current Collector pdata API.
- The custom receiver showed `Start` but did not show `Shutdown`, which Collector receiver components inherit from `component.Component`. Added a `Shutdown` method that cancels the polling loop.
- The FHIR HTTP check used `http.Client.Get`, which did not attach the request context or a FHIR JSON `Accept` header. Changed it to build a request with `http.NewRequestWithContext` and set `Accept: application/fhir+json`.
- The Go snippet marked every successful HTTP transport response as `ehr.status = ok`, including 4xx and 5xx API responses. Updated it to mark HTTP status codes 400 and above as `error`.
- The Python Mirth example used an `UpDownCounter` to record queue depth as an absolute current value. Replaced it with a synchronous Gauge and `set`, which matches the OpenTelemetry Python API for non-additive current values.
- The Python Mirth counters added cumulative channel totals on every poll, which would overcount. Added `previous_totals` tracking and record only deltas for processed and errored message counters.
- The Python Mirth request lacked a timeout and status check. Added `timeout=10` and `raise_for_status()`.
- Removed an unused Python `time` import.

## Review Notes
- The Collector YAML structure follows the documented receiver, processor, exporter, and service pipeline layout. The `epic` and `cerner` receiver names assume those custom receivers have been compiled into the Collector distribution.
- The Epic and Oracle Health / Cerner FHIR URL patterns are plausible examples, but production endpoints, authorization requirements, supported resources, and query parameters vary by tenant and implementation.
- The Mirth Connect REST API authentication model can vary by deployment and version; the example assumes a Bearer token-compatible setup.
