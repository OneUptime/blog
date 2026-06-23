# Validation Summary: How to Use Repository Dispatch in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (`repository_dispatch` event)
- GitHub REST API (Create a repository dispatch event)
- GitHub CLI (`gh api`)
- `actions/github-script@v7`
- `actions/checkout@v4`
- Octokit (`@octokit/rest`)
- Python (`requests`)
- Node.js / Express webhook receiver
- Bash (workflow shell steps)

## Sources Consulted
- GitHub REST API — Create a repository dispatch event: https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event
- GitHub fine-grained PAT permission requirements for repository dispatch (Contents: write + Metadata: read): GitHub community discussions and github/docs issue #23176
- GitHub CLI manual for `gh api` nested field handling (`-f`/`--input`): https://cli.github.com/manual/gh_api and cli/cli discussion #3955 / issue #7059
- `actions/github-script` and Octokit `repos.createDispatchEvent` method reference

## Issues Found
1. **Incorrect token permissions (Security Considerations → Token Permissions).** The post listed the required fine-grained PAT permissions as `Contents (read)` and `Actions (write)`. This is wrong: the repository dispatch endpoint (`POST /repos/{owner}/{repo}/dispatches`) requires **Contents: write** (with Metadata: read auto-selected). `Actions: write` is the permission for the *workflow* dispatch endpoint, which is a different API. Corrected the comment block to list `Contents (read and write)` and `Metadata (read)`.

2. **Non-working `gh api` example (Triggering Dispatch Events → Using GitHub CLI).** The example passed `client_payload` via `-f client_payload='{...}'`. The `gh api -f` flag sends values as plain strings, so `client_payload` would be transmitted as a string rather than the JSON object the API requires, causing the dispatch to fail or behave incorrectly. Replaced it with the supported `client_payload[subkey]=value` nested-field syntax and added a note that a full JSON body can alternatively be passed via `--input`.

## Review Notes
- The `octokit.repos.createDispatchEvent(...)` call in the webhook example works in `@octokit/rest`, though the modern canonical form is `octokit.rest.repos.createDispatchEvent(...)`. Left as-is since the top-level alias remains functional; consider standardizing on the `.rest.` form in a future edit for consistency with the `github.rest.repos.*` usage elsewhere in the post.
- The authorization check (`[[ "$ALLOWED_USERS" == *"$REQUESTING_USER"* ]]`) and the environment validation (`[[ ! "$VALID_ENVS" =~ "$ENV" ]]`) both rely on substring matching, which can produce false positives (e.g. a short value matching as a substring of a longer one). These are illustrative and functionally fine for the examples, but a production implementation should match whole tokens. Not changed as they are not strictly incorrect.
- `verifySignature` uses `crypto.timingSafeEqual`, which throws if the two buffers differ in length (e.g. a missing/malformed `x-hub-signature-256` header). Hardening this with a length check is advisable in production but the happy-path logic is correct.
- Verified correct: `github.event.action` surfaces the dispatch `event_type`; the API returns HTTP 204 on success (matches the Python example's status check); `client_payload` is limited to <64KB and 10 top-level properties; `actions/github-script@v7` and `actions/checkout@v4` are current.
