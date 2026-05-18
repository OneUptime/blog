# Validation Summary: How to Set Up Mailing Lists with Mailman 3 on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step setup guide

## Technologies Covered
- Mailman 3 (Core, Postorius, HyperKitty)
- Ubuntu 22.04 (`mailman3-full` distro package)
- Postfix (LMTP integration, transport/relay maps, postmap)
- Django (mailman-web management commands)
- Nginx (reverse proxy with TLS)
- Mailman 3 REST API (v3.1)
- SQLite / PostgreSQL (mailman.cfg `[database]` and Django `DATABASES`)

## Sources Consulted
- Mailman 3 source tree (CLI command modules under `src/mailman/commands/`) — https://gitlab.com/mailman/mailman
- Mailman 3 documentation — https://docs.mailman3.org/
- Mailman Core `schema.cfg` and bundled `mailman.config.postfix` module
- mailman-hyperkitty package source — https://gitlab.com/mailman/mailman-hyperkitty
- Postorius / HyperKitty Django app docs
- Debian/Ubuntu `mailman3-full` package metadata for the `mailman3-web` wrapper

## Issues Found

1. **`[archiver:hyperkitty]` section header** — Mailman 3 parses archiver sections with a dot, not a colon. Changed to `[archiver.hyperkitty]`.

2. **`[mta] postfix_map_cmd: /usr/sbin/postmap`** — No such option exists in `[mta]`. The correct option is `postmap_command` and it lives in the `[postfix]` section of the Postfix configuration file referenced by `[mta] configuration:`. The bundled `mailman.config.postfix` module already sets it to `/usr/sbin/postmap`, so no override is normally needed on Ubuntu. Rewrote the subsection to explain the correct mechanism and show the right override pattern (separate `postfix.cfg` file pointed at by `configuration:`).

3. **`mailman create --domain lists.example.com`** — `-d/--domain` is a boolean toggle on `mailman create` (auto-create the domain when creating a list); it does not take a value and there is no standalone "create domain" CLI command. Removed the bogus standalone line and added `-d` to the actual list-creation command.

4. **`mailman config list ...` / `mailman config set ...`** — The Mailman 3 CLI has no `config` subcommand for editing list settings. (`mailman conf` exists, but it only prints the parsed `mailman.cfg`.) Removed the invented commands and replaced the "Common settings via command line" examples with the actually-supported route: `PATCH` against `/3.1/lists/<list_id>/config` via the REST API. Noted that Postorius is the other option.

5. **`mailman addmembers --welcome-msg=no announce@lists.example.com << EOF`** — Three problems:
   - `--welcome-msg=no` is not a valid flag (Click boolean toggle uses `--no-welcome-msg` / `-W`).
   - `addmembers` takes `FILENAME LISTSPEC` as positional args, so the listspec without a filename in front shifts arguments incorrectly. `-` must be passed for stdin.
   - Input lines are parsed with `email.utils.parseaddr`, so `user1@example.com  User One` does not parse the name; lines must use RFC 822 (`Name <addr>`) or comment form (`addr (Name)`).
   Fixed all three.

6. **`mailman delmembers --file - announce@lists.example.com`** — `delmembers` requires `-l/--list LISTSPEC`; there is no positional list argument. Fixed to `delmembers -l announce@lists.example.com --file -`.

7. **`mailman info user@example.com`** — `mailman info` takes no positional arguments and only describes the Mailman instance (version, paths, REST creds). Replaced with bare `mailman info` and added a REST API example (`GET /3.1/members/<member_id>`) for inspecting per-member bounce state, since the surrounding section was discussing bounces.

8. **`/3.1/lists/.../bans` labeled as "bounce information"** — The `/bans` endpoint lists banned addresses, which is independent of bounce processing. Relabeled and added the actual per-member bounce inspection endpoint.

9. **`max_message_size` unit comment** — Comment said "(bytes)" but the field is in kilobytes per the Mailman schema. Updated to "(in KB)".

## Review Notes
- Verified other config option names and defaults are correct: `[mailman] site_owner` / `noreply_address`, the SQLite/PostgreSQL database classes, `[mta] incoming/outgoing/lmtp_port: 8024`, `[webservice]` block with port 8001, and the `mailman_hyperkitty.Archiver` class.
- The `mailman3-web` wrapper name is correct for the Ubuntu `mailman3-full` package (upstream pip-installed name is `mailman-web`; the Debian/Ubuntu package ships it as `mailman3-web`).
- Sample `SECRET_KEY` and credentials are placeholder values, which is appropriate; the post correctly flags them as needing to be changed.
- Nginx config does not include a `/archives` location for HyperKitty — in some packaging variants that path is needed for direct asset serving, but proxying everything through gunicorn (as shown) also works. Left as-is since it is not technically wrong.
- The post targets Ubuntu 22.04 specifically; on Ubuntu 24.04 the `mailman3-full` package should still work but defaults may shift over time.
