# Validation Summary: How to Build an OpenTelemetry Sandbox Environment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Collector
- OTLP over HTTP and gRPC
- Jaeger all-in-one
- Gitpod/Ona workspaces and prebuilds
- Docker Compose
- Node.js and npm
- Express

## Sources Consulted
- OpenTelemetry JavaScript Node SDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector troubleshooting documentation for the debug exporter: https://opentelemetry.io/docs/collector/troubleshooting/
- Jaeger deployment documentation for all-in-one and OTLP ports: https://www.jaegertracing.io/docs/1.76/deployment/
- Gitpod/Ona `.gitpod.yml` reference: https://www.gitpod.io/docs/classic/user/references/gitpod-yml
- Gitpod/Ona prebuilds documentation: https://ona.com/docs/classic/user/configure/repositories/prebuilds
- Gitpod/Ona defunct GitHub prebuilds `.gitpod.yml` documentation: https://ona.com/docs/classic/user/integrations/github-gitpod-yaml
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- npm install documentation: https://docs.npmjs.com/cli-documentation/install
- npm folders documentation for local vs global package installs: https://docs.npmjs.com/files/folders/

## Issues Found
- The Docker Compose snippet mounted the Collector config at `/etc/otelcol/config.yaml` while using the `otel/opentelemetry-collector-contrib` image. The contrib distribution uses `/etc/otelcol-contrib/config.yaml`, so the mounted config could be ignored. Updated the mount path to `/etc/otelcol-contrib/config.yaml`.
- The Docker Compose snippet included the obsolete top-level `version: '3.8'` field. Docker Compose now treats this field as informational and warns that it is obsolete. Removed the field.
- The Dockerfile globally installed OpenTelemetry packages, but the sample app uses `require()`, which should resolve packages from local `node_modules`. Added a `package.json` snippet with local dependencies and removed the global npm install from the Dockerfile snippet.
- The sample app required `express`, but the post did not include it as a dependency. Added `express` to the new `package.json` snippet.
- The post said developers would see traces immediately after the Gitpod configuration starts, but the sample application still needs to be started and exercised. Updated the wording to say traces appear after starting the app and hitting an endpoint.
- The prebuild snippet used the old `github.prebuilds` namespace in `.gitpod.yml`, which Gitpod/Ona now marks as defunct. Replaced it with current guidance: define `init` tasks, import the repository, enable prebuilds in repository settings, and test with `gp validate --prebuild`.

## Review Notes
- The OpenTelemetry Collector and Jaeger image versions are pinned to older but still plausible versions for this tutorial. Future maintenance should periodically update and re-test the pinned images.
- The OpenTelemetry JavaScript SDK package is documented as experimental and may introduce breaking changes in future releases.
