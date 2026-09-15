# Validation Summary: How to Validate and Reject Unsafe Drone Pipelines with an Admission Extension

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Drone validation and admission extensions
- Go
- `drone-go` validator SDK v1.7.1
- YAML and `gopkg.in/yaml.v3` v3.0.1
- Docker pipelines
- HTTP request signing

## Sources Consulted
- Drone admission extension documentation: https://docs.drone.io/extensions/admission/
- Drone validation extension documentation: https://docs.drone.io/extensions/validation/
- Drone validation endpoint server reference: https://docs.drone.io/server/reference/drone-validate-plugin-endpoint/
- `drone-go` validator package v1.7.1 documentation: https://pkg.go.dev/github.com/drone/drone-go@v1.7.1/plugin/validator
- `drone-go` validator handler v1.7.1 source: https://github.com/drone/drone-go/blob/v1.7.1/plugin/validator/handler.go
- `yaml.v3` v3.0.1 package documentation: https://pkg.go.dev/gopkg.in/yaml.v3@v3.0.1
- Go modules reference: https://go.dev/ref/mod

## Issues Found
- The dependency command fetched the root `drone-go` module, but with current Go module behavior it did not add the checksum needed for the validator package's HTTP-signature dependency, so the sample failed to build in a fresh module. Changed the command to fetch the imported `github.com/drone/drone-go/plugin/validator` package at v1.7.1. The sample then resolves its transitive dependencies and builds successfully.

## Review Notes
- The post correctly distinguishes Drone's login-focused admission extension from its pipeline configuration validation extension.
- The pinned `drone-go` v1.7.1 handler returns HTTP 204 for acceptance, HTTP 400 with a JSON error for ordinary policy rejection, and verifies HTTP signatures.
- The deliberately narrow structs combined with `KnownFields(true)` reject unsupported pipeline and step fields. Stream decoding checks each YAML document.
- `gopkg.in/yaml.v3` v3.0.1 is pinned and still usable, although the upstream project now documents a v4 migration path. The pin keeps this example reproducible.
