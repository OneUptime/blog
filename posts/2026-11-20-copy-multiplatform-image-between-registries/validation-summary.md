# Validation review

Reviewed pinned source selection, complete image indexes, no-clobber limitations and separate referrer acceptance.

## Checks

- crane0.20.6 CLI copied synthetic AMD64/ARM64 index between owned loopback test registries: digest unchanged and all destination compressed layers readable
- No-clobber rejected existing destination; explicit linux/amd64 copy produced single manifest
- Index jq guard accepted array and rejected missing/empty index; shell syntax passed
- Five Mermaid edges structurally checked;1280x720 image visually reviewed

## Limitations

- Local fixture used HTTP and anonymous test registries; no production TLS, credentials, remote registry, actual workload execution or signature/referrer copy
- Test servers closed after test; no Docker daemon or personal credential configuration used
- Mermaid not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
