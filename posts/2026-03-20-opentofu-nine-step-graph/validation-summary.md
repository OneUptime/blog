# Validation Summary: OpenTofu's Nine-Step Graph Walk Algorithm

## Status
validated

## Post Type
Reference / Conceptual guide explaining the lifecycle of `tofu plan` and `tofu apply` operations.

## Technologies Covered
- OpenTofu (CLI: `tofu plan`, `tofu apply`, `tofu validate`)
- HCL configuration syntax
- AWS provider configuration (`provider "aws"`, `assume_role`)
- Check blocks and scoped data sources (`http` data source)
- TF_LOG environment variable

## Sources Consulted
- OpenTofu Init command documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu Plan command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu Checks documentation: https://opentofu.org/docs/language/checks/
- OpenTofu Graph Internals: https://opentofu.org/docs/internals/graph/

## Issues Found

1. **Step 2 (Module Loading) — corrected contradiction.** The post originally claimed plan/apply "Downloads modules not in .terraform/modules/" while also showing the error "Module not installed (run tofu init)". Per the OpenTofu init documentation, module installation (downloading source from registries, Git, or local paths) happens during `tofu init`, not during plan/apply. Plan/apply only loads already-installed modules from `.terraform/modules/`. Updated the bullet list and error messages to reflect this correctly so the section is internally consistent and matches official behavior.

## Review Notes

- The "nine-step graph walk algorithm" framing is the author's conceptual model for the plan/apply lifecycle. It is not an officially named OpenTofu algorithm — per the OpenTofu graph internals docs, graph walking itself is a depth-first parallel traversal, while graph *building* is the multi-step process. The framing is acceptable for an explainer post but readers should not expect to find this exact terminology in the OpenTofu source or docs.
- Step 9 ("Post-Apply Checks") frames check blocks as a post-apply event. Per the OpenTofu docs, check blocks actually execute "as the last step of a plan *or* apply", so they also run at the end of plan operations (not only after apply). The post's narrative arc (steps 7→8→9) treats this from the apply perspective; the framing is consistent within the post but the "post-apply only" implication slightly understates when check blocks fire. Left as-is to preserve the author's structural model.
- The `-parallelism` default of 10, `-refresh=false`, `-refresh-only`, and the plan output symbols (`+`, `-`, `~`, `-/+`, `+/-`, `<=`) all verified correct.
- Check block syntax (with scoped data source and `assert` block containing `condition` and `error_message`) verified correct against the OpenTofu language reference.
- The TF_LOG=TRACE log message excerpts ("Building and walking apply graph", "Checking for post-conditions", "Refreshing state") are presented as illustrative; exact strings vary by version but are representative of the kind of output users will see.
