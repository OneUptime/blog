# Validation Summary: How to Instrument Broadway Message Processing with OpenTelemetry in Elixir

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Elixir
- Broadway
- BroadwayRabbitMQ
- OpenTelemetry Erlang/Elixir API
- OpenTelemetry OTLP exporter
- W3C Trace Context propagation
- Erlang/Elixir telemetry events

## Sources Consulted
- Broadway documentation: https://hexdocs.pm/broadway/Broadway.html
- Broadway architecture documentation: https://hexdocs.pm/broadway/architecture.html
- Broadway.Message documentation: https://hexdocs.pm/broadway/Broadway.Message.html
- BroadwayRabbitMQ.Producer documentation: https://hexdocs.pm/broadway_rabbitmq/BroadwayRabbitMQ.Producer.html
- OpenTelemetry.Tracer documentation: https://hexdocs.pm/opentelemetry_api/OpenTelemetry.Tracer.html
- OpenTelemetry.Ctx documentation: https://hexdocs.pm/opentelemetry_api/OpenTelemetry.Ctx.html
- OpenTelemetry Erlang/Elixir instrumentation guide: https://opentelemetry.io/docs/languages/erlang/instrumentation/
- OpenTelemetry Erlang/Elixir propagation guide: https://opentelemetry.io/docs/languages/erlang/propagation/
- OpenTelemetry exporter documentation: https://hexdocs.pm/opentelemetry_exporter/opentelemetry_exporter.html
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- The dependency list used `Jason.decode!/1` and `Jason.encode!/1` but did not include `:jason`; added `{:jason, "~> 1.4"}`.
- The OpenTelemetry config set the resource and exporter endpoint but did not configure the SDK to use the batch span processor and OTLP trace exporter; added `span_processor: :batch` and `traces_exporter: :otlp`.
- Several snippets used `message.acknowledger.ack_ref`, but Broadway acknowledgers are documented as `{module, ack_ref, data}` tuples; added small `ack_ref/1` helpers and updated attribute calls.
- The snippets used `Message.put_metadata/3`, which is not a Broadway.Message API; replaced those calls with explicit updates to the message struct's `metadata` map.
- Contexts were attached with `Ctx.attach/1` without detaching afterward; wrapped those sections with `try/after` and `Ctx.detach/1` to avoid leaking context in reused Broadway processes.
- Batch span linking used a non-existent `Tracer.add_link/1`; changed the examples to create `OpenTelemetry.link/1` values and pass them in the span start options.
- The notification `Task.async/1` work did not propagate the current OpenTelemetry context into new processes; added context attach/detach inside each task.
- The telemetry metrics snippet used non-documented `[:broadway, :batcher, :batch, ...]` events and direct `batch_size` metadata; updated it to Broadway's documented `[:broadway, :batch_processor, ...]` events and `batch_info` metadata.
- The Broadway test example passed a `%Broadway.Message{}` to `Broadway.test_message/3`, but the documented API accepts data and options; changed it to pass `message.data` with `metadata:`.
- The trace ID helper returned a placeholder atom; changed it to use `Tracer.current_span_ctx()` and `:otel_span.hex_trace_id/1`.
- The sampling example looked for `sampled=true` in `tracestate`; updated it to read the W3C `traceparent` trace flags sampled bit.
- The examples explicitly set successful spans to `:ok`; removed those calls because the OpenTelemetry Erlang instrumentation guide recommends leaving normal successful spans with the default unset status unless there is a specific reason to override it.

## Review Notes
- Local checks: `validation.json` was validated with `jq`. Elixir and Mix are not installed in this workspace, so the Elixir snippets could not be parsed or executed locally; validation relied on official documentation and static inspection.
- The test span lookup remains backend-specific by nature; a real project should replace the placeholder helper with its tracing backend or test span exporter.
