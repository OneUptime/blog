# Validation Summary: How to Fix 'Post-Mortem' Documentation Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Markdown
- Mermaid flowcharts
- Python
- Python `datetime`
- Python `requests`
- Slack Block Kit message payloads
- Jira/JQL
- YAML
- Incident management and post-mortem process

## Sources Consulted
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- Slack Block Kit button element documentation: https://docs.slack.dev/reference/block-kit/block-elements/button-element/
- Atlassian Jira Cloud JQL functions documentation: https://support.atlassian.com/jira-software-cloud/docs/jql-functions/

## Issues Found
- The post-mortem template used a fenced Markdown block containing another triple-backtick log block, which prematurely closed the outer fence. Changed the outer fence to four backticks and made the nested log block a valid `text` fence.
- The `postmortem_generator.py` snippet used `timedelta` without importing it. Added `timedelta` to the `datetime` import.
- The incident duration calculation used `delta.seconds`, which ignores whole days in a `timedelta`. Changed it to use `delta.total_seconds()` so multi-day incidents are calculated correctly.
- The `action_item_tracker.py` snippet used `datetime.now()` without importing `datetime`. Added the missing import.
- The action item tracker called an undefined `_avg_completion_time()` method. Added the helper method so the snippet is internally complete.
- The action item tracker subtracted potentially string-based Jira dates from `datetime.now()`. Added `_parse_datetime()` and used it for overdue and completion-time calculations.

## Review Notes
The Python snippets are illustrative and still assume compatible `incident_api`, `docs_api`, Jira, and Slack client interfaces supplied by the reader's environment. The Jira query pattern for overdue items is consistent with Atlassian's documented `now()` examples, and the Slack button payload fields align with Slack Block Kit documentation.
