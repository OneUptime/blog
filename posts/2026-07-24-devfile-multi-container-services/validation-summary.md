# Validation Summary: Designing Multi-Container and Multi-Service Devfiles Without Component Conflicts

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Devfile 2.3
- Devfile API and Devfile library validation
- YAML configuration
- Multi-container developer environments
- Kubernetes Pods, networking, Services, storage, and resource quantities
- Node.js official container images
- odo v3 CLI

## Sources Consulted

- [Devfile 2.3 validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [Devfile 2.3 JSON Schema](https://devfile.io/devfile-schemas/2.3.0.json)
- [Devfile 2.3: Adding a container component](https://devfile.io/docs/2.3.0/adding-a-container-component)
- [Devfile 2.3: Defining endpoints](https://devfile.io/docs/2.3.0/defining-endpoints)
- [Devfile 2.3: Adding a volume component](https://devfile.io/docs/2.3.0/adding-a-volume-component)
- [Devfile 2.3: Limiting resource usage](https://devfile.io/docs/2.3.0/limiting-resources-usage)
- [Devfile 2.3: Adding an exec command](https://devfile.io/docs/2.3.0/adding-an-exec-command)
- [Devfile 2.3: Adding a composite command](https://devfile.io/docs/2.3.0/adding-a-composite-command)
- [Devfile API v2.3.0 component validation source](https://github.com/devfile/api/blob/v2.3.0/pkg/validation/components.go)
- [Devfile API v2.3.0 endpoint validation source](https://github.com/devfile/api/blob/v2.3.0/pkg/validation/endpoints.go)
- [Devfile API v2.3.0 command validation source](https://github.com/devfile/api/blob/v2.3.0/pkg/validation/commands.go)
- [Devfile issue #670: Library is missing dedicatedPod support](https://github.com/devfile/api/issues/670)
- [Kubernetes: Services, Load Balancing, and Networking](https://kubernetes.io/docs/concepts/services-networking/)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Docker Official Image tags for `node:22-bookworm-slim`](https://hub.docker.com/_/node/tags?name=22-bookworm)
- [Archived odo v3 `odo dev` reference](https://odo.dev/docs/command-reference/dev/)
- [odo deprecation announcement](https://odo.dev/blog/odo-deprecation-announcement)

## Issues Found

- The post presented reuse of one `targetPort` by two `dedicatedPod` containers as a portable, valid Devfile 2.3 example. The published validation-rules page documents that exemption, but the tagged Devfile API v2.3.0 validator invokes cross-component port validation for every container without consulting `dedicatedPod`. The companion Devfile library also did not implement dedicated-pod generation. Removed the same-port example, documented the specification/reference-implementation discrepancy, recommended unique ports for portable 2.3 Devfiles, and scoped related topology claims to consumers that implement the feature.
- The review checklist required exactly one default command for every group kind. Devfile validation instead permits a single command in a group kind without `isDefault`, requires a choice when multiple commands share a kind, and rejects more than one default. Corrected the checklist to express those constraints.
- The checklist said resource requests must be “below” limits, implying strict inequality. The v2.3.0 validator rejects a request only when it is greater than its limit, so equality is valid. Changed the wording to “do not exceed limits.”

## Review Notes

- The complete YAML example parses successfully and its field names, identifier formats, endpoint names and ports, command references, variable substitution, volume references, and resource quantities match the Devfile 2.3 schema and validation rules.
- All external links in the post returned successful HTTP responses during review.
- The `node:22-bookworm-slim` Docker Official Image tag exists, but it is a mutable tag; pinning a digest would improve reproducibility if this example is adapted for a controlled environment.
- Devfile 2.3 endpoint names have a 15-character schema limit, so ownership prefixes must remain within that limit.
- odo was officially deprecated on October 23, 2025 and its repository is archived. The post correctly labels the odo v3 example as archived and directs readers to use a supported consumer.
