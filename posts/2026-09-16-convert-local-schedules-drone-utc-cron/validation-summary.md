# Validation Summary: Convert Local Schedules to Drone UTC Cron Without Running Push-Only Steps

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Drone CI cron scheduling
- Drone CLI
- Drone Docker pipelines and trigger/step conditions
- Python `datetime` and `zoneinfo`
- IANA time zone data and daylight saving time
- YAML
- Node.js and npm

## Sources Consulted

- Drone cron documentation: https://docs.drone.io/cron/
- Drone Docker pipeline trigger documentation: https://docs.drone.io/pipeline/docker/syntax/trigger/
- Drone Docker pipeline step conditions documentation: https://docs.drone.io/pipeline/docker/syntax/conditions/
- Drone `DRONE_CRON_INTERVAL` server reference: https://docs.drone.io/server/reference/drone-cron-interval/
- Drone cron CLI documentation: https://docs.drone.io/cli/cron/
- Drone CLI cron creation implementation: https://github.com/harness/drone-cli/blob/master/drone/cron/cron_add.go
- Python `zoneinfo` documentation: https://docs.python.org/3/library/zoneinfo.html
- Node.js official Docker image documentation: https://hub.docker.com/_/node

## Issues Found
No technical issues found.

## Review Notes
The Python example was executed and produced the stated UTC conversions for both sample dates. The `zoneinfo` module requires Python 3.9 or later and requires system IANA time zone data or the first-party `tzdata` package, as the post notes. The Drone CLI currently defaults an omitted cron branch to `master`, which reinforces the post's recommendation to pass `--branch main` explicitly. Drone's documentation confirms that cron timing is UTC-based, uses six fields, is unavailable on Drone Cloud, and is approximate with a one-hour scheduler interval by default. The npm commands remain application-dependent, as the post explicitly states.
