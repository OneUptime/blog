# Validation Summary: How to Build GitHub Actions Custom Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions custom actions
- JavaScript actions and the GitHub Actions Toolkit
- Docker container actions
- Composite actions
- Slack incoming webhooks
- npm and ncc bundling
- Python Bandit security scanning

## Sources Consulted
- GitHub Docs: Metadata syntax reference for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax
- GitHub Docs: Creating a JavaScript action - https://docs.github.com/en/actions/tutorials/create-actions/create-a-javascript-action
- GitHub Docs: Creating a Docker container action - https://docs.github.com/en/actions/tutorials/use-containerized-services/create-a-docker-container-action
- GitHub Docs: Creating a composite action - https://docs.github.com/en/actions/tutorials/create-actions/create-a-composite-action
- GitHub Docs: Publishing actions in GitHub Marketplace - https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace
- GitHub Blog: Deprecation of Node 20 on GitHub Actions runners - https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
- GitHub actions/cache repository documentation - https://github.com/actions/cache
- GitHub actions/checkout repository documentation - https://github.com/actions/checkout
- GitHub actions/setup-node repository documentation - https://github.com/actions/setup-node
- Slack Developer Docs: Sending messages using incoming webhooks - https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Bandit documentation: command line options - https://bandit.readthedocs.io/en/latest/man/bandit.html
- Bandit documentation: JSON formatter - https://bandit.readthedocs.io/en/latest/formatters/json.html
- npm CLI help output for `npm init` and `npx` from npm 10.9.4

## Issues Found
- The JavaScript action used `runs.using: node20`, which is deprecated for GitHub Actions runners as of 2026. Updated the example to `node24`.
- The JavaScript action pointed `runs.main` at `index.js` while the directory structure included `node_modules`. GitHub's JavaScript action guidance says not to commit `node_modules`; actions should use a bundled `dist` file. Updated the tree and metadata to use `dist/index.js`, and added `@vercel/ncc` bundling commands.
- The Slack output was named and described as a Slack message timestamp, but incoming webhooks return `HTTP 200` with `ok`, not a message timestamp. Renamed the output to `sent-at` and described it as a local timestamp recorded after Slack accepts the request.
- The Slack webhook payload lacked top-level `text`, while Slack documents `text` in webhook payloads and lists `no_text` as a possible error. Added a top-level fallback `text` field while keeping the rich message blocks.
- The Docker/Bandit example compared severities lexicographically, which gives incorrect threshold results such as `high` not being greater than `medium`. Replaced the comparison with an explicit severity ordering map.
- The workflow examples referenced older Node 20-based action majors: `actions/setup-node@v4`, `actions/cache@v4`, and `actions/checkout@v4`. Updated them to current Node 24-compatible majors: `actions/setup-node@v6`, `actions/cache@v5`, and `actions/checkout@v6`.

## Review Notes
The JavaScript snippet was syntax-checked locally with Node. Local YAML parsing was not available because Ruby was not installed in the workspace, so YAML correctness was reviewed against GitHub's metadata syntax documentation.
