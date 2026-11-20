# Validation summary

Checked Kubernetes 1.36 stable API availability against the versioned guide and v0.36.0 definitions. Reviewed the two mutation styles against their tagged implementation and distinguished the optional token default from security enforcement.

## Local checks

Both policy variants and the binding passed official v1.36.0 OpenAPI shape checks. All three CEL expressions parsed with cel-go0.26.0. The absence condition compiled and executed against omitted, true and false fixtures. The Object and JSONPatch mutation constructors were not typechecked or executed in a Kubernetes CEL environment. Generated and visually reviewed the social image; its title is fully visible.

## Limits

No policy was installed and no admission request was sent. Schema and parser checks cannot prove actual API-server acceptance, mutation, reinvocation or workload compatibility. The article requires staging checks before replacing the existing webhook. Sources are linked near claims and recorded in validation.json.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
