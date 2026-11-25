# Validation summary

Reviewed private-state placement separately from presentation contents and serving access.

## Sources reviewed

- https://github.com/darold/pgbadger/blob/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger
- https://docs.python.org/3.11/library/pathlib.html
- https://nginx.org/en/docs/http/ngx_http_core_module.html#root

## Checks performed

Ran pgBadger13.3 under Perl5.34.1 on synthetic duration logs. Initial generation placed binary/default checkpoint files only in the state tree and HTML/assets in the separate destination. An append and repeated input retained three queries. Rebuilding a fresh HTML destination and its monthly page preserved state hashes; local JavaScript/CSS paths resolved. The monthly command requires explicit-I with-H in this release, verified by failure and corrected success.

Executed every article shell block with substituted local paths. The exact publication checker ran under Python3.11.13, accepted24 expected files, and rejected a binary, checkpoint, JSON export and symbolic link. Existing directory reuse failed; mode700/750 settings were checked.

The eight-node/eight-edge diagram passed structural checking. Generated and visually reviewed the1280x720 image with two title lines.

## Limits

No production database, HTTP server, authentication/TLS path or separate Unix-account boundary was tested. NGINX root behavior was documentation-reviewed. The packaging checker is deliberately limited to a trusted stable HTML-only tree and does not sanitize content or prevent races. Per-database/calendar variants and browser-rendered Mermaid were not tested.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
