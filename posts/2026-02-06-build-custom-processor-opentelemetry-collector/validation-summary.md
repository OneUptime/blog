# Validation Summary: How to Build a Custom Processor for the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector processors
- OpenTelemetry Collector Builder (OCB)
- Go
- pdata APIs for traces, metrics, and logs
- Collector YAML configuration

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Builder documentation: https://opentelemetry.io/docs/collector/extend/ocb/
- OpenTelemetry Collector Builder README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/cmd/builder/README.md
- Collector processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor
- Collector debug exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/debugexporter
- Current Collector contrib processor source examples, including attributesprocessor and redactionprocessor: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor

## Issues Found
- The factory snippet passed a raw string to `processor.NewFactory`. Updated it to use `component.MustNewType("custom")`, matching current Collector factory APIs.
- The processor snippets used the outdated `processor.CreateSettings` type. Updated the factory, processor structs, constructors, tests, and advanced snippets to use `processor.Settings`.
- The tests used `processortest.NewNopCreateSettings()`, which is no longer current. Updated them to `processortest.NewNopSettings(processorType)`.
- The traces processor removed spans by matching `SpanID`, which can remove the wrong spans when IDs are duplicated or unset. Updated the snippet to use `RemoveIf` directly with the duration predicate.
- The traces processor removed empty resources by comparing a non-standard `resource.id` attribute, which could remove the wrong resources. Updated it to remove resources directly with `resourceSpans.RemoveIf(p.isResourceEmpty)`.
- The duration filter could treat spans with invalid timestamp ordering as huge durations because pdata timestamps are unsigned. Added an end-before-start check.
- The metrics and logs processors claimed to apply sampling but returned `true` for sampling rates below 100. Added the same random sampling logic used by the traces processor.
- The logs processor used a handwritten substring helper. Replaced it with `strings.Contains` to avoid unnecessary custom string logic.
- The OCB snippet used older Collector `v0.95.0` components and `loggingexporter`. Updated the example to current `v0.153.0` component versions, replaced `loggingexporter` with `debugexporter`, and added the standard config providers shown in current OCB documentation.
- The Collector config snippet used the old `logging` exporter and `loglevel` field. Updated it to the `debug` exporter with `verbosity: normal`.

## Review Notes
The post is technically relevant and salvageable. I could not run `go test` locally because the `go` binary is not installed in this workspace, so validation was performed against official documentation and current OpenTelemetry Collector source examples rather than local compilation.
