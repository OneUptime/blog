# Validation summary

Reviewed the distinction between rebuilding presentation and reprocessing source logs.

## Sources reviewed

- https://github.com/darold/pgbadger/releases/tag/v13.2
- https://github.com/darold/pgbadger/releases/tag/v13.3
- https://github.com/darold/pgbadger/blob/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger
- https://docs.python.org/3.11/library/hashlib.html#hashlib.file_digest

## Checks performed

Executed a13.2-to-13.3 rebuild using official tagged programs under Perl5.34.1. Three synthetic statements across two days retained count3 and30ms. Daily and weekly HTML refreshed their generator version; existing monthly HTML remained unchanged until explicitly rebuilt. Binary and default checkpoint hashes matched.

A sentinel asset demonstrated that present resources survive a rebuild. Moving the major-version13 resource directory aside caused regeneration of20 assets. All local JavaScript/CSS references resolved. Removing a day binary in a disposable copy left its old HTML marker in place. These limits are explained in the article.

Executed all article shell commands with local path substitutions. The exact Python manifest ran under3.11.13, produced matching before/after files, detected a changed checkpoint and rejected the expected missing-input shape. Existing review-path reuse was rejected. The eight-node/seven-edge diagram passed structural checks; the1280x720 generated image was visually reviewed with three title lines.

## Limits

No live database, browser or production web server was involved. The combined layout and specific13.2/13.3 version pair were tested, not every older format. Per-database, custom checkpoint and separate HTML layouts require separate rehearsal. No performance benchmark or browser-rendered Mermaid check was performed.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
