# Validation Summary: How to Set Up Linkding for Bookmark Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Linkding (self-hosted bookmark manager)
- Docker and Docker Compose
- Ubuntu
- Nginx reverse proxy
- Certbot / Let's Encrypt
- SQLite (FTS5)
- Linkding REST API
- Browser extensions (Firefox / Chrome)

## Sources Consulted
- Linkding GitHub repository: https://github.com/sissbruecker/linkding
- Linkding installation docs: https://github.com/sissbruecker/linkding/blob/master/docs/src/content/docs/installation.md
- Linkding options docs (LD_* env vars): https://github.com/sissbruecker/linkding/blob/master/docs/src/content/docs/options.md
- Linkding API docs: https://github.com/sissbruecker/linkding/blob/master/docs/src/content/docs/api.md
- Linkding keyboard shortcuts: https://github.com/sissbruecker/linkding/blob/master/docs/src/content/docs/shortcuts.md
- Linkding URL routing: `bookmarks/urls.py` in the upstream repo
- Linkding access controls: `bookmarks/views/access.py` and `bookmarks/views/bookmarks.py`
- Linkding documentation site: https://linkding.link/

## Issues Found

1. **Incorrect comment for `LD_DISABLE_BACKGROUND_TASKS`.** The post claimed this option "disables public registration." Per the official options docs, it actually disables background tasks such as Internet Archive Wayback Machine snapshot creation. Linkding has no public registration feature. Updated the comment to describe the real behavior.

2. **Incorrect comment for `LD_ENABLE_AUTH_PROXY`.** The post claimed this enables an "HTTPS redirect." Per the official options docs, it enables support for authentication proxies such as Authelia (disables credential login and authenticates via request headers). Updated the comment.

3. **Wrong keyboard shortcut for adding a bookmark.** The post said the shortcut is `a`. The official shortcuts doc lists `n` for "Add new bookmark." Changed `a` to `n`.

4. **Non-existent admin user-creation URL.** The post directed readers to `/settings/users/add` to add a non-admin user. That route does not exist in `bookmarks/urls.py`. Linkding exposes the Django admin at `/admin/`, and users are added at `/admin/auth/user/add/`. Updated the URL.

5. **Non-existent public sharing URL.** The post documented `https://bookmarks.example.com/public/<username>/`. No such route exists. Public-shared bookmarks (when a user's profile has `enable_public_sharing` and individual bookmarks are marked `shared`) are accessed through `/bookmarks/shared`, optionally filtered by `?user=<username>`. Updated the URL accordingly.

6. **Non-existent REST API export endpoint.** The post used `GET /api/bookmarks/export/`. The Linkding REST API has no such endpoint (the actual bookmark routes are list/archived/check/retrieve/create/update/archive/unarchive/delete). Export is only available through the web UI at `/settings/export`. Rewrote the Netscape-HTML export step to point at `/settings/export`; left the JSON-via-list-endpoint example, which does work.

## Review Notes

- The `version: "3.8"` line in `docker-compose.yml` is obsolete with modern Docker Compose v2 (it emits a warning) but is harmless and still parses correctly. Left as-is to avoid stylistic changes.
- The `docker-compose-plugin` package is the correct modern install path on Ubuntu; the post correctly uses `docker compose` (v2 plugin syntax) rather than `docker-compose` (v1).
- The `sissbruecker/linkding:latest` image, port 9090, and `/etc/linkding/data` volume mount path all match upstream documentation.
- The `Authorization: Token <token>` header format for the REST API is correct.
- The `?q=%23devops` URL-encoded tag search example is correct (`%23` = `#`, and Linkding's search supports `#tag` syntax).
- The SQLite FTS5 claim is accurate; Linkding uses Django's FTS-backed search on SQLite.
- Linkding does run database migrations automatically on container start, so the update procedure is correct.
- The `python manage.py changepassword` and `createsuperuser` Django management commands are valid inside the container.
