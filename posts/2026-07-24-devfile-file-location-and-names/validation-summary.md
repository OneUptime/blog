# Validation Summary: Where Should devfile.yaml Live, and Which Filenames Do Devfile Tools Recognize?

## Status
validated

## Post Type
Technical guide and reference

## Technologies Covered
- Devfile 2.2.2 and the Devfile Go library
- odo v3.16.1
- YAML
- Kubernetes and Podman development environments
- Go
- Docker Official Images

## Sources Consulted
- [Devfile library parsing and filename discovery](https://devfile.io/docs/2.3.0/library)
- [Devfile schema 2.2.2](https://devfile.io/docs/2.2.2/devfile-schema)
- [Devfile schema 2.3.0](https://devfile.io/docs/2.3.0/devfile-schema)
- [Creating Devfiles](https://devfile.io/docs/2.3.0/create-devfiles)
- [odo dev command reference](https://odo.dev/docs/command-reference/dev/)
- [odo init command reference](https://odo.dev/docs/command-reference/init/)
- [odo JSON output reference](https://odo.dev/docs/command-reference/json-output/)
- [odo build-images command reference](https://odo.dev/docs/command-reference/build-images/)
- [odo v3.16.1 filename discovery implementation](https://github.com/redhat-developer/odo/blob/v3.16.1/pkg/devfile/location/location.go)
- [odo v3.16.1 Devfile library dependencies](https://github.com/redhat-developer/odo/blob/v3.16.1/go.mod)
- [odo deprecation and end-of-life announcement](https://developers.redhat.com/articles/2025/10/23/odo-cli-deprecated-what-developers-need-know)
- [odo repository archive notice](https://github.com/redhat-developer/odo)
- [Go Docker Official Image](https://hub.docker.com/_/golang)

## Issues Found
- The post presented `odo` as current without noting its lifecycle status. Added that `odo` was deprecated on October 23, 2025, reached end of life on March 31, 2026, and had its repository archived on April 1, 2026. The examples are now explicitly scoped to the final v3.16.1 behavior for existing workflows.
- The `odo` section only described the documented `devfile.yaml` convention and did not mention that the final v3.16.1 implementation recognizes `devfile.yaml`, `.devfile.yaml`, `devfile.yml`, and `.devfile.yml` in that order. Added this implementation detail while retaining `devfile.yaml` as the portable documented default.
- Both examples used `schemaVersion: 2.3.0`, but final `odo` v3.16.1 embeds Devfile API and library v2.2.2 and does not parse schema 2.3.0. Changed the examples to `schemaVersion: 2.2.2`.
- The runtime example used the no-longer-maintained `golang:1.24` line. Updated it to the currently supported `golang:1.26` Docker Official Image line.

## Review Notes
The filename priority, `odo init --devfile-path` behavior, `odo describe component -o json` output and `devfilePath` field, `${PROJECT_SOURCE}` usage, relative Dockerfile URI explanation, shell commands, and monorepository guidance are technically correct. Because `odo` is past end of life, new projects should select a maintained Devfile-aware tool and verify that tool's discovery behavior independently.
