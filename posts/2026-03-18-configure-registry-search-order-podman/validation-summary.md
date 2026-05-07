# Validation Summary: How to Configure Registry Search Order in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- containers/image registry configuration
- Container registries
- TOML configuration
- Shell commands

## Sources Consulted
- Podman `pull` official documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman `info` official documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman installation and `registries.conf` configuration documentation: https://podman.io/docs/installation
- `containers-registries.conf(5)` source documentation from containers/image: https://sources.debian.org/src/golang-github-containers-image/5.10.3-1/docs/containers-registries.conf.5.md/

## Issues Found
- The article described unqualified pulls as always searching registries left to right. Updated the wording to account for current short-name resolution behavior: configured aliases are checked first, and `short-name-mode` can prompt or affect fallback behavior before registry search order is used.
- The `podman info --format '{{.Registries.Search}}'` examples used an invalid or non-portable map access pattern. Updated them to the documented `{{index .Registries "search"}}` template.
- The disabled-search section implied an empty `unqualified-search-registries` list always requires fully qualified names. Updated it to note that configured short-name aliases can still resolve matching names.
- The sample error for an empty search list was inaccurate. Replaced it with the documented style of error indicating that the short name did not resolve to an alias and no unqualified-search registries are defined.
- The interactive short-name section said Podman prompts when an image is found on multiple registries. Updated this to say the prompt can occur before pulling when multiple configured registries make the short name ambiguous and no alias matches.
- The post recommended a `--short-name-alias-conf` flag for Podman. Removed that recommendation because the current Podman `pull` documentation does not provide that flag; avoiding prompts should be done by configuring aliases or short-name behavior.

## Review Notes
The local environment did not have the `podman` binary installed, so command behavior was verified against official Podman and containers/image documentation rather than local `--help` output. The remaining TOML snippets use the documented `unqualified-search-registries` and `[aliases]` syntax.
