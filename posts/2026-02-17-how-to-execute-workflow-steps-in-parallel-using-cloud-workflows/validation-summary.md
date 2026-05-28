# Validation Summary: How to Execute Workflow Steps in Parallel Using Cloud Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Workflows
- Workflows YAML syntax
- Parallel branches
- Parallel for loops
- Shared variables
- Concurrency limits
- Workflows error handling
- Workflows HTTP calls

## Sources Consulted
- Google Cloud Workflows parallel steps syntax: https://docs.cloud.google.com/workflows/docs/reference/syntax/parallel-steps
- Google Cloud Workflows execute workflow steps in parallel guide: https://docs.cloud.google.com/workflows/docs/execute-parallel-steps
- Google Cloud Workflows expressions syntax: https://docs.cloud.google.com/workflows/docs/reference/syntax/expressions
- Google Cloud Workflows maps syntax: https://docs.cloud.google.com/workflows/docs/reference/syntax/maps
- Google Cloud Workflows conditions and switch syntax: https://cloud.google.com/workflows/docs/reference/syntax/conditions
- Google Cloud Workflows jumps syntax: https://cloud.google.com/workflows/docs/reference/syntax/jumps
- Google Cloud Workflows `list.concat` standard library reference: https://docs.cloud.google.com/workflows/docs/reference/stdlib/list/concat

## Issues Found
- The basic parallel example declared `weather_data`, `news_data`, and `stock_data` as shared variables without first creating them in the parent scope. Added an `init` step that initializes those shared variables to `null`.
- The shared variables example caught HTTP errors but then continued to steps that referenced undefined response variables. Added `next: continue` after incrementing the error counter in each branch so the failed branch exits cleanly.
- Several parallel branch examples used `next: end` to exit a branch after handling an error. Changed those to `next: continue`, which is the documented way to exit a single parallel branch or iteration early.
- Several expressions contained inline map literals with colons and were not quoted, which can be parsed incorrectly by YAML. Wrapped those expressions in single quotes per the Workflows expression syntax guidance.
- The notification example embedded `${e.message}` inside inline YAML maps, which is invalid YAML. Changed those assignments to block-style maps with expression values.
- The SMS skip path placed `assign` directly inside a `switch` condition. Changed it to use embedded `steps`, which is the supported switch syntax for executing assignments.

## Review Notes
- The post's claims about parallel branches, parallel iteration, explicit shared variables, `concurrency_limit`, and default unhandled exception behavior match the current Google Cloud Workflows documentation.
- Local validation confirmed that all YAML code fences parse as YAML after the fixes. A live Cloud Workflows deployment validation was not run because `gcloud` is not installed in this workspace.
