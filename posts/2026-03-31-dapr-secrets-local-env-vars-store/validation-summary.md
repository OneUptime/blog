# Validation Summary: How to Configure Dapr with Local Environment Variables as Secret Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secret store component, sidecar, CLI)
- Local environment variable secret store (`secretstores.local.env`)
- Python (httpx async HTTP client)
- Docker Compose (sidecar pattern)
- Bash / shell environment variables

## Sources Consulted
- Dapr environment variable secret store reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/envvar-secret-store/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr self-hosted Docker Compose guide: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Linux proc(5) man page for `/proc/PID/environ`: https://man7.org/linux/man-pages/man5/proc_pid_environ.5.html

## Issues Found

1. **`--components-path` flag is deprecated; replaced with `--resources-path`**
   - The `dapr run` command and Docker Compose `daprd` command both used `--components-path`, which is deprecated in current Dapr versions. Changed both to `--resources-path`.

2. **`ps aux` does not show environment variables**
   - The limitations section claimed secrets are visible in `ps aux` output. Plain `ps aux` does not display environment variables; `ps auxe` (or `ps eww`) is needed. Changed to `ps auxe`.

3. **Docker Compose missing `network_mode` for sidecar**
   - The sidecar container lacked `network_mode: "service:my-service"`, which is required for the sidecar and app to communicate over localhost. Without it, the app and sidecar are on separate Docker networks and cannot reach each other on `localhost:3500`/`localhost:3000`. Added `network_mode: "service:my-service"` to the sidecar service.

4. **Docker Compose circular dependency removed**
   - The app service had `depends_on: dapr-sidecar`, but with `network_mode: "service:my-service"` the sidecar implicitly depends on the app container starting first. This would create a circular dependency. Removed the `depends_on` directive.

## Review Notes
- The Python code example uses a top-level `await` on the last line (`db_password = await get_secret(...)`), which requires Python 3.10+ with top-level await support in an async context (e.g., `asyncio.run()` wrapper or Jupyter notebook). This is a minor stylistic choice, not an error.
- The Docker Compose file uses `version: "3.8"`, which is now considered legacy by Docker Compose V2 (the `version` key is ignored). This is not incorrect but could be noted in a future update.
- The post does not mention the optional `prefix` metadata field for the env var secret store, which can filter which environment variables are exposed as secrets. This is a useful feature but its omission is not an error.
