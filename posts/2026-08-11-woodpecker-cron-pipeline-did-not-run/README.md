# Why Didn’t a Woodpecker Cron Pipeline Run? Schedule, Time Zone, Branch, and Event Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, Cron, Scheduled Pipelines, CI/CD, Troubleshooting

Description: Diagnose a missing Woodpecker cron run by checking the stored schedule, time zone, next execution, branch, and workflow event filters.

---

A missing scheduled Woodpecker pipeline can fail at two distinct boundaries. The scheduler may never claim the due cron entry, or it may claim it but pipeline creation can fail or filter out the expected workflows and steps. If global conditions filter out every workflow, Woodpecker deletes the empty pipeline, so pipeline history alone cannot prove whether the scheduler fired. Establish what happened before editing the cron expression.

Woodpecker cron jobs are repository settings stored by the server. They select a schedule, time zone, branch, and name. Pipeline YAML does not create the scheduler entry; it declares which workflows and steps accept the resulting `cron` event.

## First Ask Whether a Pipeline Was Created

Open the repository's pipeline history around the expected time and look for the `cron` event. Use the CLI to filter pipeline history and list cron definitions:

~~~bash
export WOODPECKER_SERVER=https://ci.example.com
export WOODPECKER_TOKEN=replace-with-a-personal-token

woodpecker-cli pipeline ls \
  --event cron \
  --limit 20 \
  octocat/hello-world

woodpecker-cli repo cron ls \
  --repository octocat/hello-world
~~~

Handle the token as a secret and avoid placing it in shared shell history or diagnostics.

Classify the outcome:

- No visible pipeline at the scheduled time: inspect the cron record, enabled state, next execution, server clock, selected branch, server logs, and global workflow `when` conditions.
- A pipeline exists but the expected workflow is absent: inspect global workflow `when` conditions.
- The workflow exists but a step is skipped: inspect that step's `when.event` and `when.cron` conditions.
- The step starts and fails: the scheduler worked; investigate the command, image, secrets, or backend separately.

This distinction prevents a successful scheduler from being “fixed” by repeatedly changing its schedule.

## 1. Inspect the Stored Cron Record

In **Repository settings → Cron**, check all of these fields rather than only the expression:

- name;
- enabled state;
- five-field schedule or supported descriptor;
- configured time zone;
- branch;
- displayed next execution.

The Woodpecker CLI's cron list and show commands report fields including the branch, schedule, and `NextExec`. A next-execution value that remains in the past beyond the normal scheduler polling delay, an empty list, or a disabled entry gives the investigation a concrete direction.

To isolate the scheduler, temporarily use a frequent but reasonable test definition such as `@every 5m`, save it, and observe whether `NextExec` advances after it becomes due. An advance without a visible pipeline means the server claimed the entry; inspect its logs for branch or configuration errors and global workflow filtering. Delete or restore the test after diagnosis so it does not consume build capacity indefinitely.

Repository cron management requires at least push access. If a user can view pipelines but cannot save a cron change, verify forge permissions and Woodpecker's synchronized repository permission record rather than assuming the UI stored the edit.

## 2. Validate Five-Field Schedule Syntax

Woodpecker 3.x uses standard Linux-style cron expressions without a seconds field. For example, 08:00 every day is:

~~~text
0 8 * * *
~~~

The five positions are minute, hour, day of month, month, and day of week. Woodpecker also documents descriptors and intervals such as:

~~~text
@daily
@every 5m
30 * * * *
~~~

Do not copy a six-field expression from Woodpecker 2.x or a scheduler whose first field is seconds. During the 3.0 migration, Woodpecker automatically attempts to convert stored schedules. The official example changed an 08:00 schedule from `0 0 8 * * *` in 2.x to `0 8 * * *` in 3.x. After an upgrade, inspect every migrated cron's stored expression and next execution rather than assuming the automatic conversion handled custom expressions perfectly.

Also distinguish “every N minutes” from fixed wall-clock times. `@every 24h` is an interval from the scheduler's reference point; it is not a promise to run at the same local clock time through daylight-saving transitions. Use a calendar expression with an explicit time zone when wall-clock time matters.

## 3. Check the Time Zone and Daylight Saving Time

Woodpecker 3.15 and later store an IANA time-zone name with each cron entry and default an omitted zone to `UTC`. The web interface displays the selected zone and both local and zoned next-execution information. Examples of IANA names are `Europe/London`, `America/New_York`, and `Asia/Singapore`.

A schedule of `0 8 * * *` means 08:00 in the cron entry's configured zone, not necessarily the server host's `/etc/localtime` and not necessarily the browser's zone. Check the displayed next execution rather than mentally converting the expression.

Daylight-saving transitions create two edge cases:

- a local wall-clock time can be skipped when clocks move forward;
- a local wall-clock time can occur twice when clocks move backward.

For globally coordinated work, UTC is usually easier to operate. For a task that must align with a local business day, choose the appropriate IANA zone and accept its daylight-saving behavior. Avoid fixed abbreviations such as `BST` or `EST`, which are ambiguous and do not fully describe transition rules.

Make sure every Woodpecker server host has reliable time synchronization; server process clocks drive due checks. Keep database hosts synchronized for log correlation, but their clocks do not calculate `NextExec`. A browser clock does not drive the scheduler. Correlate server logs and pipeline timestamps in UTC during diagnosis:

~~~bash
date -u
docker compose logs --since=30m woodpecker-server | grep -i cron
~~~

For Kubernetes, use the server Pod logs and inspect the node's time service through the platform's supported mechanism.

## 4. Verify the Selected Branch Still Exists

A cron job resolves the head of its configured branch when creating the pipeline. Confirm the stored branch exists on the forge and contains the expected Woodpecker configuration:

~~~bash
git ls-remote --exit-code origin refs/heads/main
git fetch origin main
git show FETCH_HEAD:.woodpecker/nightly.yaml
~~~

Common branch failures include:

- the default branch was renamed from `master` to `main` but the cron was not updated;
- a release branch was deleted after the cron was created;
- capitalization differs;
- the workflow file exists on another branch but not the selected one;
- the repository's custom pipeline path points somewhere absent on that branch.

Creating a cron with a nonempty invalid branch, or changing a cron's branch to one, is rejected, but a previously valid branch can disappear later. Check server logs at the expected run time for forge branch-resolution failures.

Do not confuse the cron branch with a workflow's branch filter. The cron record chooses which revision to run; a `when.branch` condition can then decide whether a workflow or step is included for that metadata.

## 5. Allow the `cron` Event in the Workflow

A schedule firing does not override YAML conditions. The expected workflow or step must accept the `cron` event. A clear dedicated workflow looks like this:

~~~yaml
when:
  - event: cron
    cron: nightly-maintenance

steps:
  - name: verify-context
    image: alpine:3.22
    commands:
      - echo "event=$CI_PIPELINE_EVENT"
      - echo "branch=$CI_COMMIT_BRANCH"

  - name: run-maintenance
    image: alpine:3.22
    commands:
      - ./scripts/nightly-maintenance.sh
~~~

The `cron` condition matches the cron job's **name**, not its expression. Pair it with `event: cron`; Woodpecker's workflow documentation explicitly requires the event check. A typo, renamed cron entry, or overly narrow glob can exclude the workflow.

When one workflow should accept several jobs, use an intentional wildcard:

~~~yaml
when:
  - event: cron
    cron: maintenance-*
~~~

Audit both global and step-level conditions. This is a frequent trap:

~~~yaml
when:
  event: push

steps:
  - name: nightly
    image: alpine:3.22
    when:
      event: cron
~~~

The step-level allowance cannot override the workflow-level rejection; the workflow is excluded before the step is considered.

Path filters are defined for push and pull-request events, where changed-file metadata exists. Do not use a changed-path condition as the main gate for a cron-only workflow. Scheduled maintenance should be controlled by `event`, cron name, branch, or an explicit evaluation that is meaningful for cron metadata.

## 6. Use “Run Now” to Split Scheduler and Workflow Problems

Run the cron entry on demand from the repository cron settings or the corresponding API action.

- If **Run now** creates and executes the expected pipeline, the branch and workflow are usable; focus on schedule, time zone, enabled state, and server scheduling.
- If it creates a pipeline with no expected workflow, focus on `when` conditions and the cron name.
- If it produces no visible pipeline, inspect the API or browser network response and server logs. In Woodpecker 3.17, `204 No Content` with a `Pipeline-Filtered: true` response header can mean that no configuration was found on the branch or that every workflow was excluded. An error response can instead point to branch resolution, forge connectivity, or another creation failure.
- If it starts but a step fails, scheduling is no longer the issue.

After a manual cron run, inspect the pipeline metadata. Its event must be `cron`; a regular **Run pipeline** action produces the separate `manual` event and is not an equivalent test.

## 7. Post-Upgrade Cron Checklist

After moving from Woodpecker 2.x to 3.x:

1. Confirm every expression has five fields rather than six.
2. Confirm each entry is enabled and has a future `NextExec`.
3. On Woodpecker 3.15 or later, set or verify its IANA time zone; omitted values use UTC.
4. Confirm its branch exists and contains 3.x-compatible workflow YAML.
5. Replace old CLI usage with `woodpecker-cli repo cron` commands.
6. Ensure workflow and step conditions accept `event: cron`.
7. Ensure `cron:` filters match the stored job name.
8. Run each important cron once on demand and inspect its result.
9. Watch the next naturally scheduled occurrence before declaring the migration complete.

If the job runs but lacks a secret, inspect that secret's permitted events and plugin image filters. That is an execution-policy issue, not evidence that cron failed to fire.

## Official Documentation

- [Woodpecker cron jobs](https://woodpecker-ci.org/docs/usage/cron)
- [Woodpecker workflow syntax and cron filters](https://woodpecker-ci.org/docs/usage/workflow-syntax#cron)
- [Woodpecker CLI reference for repository cron commands](https://woodpecker-ci.org/docs/cli#cron)
- [Woodpecker migration notes](https://woodpecker-ci.org/migrations)
- [Woodpecker API reference](https://woodpecker-ci.org/api)
- [Cron expression library used by Woodpecker](https://pkg.go.dev/github.com/gdgvda/cron#hdr-CRON_Expression_Format)

## Conclusion

Diagnose a missing cron pipeline from the outside in: confirm whether a pipeline exists, inspect the stored cron and its next execution, validate five-field syntax and the selected IANA time zone, verify the branch, and then audit workflow and step event filters. “Run now” bypasses schedule calculation and directly tests branch resolution, configuration loading, and pipeline compilation. Once that manual cron succeeds, observe one natural scheduled run to verify the entire path.
