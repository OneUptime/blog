# Validation summary

Official Kubernetes documentation and v1.35.0 admission types and matcher source were reviewed for operations, resource/subresource matching, selectors, conversion and dry-run behavior. The article separates a legitimate skip from an attempted call that fails. Source URLs are recorded in validation.json.

Two YAML snippets parsed with PyYAML 6.0.2. Rules, selectors, a synthetic complete webhook entry containing the article fragment, and the Pod passed the official v1.35.0 OpenAPI shape definitions using jsonschema 4.25.1. Deliberately malformed operations/container types failed. The Pod's label was checked against the object selector. Two shell blocks passed bash syntax checks.

These checks do not execute Kubernetes admission matching or all custom validation. No cluster changes, webhook calls, or server-side dry runs were performed. The configuration is intentionally a fragment and the probe image is a replacement placeholder. The six-node/five-edge Mermaid diagram was structurally checked without rendering.

The generated social image was visually reviewed; its complete title is legible without clipping.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
