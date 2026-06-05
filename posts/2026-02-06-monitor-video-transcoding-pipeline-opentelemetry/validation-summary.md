# Validation Summary: How to Monitor Video Transcoding Pipeline Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python metrics API
- OTLP/gRPC metric exporting
- FFmpeg transcoding progress output
- Python subprocess orchestration
- AWS Elemental MediaConvert
- boto3
- VMAF, PSNR, and SSIM quality metrics

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python SDK metrics export API documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/metrics.export.html
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- FFmpeg official documentation for `-progress`: https://www.ffmpeg.org/ffmpeg.html
- Local FFmpeg help output for `-progress` and `-stats_period`
- AWS CLI MediaConvert `get-job` command reference: https://docs.aws.amazon.com/cli/latest/reference/mediaconvert/get-job.html

## Issues Found
- The FFmpeg wrapper used `stderr=subprocess.PIPE` but never consumed `stderr`. FFmpeg logs to stderr, so a long-running or noisy transcode can block if the pipe fills. Changed `stderr` to `subprocess.DEVNULL` so the example can continue reading progress from stdout without deadlocking.
- The MediaConvert example comment said it was recording output file sizes, but the code reads `DurationInMs` from `OutputDetails` and uses it for speed calculations. Updated the comment to describe output media durations.

## Review Notes
- The OpenTelemetry Python metric setup uses current metric SDK APIs, including `MeterProvider`, `PeriodicExportingMetricReader`, `OTLPMetricExporter`, counters, histograms, and up-down counters.
- FFmpeg `-progress pipe:1` is valid and emits periodic `key=value` progress lines, including `speed`, with the final progress record ending in `progress=end`.
- MediaConvert `GetJob` exposes job statuses, timing data, `OutputGroupDetails`, `OutputDetails`, and `DurationInMs` as shown in the example. For capacity planning, teams may want to distinguish queue-inclusive job duration from processing-only duration using `Timing.SubmitTime`, `Timing.StartTime`, and `Timing.FinishTime`.
