# Validation summary

## Checks

- Published Python parser executed against five fixtures: populated samples, absent resource fields, absent stats, null stats and empty map.
- URL encoding fixture preserved separators and escaped spaces/question marks.
- All shell blocks passed bash syntax checks.
- Source-reviewed v2.0 versus v2.1 stats shapes, root exclusion, machine sample conversion and count semantics in cAdvisor 0.55.1.
- Seven-edge Mermaid structure checked; diagram not graphically rendered.
- Generated 1280x720 social image visually reviewed; title readable without clipping.

## Sources reviewed

- https://github.com/google/cadvisor/blob/v0.55.1/cmd/internal/api/versions.go
- https://curl.se/docs/manpage.html
- https://github.com/google/cadvisor/blob/v0.55.1/info/v1/machine.go
- https://github.com/google/cadvisor/blob/v0.55.1/docs/api_v2.md
- https://github.com/google/cadvisor/blob/v0.55.1/info/v2/container.go
- https://github.com/google/cadvisor/blob/v0.55.1/info/v1/container.go
- https://github.com/google/cadvisor/blob/v0.55.1/cmd/internal/api/handler.go

## Limitations

- No live cAdvisor server, Docker host, API authentication or container collection was exercised.
- Fixture tests verify parser behavior, not completeness or freshness of real collected data.
- Recursive queries still scale with the number of cgroups; readers must select an appropriate scope.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
