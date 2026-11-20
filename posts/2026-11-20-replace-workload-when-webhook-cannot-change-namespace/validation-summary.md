# Validation summary

The exact YAML examples were rendered with standalone Kustomize v5.7.1. The resulting Deployment and Service passed Kubernetes v1.35.0 OpenAPI checks, with the schema’s IntOrString format handled as integer or string. Assertions verified destination namespace, matching selectors, port, image and replica count. Shell syntax passed. The Mermaid graph was checked structurally (eight nodes, seven edges).

The namespace restriction, identity and ownership boundaries, storage binding, Service behavior, admission side effects and dry-run semantics were reviewed against the official sources linked in the article and listed in validation.json.

No cluster request or workload was executed. The example is a rendering fixture, not a production application deployment. No traffic switch, storage migration, or rollback was tested.

The generated social image was visually inspected; its title is readable and unclipped.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
