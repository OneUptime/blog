# Validation Summary: How to Deploy Supabase via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Supabase
- Portainer
- Docker Compose
- PostgreSQL
- Supabase Auth
- Supabase JavaScript client

## Sources Consulted
- Supabase self-hosting with Docker: https://supabase.com/docs/guides/self-hosting/docker
- Supabase self-hosted Docker `.env.example`: https://raw.githubusercontent.com/supabase/supabase/master/docker/.env.example
- Supabase self-hosted Docker `docker-compose.yml`: https://raw.githubusercontent.com/supabase/supabase/master/docker/docker-compose.yml
- Supabase self-hosted Docker `generate-keys.sh`: https://raw.githubusercontent.com/supabase/supabase/master/docker/utils/generate-keys.sh
- Supabase Auth redirect URL docs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase JavaScript `signInWithPassword()` reference: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- Supabase Auth password guide: https://supabase.com/docs/guides/auth/passwords
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer relative path support docs: https://docs.portainer.io/sts/advanced/relative-paths

## Issues Found
- The prerequisites understated the current minimum resources. Supabase’s self-hosting docs list 4 GB RAM and 50 GB SSD storage as the minimum for the full stack, so I corrected the requirement.
- The secret-generation step was outdated and incomplete. The post only generated a JWT secret and pointed readers to manual key generation, but the official self-hosted setup now provides `sh ./utils/generate-keys.sh --update-env` to populate the required passwords, legacy API keys, and supporting secrets in `.env`.
- The environment-variable section omitted `SUPABASE_PUBLIC_URL`, treated `SITE_URL` like the public Supabase endpoint, and left out the default Kong port. I corrected the URL variables so `SUPABASE_PUBLIC_URL` and `API_EXTERNAL_URL` use the Supabase endpoint and `SITE_URL` is used for Auth redirects.
- The Portainer deployment instructions were not sufficient for the official Supabase compose file. That compose file references repo-relative `./volumes/...` files, so uploading only `docker-compose.yml` is not enough. I changed the instructions to use a Git-based stack, upload the edited `.env` values through Portainer, and note the Business Edition relative-path requirement for deploying the official compose unchanged.
- The Studio access URL was wrong. The official self-hosted docs expose Studio through Kong on port `8000` by default, not port `3000`, so I corrected both the dashboard access step and the client SDK base URL.
- The Auth SDK example stored the `signInWithPassword()` result in a variable named `session`, even though the current API returns a `data` object containing auth information. I renamed it to `authData` for correctness.
- The conclusion described `ANON_KEY` and `SERVICE_ROLE_KEY` without noting that they are legacy keys in the current self-hosted setup. I updated that wording while preserving the RLS guidance.

## Review Notes
- The official self-hosted compose still works with legacy `ANON_KEY` and `SERVICE_ROLE_KEY`. Supabase also documents newer publishable/secret keys for self-hosting, but enabling them requires additional compose changes, so this post now stays on the legacy path that matches the unmodified upstream compose.
- The Git-based Portainer workflow for the official compose file depends on Portainer Business Edition if you want repo-relative `./volumes/...` mounts to work without rewriting the bind mounts.
- A live Portainer deployment was not executed in this environment; the review was validated against the current upstream Supabase and Portainer documentation and source files.
