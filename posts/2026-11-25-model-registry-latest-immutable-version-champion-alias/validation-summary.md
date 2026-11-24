# Validation summary

Reviewed on 25 November 2026.

## Sources and runtime checks

Reviewed official MLflow registry concepts, the 3.18.0 model URI resolver, alias lookup and Python loading APIs, and S3 Object Lock's object-version scope. The article distinguishes registration order, evaluation, alias choice and actual loaded deployment state. It does not claim that a numeric URI enforces storage immutability.

Executed both exact Python snippets under Python 3.11.13 with MLflow 3.18.0, temporary SQLite and synthetic local models. Latest selected version 2 while champion selected version 1. An existing release continued loading version 1 after champion moved; a fresh manifest selected version 2. Existing manifests could not be overwritten, mismatched registry labels were rejected, and a missing alias failed without producing a manifest.

The five-node/four-edge Mermaid diagram passed structural checking. The generated 1280x720 social image was opened and visually reviewed; its two-line title fits.

## Limits

No production evaluation, hosted registry, serving fleet, remote artifact permissions or Object Lock policy was exercised. The manifest is a small selection record, not an authenticated approval or artifact-integrity implementation. Registry labels are only configuration checks. MLflow is pinned, while dependency versions were resolved locally. The diagram was not browser-rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
