# Validation Summary: How to Install and Configure Woodpecker CI on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu
- Docker and Docker Compose
- Woodpecker CI server and agent
- Gitea / Forgejo OAuth
- GitHub OAuth
- Nginx reverse proxy
- Woodpecker pipeline YAML
- Woodpecker CLI secrets

## Sources Consulted
- Woodpecker CI Docker Compose installation: https://woodpecker-ci.org/docs/administration/installation/docker-compose
- Woodpecker CI server configuration and Nginx reverse proxy documentation: https://woodpecker-ci.org/docs/administration/configuration/server
- Woodpecker CI agent configuration: https://woodpecker-ci.org/docs/administration/configuration/agent
- Woodpecker CI Gitea forge configuration: https://woodpecker-ci.org/docs/administration/configuration/forges/gitea
- Woodpecker CI workflow syntax: https://woodpecker-ci.org/docs/usage/workflow-syntax
- Woodpecker CI services documentation: https://woodpecker-ci.org/docs/usage/services
- Woodpecker CI secrets documentation: https://woodpecker-ci.org/docs/usage/secrets
- Woodpecker CI CLI documentation: https://woodpecker-ci.org/docs/cli
- NGINX release documentation for HTTP/2 directive deprecation: https://docs.nginx.com/nginx/releases/

## Issues Found
- The Docker Compose agent service omitted `command: agent`, which is present in the official Docker Compose deployment example. Added it so the container explicitly starts the agent subcommand.
- The Nginx reverse proxy snippet used `chunked_transfer_encoding on` and did not disable proxy buffering. Updated the location block to match Woodpecker's documented Nginx proxy pattern with `proxy_redirect off`, `proxy_buffering off`, and `chunked_transfer_encoding off`.
- The Nginx HTTPS listener used the deprecated `listen 443 ssl http2` form. Updated it to `listen 443 ssl;` with `http2 on;`, which is the current Nginx configuration style.
- The pipeline `when` blocks used mapping syntax such as `when: branch: main`. Current Woodpecker v3 documentation shows `when` as a list of condition objects. Updated examples to use `when: - branch: main` and combined branch/event filters in a single list item where needed.
- The secrets pipeline example used the old `secrets: source/target` style. Current Woodpecker documentation injects secrets into environment values with `from_secret`. Replaced the example with `environment` entries using `from_secret`.
- Secret environment variables in commands were referenced as normal shell variables. Woodpecker preprocesses parameter expressions, and its documentation says secrets used in expressions should be escaped with `$$`. Updated those command references to `$${DEPLOY_SSH_KEY}` and `$${DEPLOY_HOST}`.
- The deploy SSH command used a shell line-continuation backslash inside a YAML list item. YAML folds that continuation line before the shell receives it, so the command could be parsed incorrectly. Replaced it with a single-line command.
- The CLI examples used `woodpecker-cli secret add/list --repository`. Current documentation shows repository secrets under `woodpecker-cli repo secret add` and `woodpecker-cli repo secret ls`. Updated both commands.

## Review Notes
The post remains technically relevant. The examples use `latest` image tags, which works but is less reproducible than pinning a major tag such as `v3`; this was left unchanged because it is not technically incorrect and matches the author's concise setup style.
