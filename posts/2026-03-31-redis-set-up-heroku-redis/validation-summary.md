# Validation Summary: How to Set Up Heroku Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Heroku (PaaS)
- Heroku Redis (managed Redis add-on)
- Heroku CLI
- Redis
- Node.js with ioredis
- Python with redis-py

## Sources Consulted
- Heroku Dev Center: Managing Heroku Key-Value Store Using the CLI — https://devcenter.heroku.com/articles/managing-heroku-redis-using-cli
- Heroku Dev Center: Heroku Key-Value Store — https://devcenter.heroku.com/articles/heroku-redis
- Heroku Dev Center: Heroku Key-Value Store Technical Characterization — https://devcenter.heroku.com/articles/heroku-redis-technical-characterization
- Heroku Dev Center: Data Maintenance CLI Commands — https://devcenter.heroku.com/articles/data-maintenance-cli-commands
- Heroku Changelog: Free resources removal (Nov 2022) — https://devcenter.heroku.com/changelog-items/2502
- ioredis GitHub repository and source code (TLS/URL parsing behavior)
- redis-py source code (SSLConnection and from_url behavior)

## Issues Found

1. **"Free Hobby Dev plan" label (line 18 comment)**: The comment said "Add the free Hobby Dev plan" but the command provisions the `mini` plan, which costs $3/month. Heroku eliminated all free tiers in November 2022. Fixed comment to "Add the entry-level Mini plan".

2. **`heroku redis:stats` is not a valid command (line 107)**: The `heroku redis:stats` subcommand does not exist in the Heroku Redis CLI plugin. The valid command for viewing Redis information and statistics is `heroku redis:info`. Removed the invalid command; the section now only shows `heroku redis:info`.

3. **"The free `mini` plan" (line 112)**: The `mini` plan is not free — it's $3/month. Removed the word "free" and changed "paid plan" to "larger plan" since mini is already paid.

4. **`heroku redis:maxmemory` incorrect syntax (line 123)**: The command was `heroku redis:maxmemory your-app-name --policy allkeys-lru`, which incorrectly passes the app name as the Redis instance argument. The first positional argument should be the Redis instance name or config var (e.g., `REDIS_URL`), and the app name should be passed via `--app`. Fixed to `heroku redis:maxmemory REDIS_URL --policy allkeys-lru --app your-app-name`.

5. **Maintenance window format (line 133)**: The window was specified as a time range `"Sunday 06:00-08:00 UTC"`, but Heroku maintenance windows only take a start time (the window duration is automatic). Fixed to `"Sunday 06:00"`.

6. **Summary references "free plan" (line 138)**: Changed "upgrade from the free plan" to "upgrade from the mini plan" to reflect that there is no free tier.

## Review Notes
- The `heroku redis:maintenance` command may have been superseded by `heroku data:maintenances:window:update` in newer versions of the Heroku CLI. The older command was kept since it is still commonly referenced, but authors may want to update to the newer command syntax in the future.
- The ioredis and redis-py code examples are correct and follow best practices for connecting to Heroku Redis with self-signed certificates.
- Plan tier details (mini = 25 MB, premium-0 through premium-14, premium-14 = 100 GB) are accurate per Heroku's technical characterization documentation.
- The `rediss://` URL scheme explanation is correct — double-s indicates TLS.
