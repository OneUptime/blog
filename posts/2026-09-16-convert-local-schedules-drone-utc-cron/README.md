# Convert Local Schedules to Drone UTC Cron Without Running Push-Only Steps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, Automation, Python, DevOps

Description: Translate local schedules into Drone UTC cron expressions, account for daylight saving changes, and isolate cron events from push-only steps.

A schedule written for a laptop's local timezone can run at the wrong hour in Drone. A second mistake can be harder to notice: the scheduled build starts correctly but also executes publishing steps that were intended only for pushes.

Handle time conversion and event filtering as separate checks. This guide concerns self-hosted Drone's documented cron feature; the [cron documentation](https://docs.drone.io/cron/) says it is unavailable on Drone Cloud.

## Use six fields and a stated timezone

Drone's cron expressions include seconds before minutes. They describe UTC execution times. For a daily run at 07:30 UTC, the expression is:

```text
0 30 7 * * *
```

Do not paste the five-field `30 7 * * *` from a system crontab. Label the schedule with both the intended local business time and the actual UTC expression in your operating notes.

For a London team requesting 07:30 local time, a single year-round UTC hour is insufficient. In winter, 07:30 London is 07:30 UTC; during British Summer Time it is 06:30 UTC. Verify conversion with timezone data instead of assuming that every location changes its offset on the same dates:

```python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

for day in ['2026-01-15', '2026-07-15']:
    local = datetime.fromisoformat(day + 'T07:30:00').replace(
        tzinfo=ZoneInfo('Europe/London'))
    utc = local.astimezone(timezone.utc)
    print(local.isoformat(), '=>', utc.isoformat())
```

Python's [`zoneinfo` module](https://docs.python.org/3/library/zoneinfo.html) uses IANA timezone rules. Ensure your environment has system timezone data or the `tzdata` package. These dates illustrate the winter and summer offsets; they are not a schedule generator for every transition rule.

Choose an explicit policy: keep the job fixed to UTC, update its expression at reviewed offset changes, or use an external scheduler with the required timezone and delivery semantics. For local times near a clock transition, also define what should happen when an hour is skipped or repeated.

## Register the intended branch

Create a fixed-UTC schedule with the branch stated explicitly:

```sh
drone cron add --branch main acme/api nightly '0 30 7 * * *'
drone cron info acme/api nightly
```

The [CLI's cron creation implementation](https://github.com/harness/drone-cli/blob/master/drone/cron/cron_add.go) shows that branch is a separate option. Do not rely on a default matching your repository. Verify the saved expression and branch in the UI or command output after creation.

A cron definition is metadata in Drone; changing a comment in `.drone.yml` does not change the saved schedule. Conversely, creating the cron record does not restrict which unfiltered pipelines will run for that event.

Use distinct names for schedules with distinct intent. The pipeline filter refers to the cron's name, so renaming the schedule without changing its filter can leave the scheduler creating builds whose intended pipeline never runs.

## Isolate push and scheduled work

A straightforward configuration uses separate pipelines:

```yaml
kind: pipeline
type: docker
name: push-tests
steps:
  - name: test
    image: node:24
    commands:
      - npm ci
      - npm test
trigger:
  event:
    - push
    - pull_request

---
kind: pipeline
type: docker
name: nightly-tests
steps:
  - name: extended-tests
    image: node:24
    commands:
      - npm ci
      - npm run test:nightly
trigger:
  event:
    - cron
  cron:
    - nightly
```

The example assumes those npm scripts exist in your application. Define appropriate runner capacity and timeouts for the longer suite. Drone's [trigger documentation](https://docs.drone.io/pipeline/docker/syntax/trigger/) describes combining event and cron-name filters; all configured trigger constraints must match.

For a shared pipeline, use step-level `when` conditions for the same purpose. Explicitly constrain artifact publishing or deployment steps to their allowed events. A branch condition alone is insufficient because a cron build can also run against that branch.

## Account for scheduling and queue delay

An expression is not a start-time guarantee. Drone batches cron processing, and the documented default scheduler interval is one hour. Operators can configure [`DRONE_CRON_INTERVAL`](https://docs.drone.io/server/reference/drone-cron-interval/) to a smaller duration, but Drone still describes its scheduler as approximate.

Separate the intended time, the build's creation time, and the time its runner starts. A more frequent scheduler does not solve a runner backlog, and a fast runner cannot execute a cron event that the scheduler has not yet created.

Do not use this mechanism for a strict financial cutoff or a precisely timed distributed job without an additional scheduling design. For ordinary nightly tests, document the acceptable lateness and alert when the job has not completed within its useful window.

## Verify the whole path

Use a disposable repository to check a scheduled event and inspect the recorded event name, branch, and cron name. Confirm the nightly pipeline runs and the push-only pipeline does not. A manual cron execution can check filters, but it does not prove wall-clock scheduling accuracy.

Observe at least one naturally scheduled execution. Record its delay and test your timezone policy before the next offset transition. A reliable cron setup has a clear time contract and event contract, with monitoring for both.
