# Validation summary

Reviewed stable logical IDs and declarative moves against CDKTF0.21.0 source and Terraform documentation. The article distinguishes an address-only change from provider argument changes and from cross-state migrations.

## Executed checks

The original application and both replacement blocks match compiled/synthesized fixtures. With Terraform1.11.4 and Random3.6.3, established a local pet resource, then compared unmapped, stable-ID and moved variants through saved-plan JSON. Unmapped proposed delete/create; the other variants retained the object. Applied the mapped saved plan and verified the original pet name remained identical. The unmapped destructive plan was never applied. Shell syntax and the six-node/six-edge Mermaid graph passed structural checks.

## Limits

This is a local Random provider test, not a cloud resource or remote backend migration. Synthesis ran the configured TypeScript app directly. The initial fixture apply used auto-approve; the article keeps reader confirmation. Indexed and cross-state migrations were not executed. Mermaid was not browser-rendered. Official source links are in the article and validation.json.

The generated1280x720 social image was visually reviewed; the title fits and is fully readable.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
