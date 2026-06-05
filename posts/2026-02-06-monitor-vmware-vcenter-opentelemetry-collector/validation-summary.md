# Validation Summary: How to Monitor VMware vCenter with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib vCenter receiver
- VMware vCenter / vSphere / ESXi
- OneUptime OpenTelemetry ingestion
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector contrib vCenter receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/vcenterreceiver
- OpenTelemetry Collector contrib vCenter receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/vcenterreceiver/documentation.md
- OpenTelemetry Collector contrib vCenter receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/vcenterreceiver/metadata.yaml
- OpenTelemetry Collector vCenter receiver package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/vcenterreceiver
- VMware vSphere Performance Data Collection documentation: https://vdc-download.vmware.com/vmwb-repository/dcr-public/5c1c7b8c-0d1b-4037-af84-5f43787eb378/fab98b61-56a7-4608-992f-818d3b40e4ae/GUID-481756FA-9F0B-4768-8E3B-EAFCEEC908B2.html
- VMware vCenter Server Performance Intervals documentation: https://vdc-download.vmware.com/vmwb-repository/dcr-public/cdbbd51c-4824-4a1b-ad43-45df55a76a76/8cb3ed93-cac2-46aa-b329-db5a096af5bc/doc/GUID-46697BA2-2886-4531-803E-6151A06BAC5E.html
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry

## Issues Found
- The prerequisites claimed vCenter Server 6.7 or later. The current OpenTelemetry contrib vCenter receiver documentation says it has been built to support ESXi and vCenter versions 7.0 and 8. Updated the prerequisite accordingly.
- The Collector configuration omitted `vcenter.vm.cpu.readiness` and stated that CPU ready time was not always exposed directly. The receiver documentation lists `vcenter.vm.cpu.readiness` as a default metric. Added it to the configuration and corrected the CPU contention explanation, dashboard notes, and alert example.
- The sample filter processor attempted to drop powered-off VMs using `resource.attributes["vcenter.vm.power_state"] == "poweredOff"`. The receiver metadata does not expose `vcenter.vm.power_state` as a per-VM resource attribute; power state is present on VM count metrics as a metric attribute with values such as `on`, `off`, `suspended`, and `unknown`. Removed the invalid filter configuration and replaced the explanation with a metric-volume recommendation.
- The primary exporter used a non-documented OneUptime OTLP gRPC-style endpoint and bearer authorization header. OneUptime documentation shows an `otlphttp` exporter to `https://oneuptime.com/otlp`, JSON encoding, and an `x-oneuptime-token` header. Updated the exporter configuration.
- The multi-vCenter example used one shared resource processor for multiple vCenter instances and referenced the removed filter processor. Updated it to use separate receiver instances, separate resource processors, separate pipelines, and the corrected `otlphttp` exporter.

## Review Notes
The vCenter receiver is still listed as alpha/development-stability for metrics in OpenTelemetry Collector contrib, so metric names and feature-gated behavior may change across Collector releases. The vCenter statistics-level discussion is broadly correct, and the receiver documentation notes that some disk latency and throughput metrics require performance counter level 2 to populate.
