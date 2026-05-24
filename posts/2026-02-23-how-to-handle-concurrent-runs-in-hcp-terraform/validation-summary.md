# Validation Summary: How to Handle Concurrent Runs in HCP Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- HCP Terraform (formerly Terraform Cloud)
- HCP Terraform Runs API (`/api/v2/...`)
- Terraform CLI
- GitHub Actions
- jq (JSON processing)
- Bash / curl

## Sources Consulted
- HCP Terraform Runs API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HCP Terraform "List Runs in an Organization" endpoint docs (same page)
- HCP Terraform "Cancel a Run" and "Discard a Run" endpoint docs (same page)
- HashiCorp Support: HCP Terraform Limits — https://support.hashicorp.com/hc/en-us/articles/4414055267603-HCP-Terraform-Limits
- HashiCorp Terraform pricing page: https://www.hashicorp.com/products/terraform/pricing

## Issues Found

1. **Outdated tier name "Plus"** — The HCP Terraform paid tiers in 2026 are Essentials, Standard, Premium, and Enterprise. "Plus" is no longer a current tier name. Renamed "Plus" to "Premium" in the tier bullet list. Also tightened the Standard description (the original "Varies by contract" was vague; replaced with "Higher concurrency than Free" to stay accurate without committing to a specific number, since published limits vary across HashiCorp docs).

2. **Wrong action for canceling a queued run** — The post used `POST /runs/:run_id/actions/cancel` to cancel a queued (pending) run. Per the API docs, `cancel` only applies to runs that are actively planning or applying (returns 409 otherwise). For pending/queued runs awaiting confirmation or priority, the correct action is `discard` (`POST /runs/:run_id/actions/discard`). Updated the endpoint and the surrounding prose to clarify when to use each.

3. **Non-existent run attribute `is-speculative`** — The jq selector filtered on `.attributes["is-speculative"]`, which is not a documented run attribute. The correct attribute for speculative plans is `plan-only`. Updated the jq filter to select on `plan-only`.

4. **Invalid query parameter `filter[from]`** — The "List Runs in an Organization" endpoint does not accept `filter[from]` with an ISO timestamp. The only documented time filter is `filter[timeframe]`, which accepts an integer year or the literal string `"year"` (for the past year). Updated the concurrency-report script to use `filter[timeframe]=year` and added a jq-side filter on `created-at` to restrict the result set to the last 24 hours. Added a brief comment in the script explaining the limitation.

## Review Notes
- The Free tier of HCP Terraform is scheduled to reach end-of-life on March 31, 2026 (~5 weeks after this post's publish date). Strategies in the "Free Tier" section will become irrelevant for new sign-ups after that date — worth a follow-up post or an editor's note if the article is still being promoted later in 2026.
- Concurrent-run limits per paid tier vary between HashiCorp's own docs (e.g., the support article says Standard = 3) and third-party summaries (some cite 10 for Standard, 200 for Premium). The post wisely avoids hard numbers for paid tiers after the fix; keeping it general is the safer call until HashiCorp publishes a single canonical limits table.
- The `terraform plan -target=...` example correctly notes it is CLI-driven mode only; HCP Terraform's VCS-driven runs do not expose `-target`.
- The GitHub Actions YAML uses `actions/checkout@v4`, which is current.
- The `filter[status]=pending` and `filter[status]=planning` calls are valid per the documented filter parameter list.
