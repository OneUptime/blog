# Validation Summary: How to Build an Incident Response Process

## Status
validated

## Post Type
Guide / Tutorial — practical walkthrough of building an incident response process with code automation examples for each phase (detection, triage, response, mitigation, postmortem, metrics).

## Technologies Covered
- Python (`requests`, `datetime`, `statistics`, `slack_sdk`)
- Slack Web API (`slack_sdk.WebClient`: `conversations_create`, `conversations_setTopic`, `conversations_invite`, `conversations_info`, `chat_postMessage`)
- Slack Block Kit (header, section, actions, mrkdwn blocks)
- Bash / shell scripting
- `kubectl` (`rollout history`, `rollout undo`, `rollout status`, `get deployment`)
- Jira REST API v2 (`/rest/api/2/issue`, `/rest/api/2/search`) and JQL
- Mermaid diagrams (flowchart syntax)
- SRE concepts: MTTD, MTTA, MTTR, severity matrix, blameless postmortems, incident commander roles

## Sources Consulted
- Slack API docs — conversations.create, conversations.setTopic, conversations.invite, conversations.info, chat.postMessage: https://api.slack.com/methods
- slack_sdk Python library reference: https://slack.dev/python-slack-sdk/web/
- Slack Block Kit reference: https://api.slack.com/block-kit
- kubectl rollout reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#rollout
- kubectl rollout history output format and `rollout undo` semantics (defaults to previous revision)
- Jira Cloud REST API v2 — issue create & search endpoints: https://developer.atlassian.com/cloud/jira/platform/rest/v2/
- JQL `duedate < now()` syntax: https://support.atlassian.com/jira-software-cloud/docs/advanced-search-reference-jql-fields/
- Python `datetime` and `statistics` module documentation (3.x): https://docs.python.org/3/library/
- Google SRE Book — incident response chapter (terminology cross-check): https://sre.google/sre-book/managing-incidents/

## Issues Found
- **Bash rollback script — wrong revision extraction.** In the `rollback.sh` example, the line that pulls the current revision was:
  ```bash
  CURRENT_REV=$(kubectl rollout history deployment/"$SERVICE" -n "$NAMESPACE" | tail -2 | head -1 | awk '{print $1}')
  ```
  `kubectl rollout history` prints a header (`deployment.apps/...` then `REVISION  CHANGE-CAUSE`) followed by revisions in ascending order, with the newest revision on the last line. `tail -2 | head -1` therefore returns the *second-most-recent* revision, not the current one. The downstream `PREVIOUS_REV=$((CURRENT_REV - 1))` and the audit log then record incorrect numbers. Fixed by changing to `tail -1`, which selects the latest revision line:
  ```bash
  CURRENT_REV=$(kubectl rollout history deployment/"$SERVICE" -n "$NAMESPACE" | tail -1 | awk '{print $1}')
  ```
  Note: the actual `kubectl rollout undo` call doesn't depend on these variables (it rolls back to the previous revision by default), so service behavior was unaffected — only the printed/logged revision numbers were wrong.

## Review Notes
- `datetime.utcnow()` is used throughout the Python examples. It is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. Still works on current interpreters, but worth modernizing in a future pass.
- The Jira examples use the REST API v2 paths (`/rest/api/2/issue`, `/rest/api/2/search`). For Jira Cloud, `/rest/api/2/search` was deprecated in 2025 in favor of `/rest/api/3/search/jql` (with paging changes). The v2 paths still work for Jira Server / Data Center. Also, in modern Jira Cloud the `assignee` field expects `accountId` rather than `name` due to GDPR-driven API changes (since 2019). For self-hosted Jira, `name` still applies. Left as-is because the post doesn't specify the deployment type, but readers using Jira Cloud should adjust.
- `slack_sdk` `conversations_invite` accepts `users` as a comma-separated string of user IDs. Passing a single string per call (as the script does in its loop) works fine, just slightly less efficient than batching.
- Slack channel names have constraints (lowercase, no spaces, only letters/digits/hyphens/underscores/periods, ≤80 chars). The `slug = title.lower().replace(' ', '-')[:30]` step handles spaces and length but won't strip other punctuation; in practice, an incident title with characters like `/`, `:`, or `!` would cause `conversations.create` to fail. Acceptable for a teaching example.
- `triage_helper.py` imports `subprocess` but never uses it — minor cleanup opportunity.
- The `p95_minutes` calculation `sorted(recovery_times)[int(len(recovery_times) * 0.95)]` is a simple percentile approximation; for small sample sizes a method like `statistics.quantiles(..., n=20)[18]` or `numpy.percentile` would be more accurate. Fine for the illustrative purpose here.
- Mermaid diagrams are syntactically valid.
- SRE terminology (severity matrix, role definitions, MTTD/MTTA/MTTR, blameless postmortems, follow-the-sun rotations) aligns with widely accepted industry practice (Google SRE, PagerDuty/Atlassian incident response guides).
