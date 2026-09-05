# Validation Summary: How to Tell Which yq You Installed—and Translate Commands to Mike Farah yq v4

## Status
validated

## Post Type
Technical guide and CLI migration reference.

## Technologies Covered
- YAML and JSON
- Mike Farah yq v3 and v4 (including v4.53.3)
- Kislyuk Python yq and jq
- Bash command resolution, aliases, functions, environment variables, and command hashing
- Homebrew, pip, Snap, Docker, and CI/CD

## Sources Consulted
- Mike Farah official repository and CLI usage: https://github.com/mikefarah/yq
- Official migration guide: https://mikefarah.gitbook.io/yq/upgrading-from-v3
- Evaluate command: https://mikefarah.gitbook.io/yq/commands/evaluate
- Evaluate All command: https://mikefarah.gitbook.io/yq/commands/evaluate-all
- Alternative/default operator: https://mikefarah.gitbook.io/yq/operators/alternative-default-value
- Multiply/merge operator: https://mikefarah.gitbook.io/yq/operators/multiply-merge
- Historical v3 read documentation: https://mikefarah.gitbook.io/yq/v3.x/commands/read
- Historical v3 write documentation: https://mikefarah.gitbook.io/yq/v3.x/commands/write-update
- v4.53.3 release and asset inventory: https://github.com/mikefarah/yq/releases/tag/v4.53.3 and https://api.github.com/repos/mikefarah/yq/releases/tags/v4.53.3
- Version-specific CLI source: https://github.com/mikefarah/yq/blob/v4.53.3/cmd/root.go
- Version-specific container definition: https://github.com/mikefarah/yq/blob/v4.53.3/Dockerfile
- Kislyuk official repository, documentation, and release history: https://github.com/kislyuk/yq, https://kislyuk.github.io/yq/, and https://github.com/kislyuk/yq/blob/main/Changes.rst
- GNU Bash manual: https://www.gnu.org/s/bash/manual/bash.html and https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html
- Local Bash builtin documentation: `help type`, `help command`, and `help hash`.
- Homebrew command reference: https://docs.brew.sh/Manpage
- pip show reference: https://pip.pypa.io/en/stable/cli/pip_show/

## Issues Found
1. **Cached executable lookup:** The post claimed `type -P yq` necessarily returns the first executable on PATH. Bash can return a hashed location instead. Added `hash -r` before that lookup and explained the cache caveat.
2. **Default command version boundary:** `eval` became the implicit command in v4.18.1, rather than at the start of v4. Corrected the version boundary.
3. **Default-value migration semantics:** The missing-path example is valid, but `//` also replaces explicit null and false values, unlike v3's no-match fallback. Added the distinction to prevent treating the translation as universally equivalent.
4. **Multi-document migration semantics:** v4 processes all documents by default, while v3 defaults to the first. Explicitly scoped the table to single-document inputs.
5. **Merge input assumptions:** Scoped the two-file deep-merge example to one mapping document per file. Multiple documents require an explicit selection or reduction strategy; arrays also do not have the same default deep-merge behavior as mappings.
6. **Output-format defaults:** Current v4 uses automatic output-format selection. Replaced the blanket YAML-default description with the behavior for the shown YAML input and the filename-extension caveat.
7. **Interpreter versus yq resolution:** Clarified that an absolute Bash shebang selects Bash, while selecting a specific yq requires an absolute path to yq itself.

## Review Notes
- Verified the read, assignment, deletion, append, null-input creation, environment-string assignment, merge, explicit YAML-output, and Python-wrapper in-place forms against official documentation and version-specific source.
- Confirmed that Kislyuk has a 4.x release series, so the implementation fingerprint remains necessary. Mike Farah v4.53.3 is a real release; its release assets include checksums and Sigstore checksum bundles.
- Confirmed `/workdir` and the yq entrypoint in the pinned release's Dockerfile. The Docker example reads a mounted file and does not require Docker's stdin flag.
- Release tags identify the intended implementation but can be mutable in container registries; the existing digest-pinning advice is appropriate. Package metadata is supporting provenance, and must still be correlated with the selected executable.
- All Bash code fences passed `bash -n`. No yq executable was installed locally, so yq examples were reviewed against documentation/source rather than executed. The Docker invocation was not run.
- The post's documentation links identify the intended official resources. GitBook pages were retrieved through their official `.md` variants after the browser fetcher rejected their content type.
