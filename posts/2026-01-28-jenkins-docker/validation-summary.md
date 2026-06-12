# Validation Summary: How to Use Jenkins with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins
- Jenkins Pipeline
- Docker
- Docker agents
- Docker-in-Docker
- Kaniko
- BuildKit

## Sources Consulted
- Jenkins documentation: Installing Jenkins with Docker - https://www.jenkins.io/doc/book/installing/docker/
- Jenkins documentation: Using Docker with Pipeline - https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins documentation: Pipeline Syntax - https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins documentation: Managing Nodes - https://www.jenkins.io/doc/book/managing/nodes/
- Docker documentation: docker container run CLI reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker documentation: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker documentation: Protect the Docker daemon socket - https://docs.docker.com/engine/security/protect-access/
- Docker documentation: BuildKit - https://docs.docker.com/build/buildkit/
- Kaniko project documentation - https://github.com/GoogleContainerTools/kaniko

## Issues Found
- The "Safer Alternatives" section described Kaniko and BuildKit as "remote build service" options. Kaniko is documented as a daemonless tool for building container images from a Dockerfile inside a container or Kubernetes cluster, and BuildKit is Docker's builder backend. Changed the line to "Use a daemonless builder like Kaniko or a BuildKit builder" to match the documented terminology.

## Review Notes
- The Jenkins Docker run command uses valid Docker flags and persists `/var/jenkins_home` in a Docker volume.
- The Declarative Pipeline Docker agent syntax is valid and matches Jenkins Docker Pipeline documentation.
- The `docker build -t my-app:${BUILD_NUMBER} .` command is valid when the Jenkins agent has access to a Docker daemon and the workspace contains a Dockerfile.
- Mounting the host Docker socket into a Jenkins container is correctly identified as a security risk. Docker's documentation warns that access to a Docker daemon can effectively grant root-level control of the host.
- Publishing port `50000` for Jenkins is only needed for inbound agents using the default TCP agent port; WebSocket-based agents do not require that port.
