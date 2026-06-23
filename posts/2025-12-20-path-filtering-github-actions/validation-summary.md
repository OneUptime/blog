# Validation Summary: How to Use Path Filtering in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflow `on.push`/`on.pull_request` path filters, `paths`, `paths-ignore`)
- GitHub Actions glob/filter pattern syntax
- dorny/paths-filter action
- actions/checkout, actions/setup-node
- npm workspaces (`npm test --workspace`, `npm run build --workspace`)
- Bash scripting (associative arrays, `git diff`, `jq`)
- Matrix strategy / `fromJson`
- Mermaid diagram

## Sources Consulted
- GitHub Docs — Workflow syntax for GitHub Actions, "Filter pattern cheat sheet" (raw source: https://raw.githubusercontent.com/github/docs/main/content/actions/reference/workflows-and-actions/workflow-syntax.md ; rendered: https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- GitHub Docs — Events that trigger workflows / using paths to control workflow runs
- dorny/paths-filter repository and Marketplace listing (https://github.com/dorny/paths-filter)
- minimatch documentation (brace expansion / `magicalBraces` behavior) (https://isaacs.github.io/minimatch/)
- GitHub community discussion #26770 (branch + path triggers)

## Issues Found
1. **Incorrect description of `?` in the Glob Pattern Reference.** The post labeled `'config?.json'` as "Any single character." Per GitHub's official filter pattern cheat sheet, `?` "Matches zero or one of the preceding character" (e.g. `*.jsx?` matches `page.js` and `page.jsx`). So `config?.json` matches `config.json` or `confi.json`, not "any single character." Fixed the comment to accurately describe the behavior.

2. **Unsupported brace-expansion example in native path filters.** The post showed `'src/**/*.{ts,tsx}'` under "Multiple extensions" within an `on.push.paths` block. GitHub's native path/branch filtering supports only the characters documented in the cheat sheet (`*`, `**`, `?`, `+`, `[]`, `!`); brace expansion like `{ts,tsx}` is not supported for native event path filters. Replaced with two explicit patterns (`'src/**/*.ts'` and `'src/**/*.tsx'`) and a clarifying comment.

3. **Broken `${{ steps.changes.outputs[pkg] }}` loop in "Dependent Path Filtering".** GitHub Actions `${{ }}` expressions are interpolated before the bash script executes, so the bash loop variable `pkg` cannot index `steps.changes.outputs[...]` — the expression always evaluated to empty and the "Direct changes" detection never matched. Replaced the loop body with an explicit per-package read of each filter output into a bash associative array (`CHANGED_PKG[core]="${{ steps.changes.outputs.core }}"`, etc.), keeping the rest of the dependency-graph logic intact.

## Review Notes
- The post pins `dorny/paths-filter@v3`. This is still valid and functional; the current latest is v4 (v4 requires Node 24). No change made since v3 is not incorrect.
- `npm test -- --testPathPattern=...` uses Jest's `--testPathPattern` flag, which is correct for Jest < 30 (renamed to `--testPathPatterns` in Jest 30). Left as-is since it is a generic illustrative command and valid for widely-deployed Jest versions.
- `actions/checkout@v4` and `actions/setup-node@v4` are current and correct.
- The 70-90% CI-time reduction and the diagram's time figures are illustrative estimates, not verifiable claims; left unchanged.
- The unquoted `for file in $CHANGED_FILES` word-splitting in the monorepo script is a common idiom and works for paths without spaces; left as-is.
