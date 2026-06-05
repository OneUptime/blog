# Validation Summary: How to Implement Service Mesh for Docker Containers with Linkerd

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linkerd
- Kubernetes
- k3s
- Docker/OCI container images
- Gateway API HTTPRoute
- Linkerd Viz
- Service mesh observability, mTLS, retries, timeouts, and traffic splitting

## Sources Consulted
- Linkerd Getting Started: https://linkerd.io/docs/getting-started/
- Linkerd Gateway API support: https://linkerd.io/docs/features/gateway-api/
- Linkerd retries and timeouts feature docs: https://linkerd.io/docs/features/retries-and-timeouts/
- Linkerd retries reference: https://linkerd.io/docs/reference/retries/
- Linkerd timeouts reference: https://linkerd.io/docs/reference/timeouts/
- Linkerd traffic shifting docs: https://linkerd.io/2/tasks/traffic-shifting/
- Linkerd traffic split feature docs: https://linkerd.io/docs/features/traffic-split/
- Linkerd CLI install reference: https://linkerd.io/docs/reference/cli/install/
- Linkerd Viz CLI reference: https://linkerd.io/docs/reference/cli/viz/
- k3s documentation: https://docs.k3s.io/

## Issues Found
- The post described Linkerd as being installed for standalone Docker containers. Linkerd runs on Kubernetes workloads, so I updated the description, introduction, prerequisites, existing-workloads section, and summary to refer to Kubernetes container workloads and Docker/OCI images.
- The Linkerd CLI installer used `https://run.linkerd.io/install`, while the current Linkerd open source getting-started docs use `https://run.linkerd.io/install-edge`. I updated the install command.
- The current Linkerd docs require or recommend Gateway API CRDs for several modern configuration features. I added the Gateway API standard CRD install command before `linkerd check --pre`.
- The sample `frontend` deployment did not call `backend-api`, so the mTLS, `edges`, and `tap` examples would not show the described service-to-service traffic. I added a `traffic-generator` deployment using `buoyantio/slow_cooker` and updated the tap command and explanation to target that generated traffic.
- The mTLS verification text claimed a padlock icon and TLS status in tap output. The current Viz docs describe `edges` as showing connections and proxy identities, so I corrected the wording.
- The retry and timeout examples used ServiceProfile configuration. Linkerd still supports ServiceProfiles, but current retries/timeouts docs describe annotation-based configuration on Service, HTTPRoute, or GRPCRoute resources and note incompatibility with ServiceProfiles. I replaced the retry example with a GET-only HTTPRoute retry configuration and replaced the timeout example with a Service annotation.
- The traffic splitting example used SMI `TrafficSplit`, which Linkerd documents as deprecated and requiring the Linkerd SMI extension. I replaced it with a Gateway API HTTPRoute-based split.
- The traffic splitting example referenced versioned backend services without saying they must exist. I clarified that `backend-api-v1` and `backend-api-v2` Services should be created before applying the route.
- The `Resource Usage` label was missing Markdown heading syntax. I changed it to `## Resource Usage`.

## Review Notes
The post is now technically valid as a Kubernetes/Linkerd tutorial. The examples are still intentionally simplified for a blog post; a production Linkerd install should review release compatibility, certificate management, Helm-based installs, high availability settings, and provider-specific stable distribution guidance.
