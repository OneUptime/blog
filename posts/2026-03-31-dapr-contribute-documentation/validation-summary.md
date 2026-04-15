# Validation Summary: How to Contribute to Dapr Documentation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Hugo (static site generator)
- Git / GitHub CLI (`gh`)
- npm
- markdown-link-check
- Hugo shortcodes (tabs, codetab)

## Sources Consulted
- Dapr docs repository: https://github.com/dapr/docs
- Dapr docs directory structure on v1.14 branch: https://github.com/dapr/docs/tree/v1.14/daprdocs/content/en
- Dapr docs front matter conventions (verified via actual files in the repo)
- Dapr translation repositories: https://github.com/dapr/docs-zh, https://github.com/dapr-cn/docs
- Verified `dapr/docs-kr` does not exist (returns 404)
- Hugo CLI documentation (confirming `hugo serve` is a valid alias for `hugo server`)

## Issues Found

### 1. Non-existent translation repository reference (line 22)
- **What was wrong:** The post referenced `dapr/docs-kr` and `dapr/docs-zh` as translation repositories. `dapr/docs-kr` does not exist (404). `dapr/docs-zh` exists but is a minimal staging repo that directs contributors to `dapr-cn/docs` instead.
- **What was changed:** Replaced `(via \`dapr/docs-kr\`, \`dapr/docs-zh\`, etc.)` with `(via community translation repos such as \`dapr-cn/docs\` for Chinese)`.
- **Why:** Pointing contributors to a non-existent repo would cause confusion. The active Chinese translation repo is `dapr-cn/docs`.

### 2. Unescaped inner code fences in "Use Includes for Repeated Content" section (lines 118-127)
- **What was wrong:** The inner code fences (` ```bash `, ` ```yaml `, and their closing ` ``` `) inside the outer ` ```markdown ` code block were not escaped with backslashes. This causes broken markdown rendering — the first inner ` ``` ` would prematurely close the outer code block.
- **What was changed:** Added backslash escaping (`\` ``` `) to all four inner code fences, matching the convention already used in the earlier "Add Code Blocks with Language Tags" section.
- **Why:** Without escaping, the rendered blog post would show broken/fragmented code blocks instead of the intended single block showing the Hugo shortcode example.

### 3. Stray language tag on closing code fence (line 131)
- **What was wrong:** The closing fence of the "Use Includes for Repeated Content" code block was ` ```bash ` instead of ` ``` `. This would open a new bash code block instead of closing the existing one.
- **What was changed:** Removed `bash` from the closing fence so it is just ` ``` `.
- **Why:** The stray language tag would cause the rest of the blog post to render inside a code block.

## Review Notes
- `hugo serve` and `hugo server` are both valid Hugo commands (they are aliases). The official Dapr docs README uses `hugo server`, but the blog's use of `hugo serve` is not incorrect.
- The front matter template (`type: docs`, `title`, `linkTitle`, `weight`, `description`) was verified against actual files in the dapr/docs repo and is accurate.
- The `daprdocs/content/en/` directory structure with `concepts/`, `developing-applications/`, `reference/`, and `operations/` was verified against the v1.14 branch.
- The `git commit -s` flag for DCO sign-off is correct — Dapr requires Developer Certificate of Origin.
- The `apiVersion: dapr.io/v1alpha1` for Dapr components is still the current API version.
- The Dapr Go SDK's `dapr.NewClient()` syntax is correct.
