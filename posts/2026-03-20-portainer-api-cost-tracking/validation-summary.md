# Validation Summary: How to Build a Cost Tracking Tool Using Portainer API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Engine API
- Docker CLI
- Docker Compose
- Python 3
- Python `requests`
- Cron

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Docker Engine API reference (`/containers/(id or name)/stats`, `/containers/(id or name)/json`): https://docs.docker.com/reference/api/engine/version/v1.24/
- Docker Engine API version history (`online_cpus` fallback guidance for stats): https://docs.docker.com/reference/api/engine/version-history/
- Docker CLI reference for `docker run --label` and environment flags: https://docs.docker.com/reference/cli/docker/container/run
- Docker object labels documentation: https://docs.docker.com/engine/manage-resources/labels/
- Docker Compose services reference (`labels`): https://docs.docker.com/reference/compose-file/services/
- Python 3.12 deprecations (`datetime.utcnow()`): https://docs.python.org/3.12/deprecations/

## Issues Found
- The prerequisites listed `pandas`, but the script only imports and uses `requests`. I removed `pandas` so the dependency list matches the code.
- The Python example used `datetime.utcnow()`, which is deprecated in Python 3.12. I replaced it with `datetime.now(timezone.utc)` so the sample uses current, timezone-aware UTC timestamps.
- The CPU calculation used `online_cpus` with a fallback of `1`. Docker documents that when `online_cpus` is unavailable, callers should fall back to the length of `cpu_usage.percpu_usage`. I updated the example to follow that guidance and made the stats parsing more defensive.
- The Docker scheduling example passed `PORTAINER_URL`, `PORTAINER_API_KEY`, and mounted `/reports`, but the script ignored environment variables and always wrote to the current directory. I updated the script to read `PORTAINER_URL`, `PORTAINER_API_KEY`, `ENDPOINT_ID`, and `OUTPUT_DIR`, create the output directory, and save reports there. I also updated the Docker example to set `ENDPOINT_ID` and `OUTPUT_DIR`.
- The cron example used `python`, which is not consistently available as Python 3. I changed it to `python3` to match the post’s Python 3.8+ prerequisite.
- The conclusion described the output as “accurate” chargeback/showback reporting even though the sample extrapolates from current container stats. I changed that wording to describe the output as estimates based on current resource usage.

## Review Notes
- The sample is technically valid after the fixes, but it still produces point-in-time cost estimates rather than historical billing-grade usage totals.
- The example `COST_MODEL` includes storage and network pricing, while the sample script only applies CPU and memory rates. That is acceptable as an extension point, but readers should not expect storage or network costs to appear in the generated report without additional code.
