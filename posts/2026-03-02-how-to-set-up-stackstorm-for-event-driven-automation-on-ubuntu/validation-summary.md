# Validation Summary: How to Set Up StackStorm for Event-Driven Automation on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- StackStorm (st2) - event-driven automation platform
- Orquesta - StackStorm's YAML-based workflow engine
- MongoDB, RabbitMQ, Redis (StackStorm dependencies)
- Nginx (web frontend)
- Python (custom action runner)
- YAQL (workflow expression language)
- Ubuntu 20.04 / 22.04
- StackStorm Exchange packs (core, linux, slack, pagerduty, ansible)
- StackStorm webhooks and API keys

## Sources Consulted
- StackStorm Installation docs: https://docs.stackstorm.com/install/index.html
- StackStorm Actions docs: https://docs.stackstorm.com/actions.html
- StackStorm Rules docs: https://docs.stackstorm.com/rules.html
- StackStorm Webhooks docs: https://docs.stackstorm.com/webhooks.html
- StackStorm Authentication docs: https://docs.stackstorm.com/authentication.html
- Orquesta Workflow Definition: https://docs.stackstorm.com/orquesta/languages/orquesta.html
- Orquesta Getting Started: https://docs.stackstorm.com/orquesta/start.html
- Orquesta Workflow Runtime Context: https://docs.stackstorm.com/orquesta/context.html
- StackStorm CLI Reference: https://docs.stackstorm.com/reference/cli.html
- StackStorm Real-time Action Output Streaming: https://docs.stackstorm.com/reference/action_output_streaming.html
- StackStorm Packs reference: https://docs.stackstorm.com/packs.html
- GitHub issue on Orquesta result(): https://github.com/StackStorm/st2/issues/4430
- StackStorm Forum on Python action result access: https://forum.stackstorm.com/t/how-to-store-a-python-script-output-to-a-variable-using-publish-in-workflow-scripts/1788

## Issues Found

1. **Incorrect Orquesta result access syntax** (two occurrences in the workflow YAML).
   - Before: `<% succeeded() and result().output.is_critical %>` and `<% succeeded() and not result().output.is_critical %>`
   - After: `<% succeeded() and result().is_critical %>` and `<% succeeded() and not result().is_critical %>`
   - Why: For native Python actions, `result()` returns the dict returned by the action's `run()` method directly. The `.output` accessor is needed only when the called action is itself an Orquesta workflow that defines an `output` block. Using `result().output.is_critical` against a Python action whose return value is a flat dict would fail to resolve the variable.

2. **Python action return value caused workflow branch to be unreachable.**
   - Before: `return (not result['is_critical'], result)`
   - After: `return (True, result)`
   - Why: StackStorm Python actions return a `(success_bool, result_data)` tuple where `success_bool` determines whether the task succeeded. With the original return, the action would fail whenever `is_critical` was True, which means the workflow's `<% succeeded() and result().is_critical %>` branch (the `clean_logs` path) could never match — the task would have already failed. Returning `(True, result)` lets the workflow use the data dict to branch as the surrounding tutorial clearly intends.

## Review Notes

- The one-line installer URL, flags (`--user`, `--password`), and the list of supported Ubuntu versions (20.04, 22.04) match the official StackStorm documentation. Ubuntu 24.04 is not yet officially supported by the packaged installer at the time of review.
- The `core` pack is in fact bundled with StackStorm out of the box. `st2 pack install core` is therefore typically unnecessary, but is generally a no-op / upgrade if the pack is also available in the Exchange — left as-is because it does not introduce a technical error.
- `st2 execution tail`, `st2 apikey create -k`, `st2 rule-enforcement list --rule ...`, and the rule criteria operator `equals` were all verified against current docs and source.
- The webhook URL pattern `https://<host>/api/v1/webhooks/<url>` and the use of `St2-Api-Key` header for authentication are correct.
- YAQL `ctx(varname)` is a valid context-access form (along with `ctx().varname` and `ctx("varname")`) per the Orquesta context documentation.
- The Orquesta workflow `version: 1.0` and overall structure (input, tasks, next/when/do transitions) are correct.
