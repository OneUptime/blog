# Validation Summary: Drone Pipeline Works Locally but Fails on ARM or Windows: Match Architecture, OS, and Runner Type

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Drone CI Docker pipelines and local execution
- Drone Docker and Exec runners
- Docker Engine and Docker Buildx image manifest inspection
- Linux ARM64 and amd64 container platforms
- Windows containers and host/image version compatibility
- Go cross-compilation and cgo
- Native npm modules and JNI libraries
- .NET SDK host execution

## Sources Consulted

- Drone Command Line Runner quick start: https://docs.drone.io/quickstart/cli/
- Drone Docker pipeline platform syntax: https://docs.drone.io/pipeline/docker/syntax/platform/
- Drone Docker runner installation on Windows: https://docs.drone.io/runner/docker/installation/windows/
- Drone Exec runner overview: https://docs.drone.io/runner/exec/overview/
- Drone Exec pipeline platform syntax: https://docs.drone.io/pipeline/exec/syntax/platform/
- Drone Exec pipeline schema: https://docs.drone.io/yaml/exec/
- Docker Buildx `imagetools inspect` reference: https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- Microsoft Windows container version compatibility: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Go Windows cross-compilation guidance: https://go.dev/wiki/WindowsCrossCompiling

## Issues Found
No technical issues found.

## Review Notes
The Drone Windows Docker-runner documentation remains explicitly experimental and lists only Windows kernel versions 1809 and 1903. The post correctly treats those examples as historical and advises validating current runner and image compatibility instead of extrapolating support. Image tags such as `golang:1` are intentionally movable; the post appropriately recommends pinning a project-suitable version or digest.
