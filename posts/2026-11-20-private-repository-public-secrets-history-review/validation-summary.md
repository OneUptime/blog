# Validation summary

Executed the official git-filter-repo v2.47.0 tagged script using Python 3.11.13 and Git 2.54.0 (Apple Git-157) in a fresh disposable clone. The fixture had a synthetic marker, a renamed file, an old branch and a tag. The checker detected historical content despite its absence at HEAD. Rewriting both paths removed the marker from reachable file snapshots and preserved ordinary documentation. Blank pattern files were rejected. Three shell snippets pass syntax checking; the published Python matches the executed checker. Mermaid structure was checked, not rendered. The generated social image was visually inspected and is readable without clipping.

No real credentials were used. No remote history, repository visibility or production repository was modified. The checker is explicitly limited to literal content in reachable commit snapshots and does not replace secret scanning, hosted-surface review or credential revocation.

## Checked sources

- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility
- https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning
- https://github.com/newren/git-filter-repo/blob/v2.47.0/Documentation/git-filter-repo.txt
- https://git-scm.com/docs/git-rev-list
- https://git-scm.com/docs/git-grep
- https://git-scm.com/docs/gitignore

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
