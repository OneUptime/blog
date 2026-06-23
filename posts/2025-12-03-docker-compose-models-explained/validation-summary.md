# Validation Summary: Docker Compose Models Explained: Wire AI Runtimes Like Any Other Dependency

## Status
validated

## Post Type
Guide / Explainer (conceptual walkthrough with configuration examples)

## Technologies Covered
- Docker Compose (`models` top-level element)
- Docker Model Runner
- OCI artifacts (model distribution)
- YAML configuration

## Sources Consulted
- Docker Compose file reference — Models top-level element: https://docs.docker.com/reference/compose-file/models/
- Docker Compose file reference — Services `models` attribute: https://docs.docker.com/reference/compose-file/services/#models

## Issues Found
- **Incorrect auto-injected environment variable naming (`AI_` prefix).** The post claimed Compose auto-injects variables such as `AI_LLM_SMALL_URL` and `AI_LLM_LARGE_URL`. Per the official spec, Compose generates the endpoint variable by uppercasing the model key, replacing hyphens with underscores, and appending `_URL` — there is **no `AI_` prefix**. A model named `llm_small` therefore produces `LLM_SMALL_URL`. Fixed all four occurrences:
  - Inline comment in the short-syntax example (`AI_LLM_SMALL_URL` → `LLM_SMALL_URL`).
  - Prose after the short-syntax example (`AI_LLM_SMALL_URL` → `LLM_SMALL_URL`).
  - Inline comment in the long-syntax example (`AI_LLM_LARGE_URL` → `LLM_LARGE_URL`).
  - Mermaid diagram edge label (`AI_LLM_SMALL_URL` → `LLM_SMALL_URL`).

## Review Notes
- The long-syntax service-level configuration using `endpoint_var` is correct and matches the spec (a companion `model_var` for the model identifier also exists but is not required for the post's point).
- The top-level model attributes used — `model` (OCI artifact reference), `context_size`, and `runtime_flags` (list of flags passed to the inference engine) — are all valid per the current spec.
- Short syntax (list) vs. long syntax (map) on the service `models:` attribute is accurately described.
- The `runtime_flags` example values (`--temperature`, `--gpu-layers`, `--remote`) are illustrative; actual supported flags depend on the inference engine backing the model runner, which is a reasonable level of abstraction for this post.
- This feature is relatively new and still evolving; readers should confirm exact behavior against their installed Docker Compose / Docker Desktop version. No version-specific claim in the post is currently inaccurate.
