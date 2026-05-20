# Validation Summary: How to Use Git File Generator in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD ApplicationSets
- Git file generator
- Go templates
- Kubernetes Application manifests
- Helm parameter overrides
- JSON and YAML configuration files
- kubectl, git, jq

## Sources Consulted
- Argo CD ApplicationSet Git Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD Git File Generator Globbing documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git-File-Globbing/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/

## Issues Found
- Several JSON examples used `//` comments inside `json` code fences, which made the examples invalid JSON. I moved the file path labels outside the JSON blocks.
- The examples used a top-level `path` key from file contents as an Application source path. In Git file generators, `path` is also a built-in parameter for the matched file's containing directory, so the examples could render the wrong source path. I renamed the user-supplied field to `manifestPath` and updated the templates.
- The multi-environment glob pattern used `config/*/**.json`. Argo CD's documented doublestar globbing expects `**` as its own path component, so I changed it to `config/**/*.json`.
- The built-in parameter descriptions incorrectly described `path`, `path.basename`, `path.basenameNormalized`, and `path.filenameNormalized` as filename-oriented values. I corrected them to match Argo CD's Git file generator documentation and added `path.filename`.
- The globbing section described the behavior as standard glob patterns without caveat. I added a note that newer Git file globbing uses doublestar-style patterns when enabled, while older/default behavior can be more greedy.

## Review Notes
The examples use templated `project` fields in a few places. This is supported, but Argo CD documents security caveats for Git generators with templated projects: the source repository should be admin-controlled and signature verification is not supported for that templated field.
