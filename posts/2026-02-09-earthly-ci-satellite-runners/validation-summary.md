# Validation Summary: How to Set Up Earthly CI Builds with Satellite Runners on Kubernetes

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Earthly
- Earthly Satellites
- Earthly CLI
- Kubernetes
- Helm
- GitHub Actions
- Prometheus ServiceMonitor

## Sources Consulted
- Earthly announcement: "A message about Earthly" - https://earthly.dev/blog/shutting-down-earthfiles-cloud/
- Earthly Self-Hosted Satellites documentation - https://docs.earthly.dev/earthly-cloud/satellites/self-hosted
- Earthly Satellites documentation - https://docs.earthly.dev/earthly-0.7/earthly-cloud/satellites
- Earthly Managing Satellites documentation - https://docs.earthly.dev/earthly-0.7/earthly-cloud/satellites/managing
- Earthly Kubernetes CI integration documentation - https://docs.earthly.dev/ci-integration/vendor-specific-guides/kubernetes
- Earthly GitHub repository README - https://github.com/earthly/earthly

## Issues Found
- The core premise is no longer valid for a post dated 2026-02-09. Earthly announced that Earthly Cloud, including Cloud Satellites, Self-Hosted Satellites, BYOC Satellites, cloud secrets, and logs, would stop working on July 16, 2025.
- The post describes an Earthly Satellite Kubernetes operator, Helm repository, and `earthly.dev/v1alpha1` `Satellite` custom resource. I could not find official Earthly documentation for this operator or CRD. Official self-hosted Satellite documentation used the `earthly/satellite` container with required environment variables such as `EARTHLY_TOKEN`, `EARTHLY_ORG`, `SATELLITE_NAME`, and `SATELLITE_HOST`.
- Several CLI examples use `earthly satellite ...` commands. Official Satellite docs primarily document `earthly sat ...` for listing, selecting, inspecting, launching, and removing satellites.
- The security guidance is incorrect for the documented self-hosted Satellite model. Official docs state that privileged mode was required and that a rootless version would be available in the future, so the example `buildkitd.rootless: true` configuration is not supported by the referenced product documentation.
- Monitoring claims such as an operator metrics endpoint on port 8080, `.status.queueDepth`, and `app=satellite` labels are unsupported by the official Earthly Satellite documentation found during review.

## Review Notes
The article should be removed or replaced with a new tutorial about Earthly's remaining open-source CLI usage or self-hosted remote BuildKit. Rewriting this post into a remote BuildKit guide would require a substantial change in topic and structure, so the original post was not edited.
