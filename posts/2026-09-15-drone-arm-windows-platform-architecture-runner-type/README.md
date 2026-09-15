# Drone Fails on ARM or Windows: Match Architecture, OS, and Runner Type

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Docker, ARM, CI/CD, Troubleshooting

Description: Diagnose Drone portability failures by checking execution platform, container image manifests, native dependencies, Windows compatibility, and runner type.

A local pass proves that a pipeline worked with the local Docker daemon, filesystem, and supplied metadata. It does not establish that the selected remote runner can execute the same images or binaries.

Separate three questions: where Drone schedules the pipeline, which platforms the container images support, and which platform the compiled application targets. These can be different even when every command uses the word “platform.”

## Check what local execution actually tested

`drone exec` uses your local Docker daemon and mounts the working directory instead of performing the server's normal clone. Existing dependencies and generated files can therefore make a local run succeed accidentally. Server-side secrets and metadata are also not automatically available locally. [Drone local execution differences](https://docs.drone.io/quickstart/cli/)

Record the local and remote Docker environments:

```bash
docker info --format '{{.OSType}}/{{.Architecture}}'
docker version
```

A macOS laptop using Docker Desktop typically executes Linux containers in its Docker environment; the laptop's host OS alone does not identify the container platform. Compare the daemon output, the pipeline's declared platform, and the architecture reported inside the actual step.

## Declare the intended Drone platform

Drone's Docker-pipeline default is Linux amd64. An ARM64 execution target should be explicit:

```yaml
kind: pipeline
type: docker
name: test-arm64

platform:
  os: linux
  arch: arm64

steps:
  - name: inspect-and-test
    image: golang:1
    commands:
      - uname -s
      - uname -m
      - go version
      - go env GOOS GOARCH CGO_ENABLED
      - go test ./...
```

The example assumes a Go module and an available Linux ARM64 Docker runner. Pin a toolchain image version or digest appropriate for the project. `arch: arm64` selects an execution platform; it does not install emulation or translate an amd64 binary. [Drone platform configuration](https://docs.drone.io/pipeline/docker/syntax/platform/)

Use Drone's documented names: `amd64`, `arm64`, or `arm`, rather than copying `x86_64` or `aarch64` directly from `uname` into the YAML.

## Inspect every image manifest

A multi-platform application image is not enough if the test image, clone image, service image, or publishing plugin lacks the target platform.

Inspect the actual image tags used by the pipeline:

```bash
docker buildx imagetools inspect golang:1
docker buildx imagetools inspect registry.example.com/acme/test-tools:2026-09
```

Look for an appropriate Linux ARM64 manifest, or the specific Windows platform when applicable. Authenticate first for a private registry. A tag can point to a multi-platform index or a single-platform manifest; check the published content instead of assuming support from the image name. [Docker manifest inspection](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)

If an image pulls but execution fails, inspect binaries downloaded by scripts, native npm modules, JNI libraries, and other architecture-specific dependencies. A hardcoded `linux-amd64` release archive remains amd64 even inside an ARM64 image.

Build output selection is another separate layer. Setting Go's `GOARCH=arm64` can cross-compile compatible code, but it does not make the current runner able to execute that output for tests. Projects using cgo may need a suitable compiler and target libraries as well.

## Treat Windows as a separate compatibility check

Windows containers depend on compatibility between host and container OS versions and the selected isolation mode. Microsoft documents the supported combinations; a Linux image cannot be treated as a Windows container by changing the Drone platform field. [Windows container version compatibility](https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility)

Drone's Windows Docker-runner documentation currently labels that support experimental and lists historical kernel versions. Its Docker platform page requires a Windows version field. Do not infer support for a current Windows Server release from those older examples; confirm the exact runner release, published runner and step images, and Microsoft compatibility requirements in a test environment. [Drone Windows runner installation](https://docs.drone.io/runner/docker/installation/windows/), [Drone Windows platform fields](https://docs.drone.io/pipeline/docker/syntax/platform/#windows)

Shell syntax also differs. POSIX paths, `apk`, and `./script.sh` are not portable Windows commands. Check the actual shell, line endings, filesystem case behavior, and executable format before diagnosing the application itself.

## Choose Exec only when host execution is required

Some Windows or macOS toolchains require direct host access. An Exec pipeline has no container `image` field for its steps and depends on tools installed on the host:

```yaml
kind: pipeline
type: exec
name: windows-host-tests

platform:
  os: windows
  arch: amd64

steps:
  - name: test
    commands:
      - dotnet --info
      - dotnet test
```

This example requires a compatible Windows Exec runner and .NET SDK already installed for the runner's service account. Drone documents Exec as running directly on the host without isolation, making it unsuitable for untrusted workloads. [Exec runner overview](https://docs.drone.io/runner/exec/overview/), [Exec platform syntax](https://docs.drone.io/pipeline/exec/syntax/platform/)

Verify portability with fresh workspaces and separate cache keys for incompatible toolchains and platforms. Keep a small platform-identification step in diagnostic builds, then test on the real target runner. Local emulation is useful evidence, but the target environment is the final check for native dependencies and operating-system behavior.
