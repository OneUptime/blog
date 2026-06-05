# Validation Summary: How to Trace GenServer and Task Processes with OpenTelemetry in Elixir

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elixir
- OTP GenServer
- Task and Task.Supervisor
- OpenTelemetry Erlang/Elixir API and SDK
- OTLP exporter configuration

## Sources Consulted
- OpenTelemetry Erlang/Elixir instrumentation docs: https://opentelemetry.io/docs/languages/erlang/instrumentation/
- OpenTelemetry API HexDocs for `OpenTelemetry.Tracer`: https://hexdocs.pm/opentelemetry_api/OpenTelemetry.Tracer.html
- OpenTelemetry API HexDocs for `OpenTelemetry.Ctx`: https://hexdocs.pm/opentelemetry_api/OpenTelemetry.Ctx.html
- OpenTelemetry SDK HexDocs: https://hexdocs.pm/opentelemetry/
- OpenTelemetry exporter HexDocs: https://hexdocs.pm/opentelemetry_exporter/
- Elixir GenServer HexDocs: https://hexdocs.pm/elixir/GenServer.html
- Elixir Task HexDocs: https://hexdocs.pm/elixir/Task.html
- Elixir Task.Supervisor HexDocs: https://hexdocs.pm/elixir/Task.Supervisor.html

## Issues Found
- The setup snippet called `OpentelemetryTelemetry.register_application_tracer(:my_app)`, which is not part of the current `opentelemetry_telemetry` API. Updated the setup text to reflect that application tracers are created automatically by default when the OpenTelemetry SDK starts.
- The dependency list included `opentelemetry_telemetry` as required, but the examples use direct manual tracing rather than telemetry event bridging. Removed that dependency from the snippet and updated the OpenTelemetry package version constraints to current documented versions.
- The GenServer example started client-side spans but did not propagate context to the GenServer process, so server callback spans would not be children of the client span. Updated the call and cast messages to include `OpenTelemetry.Ctx.get_current/0`, then attach and detach that context in `handle_call/3` and `handle_cast/2`.
- The Task examples attached parent context without detaching it. Updated both `Task.async/1` and `Task.Supervisor.async/2` examples to retain the attach token and call `Ctx.detach/1` in an `after` block.
- The validation example recorded an atom as an exception before raising a string. Updated it to create a `RuntimeError`, set span status from its message, record the exception, and raise the exception struct.
- The lifecycle section implied that `terminate/2` covers the full GenServer lifecycle. Elixir documentation says `terminate/2` is not guaranteed and supervised shutdown requires trapping exits. Updated the prose and added `Process.flag(:trap_exit, true)` in `init/1`.

## Review Notes
Local syntax compilation was not run because `elixir` is not installed in the review environment. Code examples were checked against official HexDocs and OpenTelemetry documentation.
