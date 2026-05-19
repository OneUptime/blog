# Validation Summary: How to Set Up Distributed Cron with Jobber on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jobber (v1.4.4) — job scheduler for Unix systems
- Ubuntu / `systemd` (for the bundled `jobber` service unit)
- YAML jobfile format (v1.4 / V3 schema)
- Bash notification scripts (with `jq` for parsing the JSON run record)
- `sendmail`, `mail`, Slack incoming webhooks
- Comparison context: traditional cron and systemd timers

## Sources Consulted
- Official Jobber v1.4 documentation: https://dshearer.github.io/jobber/doc/v1.4/
- Jobber GitHub releases (release-asset filenames): https://github.com/dshearer/jobber/releases/tag/v1.4.4
- Jobber source code (authoritative for schema and CLI behavior):
  - `jobber/main.go` — confirms CLI subcommand names (`list`, `log`, `reload`, `test`, `cat`, `pause`, `resume`, `init`)
  - `jobfile/job_file.go` — defines `JobFileV3Raw` with `Jobs map[string]JobV3Raw` and only `cmd`/`time`/`onError`/`notifyOnSuccess`/`notifyOnError`/`notifyOnFailure` fields per job
  - `jobfile/time_spec.go` and `parse_time_spec_test.go` — confirm 6-field time format `sec min hour mday mon wday`
  - `jobfile/result_sink.go` — enumerates result sink types: `system-email`, `program`, `filesystem`, `stdout`, `socket`
  - `jobfile/result_sink_program.go` — confirms `program` sinks receive a JSON run record on **stdin** (not env vars)
  - `jobfile/result_sink_system_email.go` — confirms `system-email` takes no parameters and mails the job's user via `sendmail`
  - `common/settings.go` — confirms the system-wide prefs file is `/etc/jobber.conf` and only contains `users-include` / `users-exclude` (no system-wide jobs directory)
  - `packaging/debian/debian-pkg/jobber.service` — confirms the systemd unit name and `ExecStart=/usr/lib/.../jobbermaster`

## Issues Found

The original post had a large number of fabricated or incorrect technical claims about Jobber. Each was corrected in `README.md`.

1. **Wrong .deb filename in install command.** Post used `jobber_1.4.4_linux_amd64.deb`; the actual release asset is `jobber_1.4.4-1_amd64.deb`. Fixed in the Installation block.
2. **Non-existent system-wide jobs directory.** Post claimed system jobs go in `/etc/jobber.d/system-jobs.yaml`. Jobber has no `/etc/jobber.d/`; jobs are exclusively per-user in `~/.jobber`. The Configuration File Format section was rewritten to reflect this and to mention the real system prefs file (`/etc/jobber.conf`).
3. **Wrong YAML schema for `jobs`.** Post used a list with `- name: ...` items, which is the deprecated v1/v2 schema. In v1.4 (V3) `jobs` is a **map** keyed by job name. All YAML examples were rewritten to use map syntax.
4. **Wrong time format.** Post used 5-field cron syntax (`0 2 * * *`, `*/5 * * * *`, `0 23 * * *`, `@every 15m`, `@hourly` etc.). Jobber uses a **6-field** format `sec min hour mday mon wday` and does **not** support `@every`/`@hourly`/`@daily`/`@weekly`/`@monthly`. All times were converted (e.g. `0 2 * * *` → `0 0 2`, `*/5 * * * *` → `0 */5 *`) and a callout was added explaining the format and the trap that 5-field cron times silently parse to a different schedule.
5. **Fabricated job fields.** Post documented `dir`, `env`, `stdin`, `retryCount`, and `retryDelay`. None exist in the v1.4 jobfile schema. Removed and replaced with a note explaining how to achieve the equivalent (inline env vars in `cmd`, wrapper scripts, `source <file>`).
6. **Wrong email result sink.** Post used `type: email` with a `recipients:` field. The actual type is `system-email` with no parameters; it mails the job's owning user via `sendmail`. Corrected the YAML and added an explanatory note.
7. **Notification scripts use fabricated env vars.** Post claimed Jobber sets `JOB_NAME`, `JOB_CMD`, `JOB_TIME`, `JOB_STATUS`, `JOB_OUTPUT` for program sinks. In reality Jobber writes a **JSON run record to the program's stdin** (fields: `job.name`, `job.command`, `job.time`, `job.status`, `user`, `startTime`, `succeeded`, `fate`, `stdout`, `stderr`). The `alert.sh` and `slack-notify.sh` examples were rewritten to read stdin and parse with `jq`. Added an installation line for `jq`. Showed the JSON structure explicitly.
8. **Wrong CLI subcommands.** Post used `jobber ls` and `jobber run`. Neither exists. The correct commands are `jobber list` and `jobber test` (per `jobber/main.go`). Replaced everywhere; also added `jobber cat` (which the post omitted) and removed the fabricated `jobber ls -v`.
9. **Wrong use of `sudo` for managing one's own jobs.** Post prefixed several `jobber` calls with `sudo`, which would actually target *root's* jobs because the jobber client talks to the calling user's runner via a per-user Unix socket under `/var/jobber/<uid>/cmd.sock`. Removed misleading `sudo` usage and added a one-sentence explanation.
10. **REST API section entirely fabricated.** Post described enabling an HTTP API via `/etc/jobber.yaml`, with endpoints `/v1/jobs` and `/v1/jobs/<name>/run` reachable over `/var/run/jobber/jobber.sock`. None of this exists in Jobber — there is no HTTP API at all, and `/etc/jobber.yaml` is not a real file. Replaced this section with a "Persistent Run Logs" section that documents the real `prefs.runLog` settings (which the post had misplaced under the fake REST API config). Updated the comparison table row from "REST API: Yes" to "Programmatic control: `jobber` CLI (no HTTP API)".
11. **Intro paragraph repeated the REST-API claim.** The "distributed cron" intro mentioned "its REST API that enables external orchestration." Rewritten to describe the actual per-user `jobbermaster` / `jobberrunner` process model.
12. **"Why Jobber" bullets oversold features.** Bullet about "Retry logic — configurable backoff" implied configurable retry parameters; Jobber's `Backoff` is automatic exponential backoff with no knobs. Bullet about REST API removed. Bullets rewritten to describe what actually exists (Backoff, error policies, run history, per-user isolation).
13. **Status table in monitoring section.** The example `jobber list` output used fake column names (`NAME STATUS SCHEDULE`) and fake statuses. Replaced with the real column set (status values are `Good`, `Failed`, `Backoff`, `Paused`) and the actual time-spec columns.
14. **Comparison table.** "REST API" row replaced with "Programmatic control" reflecting reality. "Environment variables" row corrected — Jobber has no per-job `env` field; you embed them in the command string. "Per-job logging" row clarified to "Per-job run history".

## Review Notes

- The `cmd` in YAML is passed to `/bin/sh -c`, so shell features (pipes, redirections, `&&`, command substitution) work as written in the examples.
- The post's overall narrative arc (install → configure → notify → manage → compare) is preserved; only the technical content was corrected.
- v1.4.4 (June 2020) is the latest upstream Jobber release as of validation date — the project has had no releases since. Readers deploying today should note Jobber is effectively unmaintained; that observation is left out of the post itself because the user did not ask for editorial commentary.
- The `description:` frontmatter still mentions "retry logic"; Jobber's `Backoff` is a form of retry logic (exponential), so this is accurate enough to leave as-is.
- A 5-field time string in Jobber will parse but mean something very different from cron. Highlighted in a callout because this is the single most likely silent foot-gun for cron users adopting Jobber.
