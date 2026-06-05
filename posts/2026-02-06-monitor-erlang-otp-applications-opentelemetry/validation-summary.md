# Validation Summary: How to Monitor Erlang/OTP Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Erlang/OTP
- OpenTelemetry Erlang API and SDK
- OpenTelemetry OTLP exporter
- OpenTelemetry experimental Erlang metrics API
- OTP GenServer and Supervisor behaviours
- BEAM VM runtime metrics
- Distributed Erlang RPC and trace-context propagation
- ETS tables

## Sources Consulted
- OpenTelemetry Erlang instrumentation documentation: https://opentelemetry.io/docs/languages/erlang/instrumentation/
- OpenTelemetry Erlang getting started documentation: https://opentelemetry.io/docs/languages/erlang/getting-started/
- OpenTelemetry Erlang resources documentation: https://opentelemetry.io/docs/languages/erlang/resources/
- OpenTelemetry Erlang propagation documentation: https://opentelemetry.io/docs/languages/erlang/propagation/
- OpenTelemetry Erlang SDK HexDocs: https://hexdocs.pm/opentelemetry/
- OpenTelemetry Erlang API HexDocs: https://hexdocs.pm/opentelemetry_api/
- OpenTelemetry Erlang exporter HexDocs: https://hexdocs.pm/opentelemetry_exporter/
- OpenTelemetry Erlang API source for tracing and metrics macros: https://github.com/open-telemetry/opentelemetry-erlang
- Erlang/OTP `logger` documentation: https://www.erlang.org/doc/apps/kernel/logger.html
- Erlang/OTP `error_logger` documentation: https://www.erlang.org/docs/24/man/error_logger
- Erlang/OTP `erlang` module documentation for scheduler wall time and distribution-controller APIs: https://www.erlang.org/doc/apps/erts/erlang.html
- Erlang/OTP `net_kernel` documentation: https://www.erlang.org/doc/apps/kernel/net_kernel.html

## Issues Found
- The dependency example pinned older OpenTelemetry packages and did not include the experimental metrics packages needed by the metrics section. Updated the dependency list to include `opentelemetry_api_experimental` and `opentelemetry_experimental`.
- The metrics configuration only configured tracing export. Added an `opentelemetry_experimental` reader using the OTLP metrics exporter, matching the official Erlang metrics setup.
- The GenServer cache cleanup handler was never scheduled initially and matched a different message shape than the one it re-scheduled. Updated it to schedule and handle `cleanup_expired` consistently.
- The supervisor monitoring example used the legacy `error_logger`/`gen_event` path. Erlang/OTP 21 and later route OTP reports through `logger`; replaced the example with a Logger handler and `logger:add_handler/3` / `logger:remove_handler/1`.
- The supervisor span status used uppercase atoms (`'ERROR'`), which are not valid OpenTelemetry Erlang status codes. Changed status values to `error`.
- The BEAM metrics example represented metrics by creating spans and used a no-op helper. Reworked it to register observable gauges with the OpenTelemetry Erlang experimental metrics macros.
- The scheduler utilization calculation summed active scheduler time and divided only by scheduler count. Updated it to enable `scheduler_wall_time` and calculate active/total ratios.
- The distribution metrics example used `erlang:dist_ctrl_get_data_notification/1` with a node name and expected a buffer size. That BIF is for alternative distribution carriers and returns `ok`; removed the incorrect buffer-size example and kept connected-node observation.
- The distributed tracing example manually called non-existent/incorrect span-context helpers and did not export the remote RPC function. Updated it to use `otel_propagator_text_map:inject/1` and `extract/1`, added `process_work/2` to exports, and changed status atoms to `ok`/`error`.
- The best-practice text claimed distribution buffer sizes should be monitored generally. Adjusted it to recommend node events, latency, and carrier-specific metrics where exposed.

## Review Notes
Erlang/OTP was not installed in the workspace, so the Erlang snippets could not be compiled locally. Validation was performed against official OpenTelemetry Erlang documentation/source and Erlang/OTP manuals. The Erlang OpenTelemetry metrics API is still under the experimental packages, so future readers should confirm package versions before copying the metrics snippet into production.
