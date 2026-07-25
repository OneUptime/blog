# Validation Summary: Devfile Starters: Branches, Revisions, Private Git, and Multiple Repositories

## Status

validated

## Post Type

Technical guide and reference

## Technologies Covered

- Devfile 2.3
- Devfile starter projects, projects, and dependent projects
- Git remotes, branches, tags, commit IDs, and subdirectories
- Private Git authentication
- Devfile Registry
- odo v3

## Sources Consulted

- [Devfile 2.3: Defining starter projects](https://devfile.io/docs/2.3.0/defining-starter-projects)
- [Devfile 2.3 validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [Devfile 2.3 schema reference](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile 2.3 JSON Schema](https://devfile.io/devfile-schemas/2.3.0.json)
- [Devfile 2.3: Adding projects](https://devfile.io/docs/2.3.0/adding-projects)
- [Official Devfile Registry entry for nodejs 2.1.1](https://registry.devfile.io/devfiles/nodejs/2.1.1)
- [odo v3 `odo init` command reference](https://odo.dev/docs/command-reference/init/)
- [Red Hat odo deprecation and end-of-life notice](https://developers.redhat.com/products/odo)
- [Git `ls-remote` documentation](https://git-scm.com/docs/git-ls-remote)

## Issues Found

- The non-interactive odo example selected `node-service-main`, but the referenced official `nodejs` Devfile version 2.1.1 defines its starter as `nodejs-starter`. Changed the `--starter` value to `nodejs-starter` so the command matches the selected registry stack.
- The post said `git ls-remote <url>` checks that a URL and revision are visible. The command lists advertised remote references and their object IDs; it does not by itself verify every possible revision, particularly an unadvertised commit ID. Changed the wording to say it checks the URL and advertised refs from that shell.

## Review Notes

- The Devfile field nesting, single-remote starter restriction, `checkoutFrom` behavior, `subDir` placement, project modeling, and absence of portable credential fields were verified against the Devfile 2.3 schema and validation documentation.
- The documented fallback to the default branch when a revision is absent or not found is present in the Devfile 2.3 schema. The post appropriately warns that this behavior weakens reproducibility.
- odo reached end of life on March 31, 2026. The post accurately limits its command example to maintained legacy environments and recommends a supported consumer for new workflows.
- The `git.example.com` URLs and sample commit ID are intentionally illustrative rather than live resources.
