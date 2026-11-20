# Validation summary

The exact helper ran with Python3.11 and jsonpatch1.33. Ten cases covered absent/null/empty contexts, sibling settings, a null profile, explicit Localhost/RuntimeDefault/Unconfined profiles, Windows and missing OS. Four malformed inputs were rejected, and an explicit empty profile remained unchanged for normal validation. Tests verified preserved container overrides, unrelated fields, original input and idempotence. Linux Pod results and a wrapped YAML fragment passed Kubernetesv1.35.0 OpenAPI.

Official security-context, Pod Security Standards, Pod Security Admission, seccomp and v0.35 API documentation were reviewed. Sources are listed in validation.json. The generated social image was visually reviewed for readable unclipped text. A field-by-field comparison table was used instead of a diagram.

No live admission chain, runtime, syscall test or Pod Security Admission validator ran. The Windows fixture tests only helper abstention and is not a deployable Windows example. The helper does not establish workload eligibility or full Restricted compliance. Explicit profile preservation is separate from validating whether the profile is permitted.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
