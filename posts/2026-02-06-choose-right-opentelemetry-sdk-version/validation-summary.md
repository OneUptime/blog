# Validation Summary: How to Choose the Right OpenTelemetry SDK Version for Your Project

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry API, SDK, specification, contrib packages, and semantic conventions
- OpenTelemetry Python and Python contrib instrumentation
- OpenTelemetry JavaScript and Node.js packages
- OpenTelemetry Java
- OpenTelemetry Collector and OTLP
- Docker Compose
- Python packaging, npm package metadata, and Java Gradle build metadata

## Sources Consulted
- OpenTelemetry versioning and stability for clients: https://opentelemetry.io/docs/specs/otel/versioning-and-stability/
- OpenTelemetry specification status summary: https://opentelemetry.io/docs/specs/status/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Python documentation and version support: https://opentelemetry.io/docs/languages/python/
- OpenTelemetry JavaScript documentation and version support: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry Java versioning documentation: https://github.com/open-telemetry/opentelemetry-java/blob/main/VERSIONING.md
- OpenTelemetry Python v1.15.0 package metadata: https://github.com/open-telemetry/opentelemetry-python/tree/v1.15.0
- OpenTelemetry Python contrib v0.35b0 and v0.36b0 package metadata: https://github.com/open-telemetry/opentelemetry-python-contrib
- OpenTelemetry JavaScript v1.8.0 and experimental v0.45.0 package metadata: https://github.com/open-telemetry/opentelemetry-js
- OpenTelemetry JavaScript contrib auto-instrumentations-node v0.39.0 package metadata: https://github.com/open-telemetry/opentelemetry-js-contrib
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/

## Issues Found
- The post said SDK implementations can introduce breaking changes in their own versioning after OpenTelemetry 1.0. Updated this to reflect OpenTelemetry's stability rules: stable API and SDK packages maintain compatibility within a major version, while pre-1.0, alpha, and experimental contrib packages may break.
- The post stated that each language implementation publishes compatibility matrices. This was too broad, so it now refers to versioning guidance, runtime support information, and package metadata.
- The Python compatibility command checked a root `setup.py`, but OpenTelemetry Python v1.15.0 stores package metadata in package-level `pyproject.toml` files. Updated the command to inspect `opentelemetry-api/pyproject.toml` and `opentelemetry-sdk/pyproject.toml`.
- The Node.js compatibility command checked the repository root `package.json`, which does not contain the package-level runtime support field readers need. Updated it to inspect `experimental/packages/opentelemetry-sdk-node/package.json`.
- The Java compatibility command looked for `java.version` in a root `pom.xml`, but OpenTelemetry Java v1.24.0 uses Gradle Kotlin build files. Updated it to inspect the Java compile release settings in the Gradle conventions file.
- The matching-SDK-to-specification section implied explicit per-signal spec version mapping and Collector incompatibility for newer SDK data formats. Updated the wording to focus on release notes, signal stability, semantic convention changes, and OTLP optional capability support.
- The Flask instrumentation "bad" example mixed `opentelemetry-api==1.20.0` with `opentelemetry-instrumentation-flask==0.35b0`, but that API version satisfies the package's `opentelemetry-api ~= 1.12` requirement. Replaced it with an actual contrib-package mismatch between `0.36b0` and `0.35b0`.
- The pip examples were fenced as Python even though they are shell commands. Changed those fences to Bash.
- The Docker Compose example used a top-level `version: '3.8'` field. Removed it to align with the current Compose Specification, where the latest recommended format does not require the legacy version field.
- The `package.json` examples were fenced as JSON but contained JavaScript comments, making the snippets invalid JSON. Removed the comments from inside the JSON blocks.
- The OTLP section referred to "the same OTLP version", but OTLP does not use explicit protocol version numbers. Updated it to refer to compatible transports, signal types, and optional capabilities.

## Review Notes
The post remains a high-level version-selection guide rather than an installation tutorial. Several version numbers are intentionally illustrative and older than current OpenTelemetry releases; that is acceptable because the surrounding text tells readers to verify the specific version they plan to use.
