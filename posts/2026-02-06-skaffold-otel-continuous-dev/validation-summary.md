# Validation Summary: How to Use Skaffold with OpenTelemetry for Continuous Development

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Skaffold
- Kubernetes
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- OpenTelemetry Flask instrumentation
- Jaeger
- Flask
- Docker

## Sources Consulted
- Skaffold YAML reference: https://skaffold.dev/docs/references/yaml/
- Skaffold file sync documentation: https://skaffold.dev/docs/filesync/
- Skaffold port forwarding documentation: https://skaffold.dev/docs/port-forwarding/
- Skaffold profiles documentation: https://skaffold.dev/docs/environment/profiles/
- Skaffold CLI schema output from current downloaded CLI v2.21.0
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector releases repository: https://github.com/open-telemetry/opentelemetry-collector-releases
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Flask development server documentation: https://flask.palletsprojects.com/en/stable/server/

## Issues Found
- The Skaffold example used `apiVersion: skaffold/v4beta8` with `deploy.kubectl.manifests`. In current Skaffold v4 schemas, raw manifests belong under `manifests.rawYaml`, while `deploy.kubectl` configures deployment behavior. Updated the example to `skaffold/v4beta14`, moved manifest paths to `manifests.rawYaml`, and left `deploy.kubectl: {}`.
- The project structure referenced `src/tracing.py`, but no such file was used in the tutorial. Removed it from the structure to avoid implying an extra required file.
- The Dockerfile copied `requirements.txt`, but the project structure and tutorial did not provide one. Added `src/requirements.txt` with the Flask and OpenTelemetry packages required by the code.
- The Skaffold config referenced `k8s/jaeger.yaml`, and the text instructed readers to open Jaeger, but no Jaeger Kubernetes manifest was included. Added a Jaeger all-in-one Deployment and Service exposing the UI and OTLP ports.
- The OpenTelemetry Collector image was pinned to the old `otel/opentelemetry-collector-contrib:0.96.0`. Updated it to `0.153.0`, the latest official release available during review.
- The Dockerfile comment said to use watchdog for reloads, but `watchdog` was not installed and Flask's built-in reloader is sufficient for the shown command. Updated the comment to refer to Flask's reloader.
- The original Skaffold profile example attempted to remove local tracing components, but with the app still configured to export to the Collector it would leave the development loop producing exporter failures. Removed the inaccurate profile section instead of adding a larger alternate manifest flow.

## Review Notes
- I validated the embedded Python code with `ast.parse`, parsed the YAML code blocks with PyYAML, and extracted the Skaffold/Kubernetes snippets into a temporary project that `skaffold diagnose` parsed successfully with `skaffold/v4beta14`.
- I did not run the Kubernetes workload end to end because the review environment does not provide a local Kubernetes cluster.
