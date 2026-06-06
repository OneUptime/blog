# Validation Summary: How to Use Container Runtime Semantic Conventions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Python SDK
- OpenTelemetry Python container ID resource detector
- OpenTelemetry Collector Contrib resource detection processor
- Docker and Docker Compose
- Linux cgroups
- Kubernetes resource attributes

## Sources Consulted
- OpenTelemetry container semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/container/
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Resource SDK specification: https://opentelemetry.io/docs/specs/otel/resource/sdk/
- OpenTelemetry Python resources API documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Python Contrib container resource detector documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/resource/container/container.html
- OpenTelemetry Python Contrib container detector source: https://github.com/open-telemetry/opentelemetry-python-contrib/blob/main/resource/opentelemetry-resource-detector-containerid/src/opentelemetry/resource/detector/containerid/__init__.py
- OpenTelemetry Collector Contrib resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector Contrib Docker detector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/internal/docker/documentation.md
- Docker Compose version top-level documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker networking hostname documentation: https://docs.docker.com/network/

## Issues Found
- The post used the deprecated `container.runtime` semantic convention. Current OpenTelemetry semantic conventions replace it with `container.runtime.name`, so I updated the attribute table, diagrams, environment variable examples, and explanatory text.
- The attribute table described `container.id` as the full 64-character ID. The current semantic convention says it may be abbreviated, so I changed the description.
- The attribute table described `container.image.name` as the image name without tag or digest. Current OpenTelemetry wording is the name of the image the container was built on, with tags represented separately by `container.image.tags`; I updated the description.
- The attribute table described `container.command_args` as only arguments passed to the command. Current OpenTelemetry wording includes the command or executable itself, so I corrected the description.
- The Python example imported `ContainerResourceDetector` from the wrong module and used the wrong package name. I changed it to `opentelemetry.resource.detector.containerid.ContainerResourceDetector` and noted the `opentelemetry-resource-detector-containerid` package.
- The Python example passed `base_resource` to `get_aggregated_resources`, but the current OpenTelemetry Python API uses `initial_resource`. I updated the argument.
- The Python example imported `AwsEcsResourceDetector` but did not use it. I removed the unused import.
- The Python detector section claimed the detector adds all available container attributes. The official Python detector only returns `container.id`, so I narrowed the wording.
- The Collector example used the deprecated `resourcedetection` component name. I changed it to the current `resource_detection/docker` component name and updated pipeline references.
- The Collector section implied per-signal Docker container resolution. The Docker detector detects resource attributes from the Collector host/container context, so I changed the wording and added the Docker socket requirement.
- The Docker Compose example used the obsolete top-level `version` property. I removed it to match the current Compose Specification guidance.

## Review Notes
The manual cgroup parser is intentionally simple and still less complete than the OpenTelemetry detector; the post now frames it as a common-path example rather than a universal implementation. The Collector Docker detector currently enables `host.name` and `os.type` by default, while `container.image.name` and `container.name` are disabled by default in its generated documentation; users may need additional detector resource-attribute configuration depending on their Collector version and desired attributes.
