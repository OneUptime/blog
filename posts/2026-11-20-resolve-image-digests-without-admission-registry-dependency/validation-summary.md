# Validation summary

Go1.25.0 tests exercised the go-containerregistryv0.20.3 digest command implementation, including --full-ref, against a temporary local TLS registry. Tag movement changed resolution while the retained digest remained stable. An index lookup and explicit linux/amd64 selection returned their expected distinct digests. The manifest command fetched the pinned index and its two platform descriptors.

The harness used explicit anonymous authentication and the test server’s trusted transport. An initial attempt inherited an unavailable local credential helper; the isolated test harness was corrected and rerun successfully. No production credentials or TLS verification bypass were used.

Official versioned crane documentation/source, authentication guidance, OCI index specification, Kubernetes image behavior and admission guidance were reviewed. Sources are recorded in validation.json. Both shell blocks passed syntax checks. The seven-node/seven-edge Mermaid graph was checked structurally. The generated social image was visually inspected for readable unclipped text.

The complete shell sequence and a standalone crane executable were not run. No cluster, admission handler, asynchronous cache, clean-node pull or outage rehearsal was deployed. The local command test does not establish production registry authentication or application startup behavior.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
