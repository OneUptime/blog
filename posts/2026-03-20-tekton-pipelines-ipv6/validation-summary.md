# Validation Summary: How to Configure Tekton Pipelines with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tekton Pipelines
- Tekton CLI (`tkn`)
- Kubernetes IPv6 and dual-stack networking
- Kubernetes Pods and Workspaces
- Git over HTTP(S)
- IPv6 URI syntax
- curl
- Kaniko container builds

## Sources Consulted
- Tekton Pipeline API documentation: https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton TaskRun documentation: https://tekton.dev/docs/pipelines/taskruns/
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Tekton PipelineRun documentation: https://tekton.dev/docs/pipelines/pipelineruns/
- Tekton CLI documentation: https://github.com/tektoncd/cli and https://tekton.dev/docs/getting-started/pipelines/
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Cluster Networking documentation: https://kubernetes.io/docs/concepts/cluster-administration/networking/
- RFC 3986 URI syntax for IPv6 literals: https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
- curl man page for `--ipv6`: https://curl.se/docs/manpage.html
- Git clone documentation: https://git-scm.com/docs/git-clone
- Kaniko maintained fork and image status: https://github.com/chainguard-dev/kaniko and https://images.chainguard.dev/directory/image/kaniko/overview

## Issues Found
- The example Git URLs used `https://[2001:db8::gitea]/org/my-app.git`, which is not a valid IPv6 literal because `gitea` is not a hexadecimal IPv6 hextet. Changed the examples to `https://[2001:db8::10]/org/my-app.git`, using valid bracketed IPv6 literal syntax.
- The Git clone task unconditionally ran `git config --global http.sslVerify false`. That does not configure IPv6 and disables TLS verification globally. Removed it and replaced the comment with guidance that Git supports bracketed IPv6 literals and the image should trust the Git server certificate.
- The pipeline connectivity check installed Ubuntu packages without first refreshing package indexes. Added `apt-get update -qq` before `apt-get install` and normalized the package install commands.
- The pipeline used `ping6`. Replaced it with `ping -6`, which is the current iputils-compatible form for forcing IPv6.
- The build task used `gcr.io/kaniko-project/executor:latest`. The original Kaniko images are no longer maintained after the upstream project was archived. Replaced it with a syntactically valid placeholder for a maintained Kaniko executor image and clarified that the registry must be IPv6-reachable.

## Review Notes
- The Tekton `tekton.dev/v1` API usage, inline `taskSpec`, params, workspaces, PipelineRun workspace binding, and `tkn` log commands match current Tekton documentation.
- The sample still uses documentation/example addresses and registries. Readers must replace `2001:db8::10`, `registry.example.com`, and `myregistry.example.com` with real IPv6-reachable endpoints.
- In IPv6-only clusters, base image pulls, Ubuntu package mirrors, Git servers, and container registries must be reachable over IPv6 or through an explicitly configured translation/proxy path.
