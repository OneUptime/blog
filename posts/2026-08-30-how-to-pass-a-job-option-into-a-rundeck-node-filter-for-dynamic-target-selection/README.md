# How to Pass a Job Option into a Rundeck Node Filter for Dynamic Target Selection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Automation, Job Scheduling

Description: Build a Rundeck job whose runtime options safely select nodes by environment, application, tag, or an explicitly editable filter.

---

A dynamic node filter lets one reviewed job target different parts of a fleet without duplicating its workflow. Rundeck expands job option references in the saved node filter at execution time. The mechanics are simple; the important design choice is whether the user selects a controlled attribute value or supplies an entire filter expression.

## Prefer Options That Represent Intent

Suppose nodes have stable attributes and tags:

```yaml
web-prod-01:
  hostname: 10.20.0.11
  username: deploy
  environment: prod
  application: storefront
  tags: 'linux,web,prod'

web-stage-01:
  hostname: 10.30.0.11
  username: deploy
  environment: stage
  application: storefront
  tags: 'linux,web,stage'
```

Create a plain text job option named `environment` with allowed values `dev`, `stage`, and `prod`. Mark **Enforced from values** and **Required**. Then set the job's node filter to:

```text
environment: ${option.environment} application: storefront
```

At runtime, choosing `stage` resolves the filter to:

```text
environment: stage application: storefront
```

The static `application` clause prevents the environment option from selecting unrelated nodes. This is safer and easier to audit than asking users to understand the full filter grammar.

Tags work the same way. To require both a fixed `web` tag and a selected environment tag, use:

```text
tags: web+${option.environment}
```

In Rundeck's tag syntax, `+` means AND and `,` means OR. Normal attribute values can be regular expressions, so enforced allowed values are an important boundary when a broad match would be dangerous.

## Configure the Job

In **Job Definition > Workflow > Options**, add:

- Name: `environment`
- Input type: Plain Text
- Required: Yes
- Allowed values: `dev,stage,prod`
- Enforced from values: Yes

Under **Nodes**, enable **Dispatch to Nodes** and enter the dynamic filter. Keep **Editable node filter** disabled unless callers truly need to replace the saved filter. Set a conservative thread count and choose the desired node-failure behavior.

The editor may display `None matched`, and the execution page may warn that the filter matches no nodes. This is expected before `${option.environment}` has a runtime value. Test the job with each allowed option and inspect the resolved node list before adding a mutating command.

## When a Whole Filter Is Necessary

For an operations-only diagnostic job, a full filter option can be useful. Define an option named `target_filter`, validate it, and make the saved filter:

```text
${option.target_filter}
```

Examples a trusted caller could provide are:

```text
name: web-prod-01
tags: web+prod !maintenance: true
hostname: web-prod-.*\.example\.net
```

This is powerful enough to expand a one-node execution to the entire project. Restrict who can run the job, apply node-level ACLs, and consider requiring a preview/approval step. A regex that merely checks characters is not equivalent to an allowlist; valid filter punctuation can still express a very broad target.

A better compromise is several constrained options:

```text
environment: ${option.environment} application: ${option.application}
```

Give both options enforced values. This preserves flexibility without making filter grammar part of the public input surface.

## Run It Through the API

For a saved dynamic filter, the caller usually needs to provide only options. The JSON `options` map requires API version 18 or later, so set `RUNDECK_API_VERSION` accordingly:

```bash
curl --fail-with-body --request POST \
  --header "X-Rundeck-Auth-Token: $RUNDECK_TOKEN" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data '{"options":{"environment":"stage"}}' \
  "$RUNDECK_URL/api/$RUNDECK_API_VERSION/job/$JOB_ID/run"
```

The run-job API can also send a top-level `filter` field as an explicit override. The API reference documents that field independently; do not treat the GUI's **Editable node filter** checkbox as an authorization boundary for API callers. (The similarly named `nodeFilter` browser-link parameter is documented as requiring an editable filter.) If the job owns the dynamic expression, omit the API `filter`, pass the option instead, and leave interactive editing disabled.

Never build JSON with shell string concatenation when option values can contain special characters. Use a JSON-aware tool such as `jq`:

```bash
payload=$(jq -n --arg env "$ENVIRONMENT" \
  '{options:{environment:$env}}')
```

Then send `--data "$payload"`.

## Debug No-Match and Over-Match Results

If an execution finds no nodes:

1. Open **Nodes** and test the fully resolved filter without `${option...}`.
2. Inspect one node's actual attributes and case-sensitive values.
3. Confirm the job option is nonblank and spelled exactly like the reference.
4. Refresh Node Sources if inventory recently changed.
5. Check whether commas, plus signs, spaces, or regex metacharacters changed the intended logic.

If too many nodes match, stop before executing destructive steps. Replace free-form input with enforced values, add a fixed clause such as `application: storefront`, and use node ACL rules to put an authorization ceiling on the job. Job options determine requested targets; ACLs determine which targets the user is actually allowed to run against.

Add a harmless first step such as `hostname` during rollout. For production mutations, log the selected option values and resolved node names, but do not log secure option values.

## Design for Stable Selection

Target logical metadata rather than ephemeral IPs. An `environment` or `application` attribute can remain stable while hosts are replaced. Keep naming conventions consistent across Node Sources, and use exact allowed values that match the inventory.

Do not use a Secure option for a node filter. Secure options protect display and persistence but are intended for secrets; a target selector should be visible in execution records for auditability.

## Conclusion

Put `${option.name}` in the saved node filter, but constrain what the option can mean. Enforced environment/application values provide most of the flexibility teams need, while static clauses and node ACLs limit blast radius. Reserve a free-form filter option or editable API override for trusted operator workflows.

## Official Documentation

- [Creating Jobs: dynamic node filters](https://docs.rundeck.com/docs/manual/jobs/creating-jobs.html)
- [Rundeck Node Filter syntax](https://docs.rundeck.com/docs/manual/11-node-filters.html)
- [Rundeck Job Options](https://docs.rundeck.com/docs/manual/jobs/job-options.html)
- [Rundeck API: Running a Job](https://docs.rundeck.com/docs/api/#running-a-job)
- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html)
