# Invisible Rundeck Job? Application vs Project ACL Contexts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Access Control, RBAC, Troubleshooting, Security

Description: Fix invisible Rundeck jobs by separating project visibility, job visibility, execution permission, node authorization, and effective group membership.

---

In Rundeck, permission to execute a job is not the same as permission to discover or inspect it. A project-context rule that grants `run` does not also grant permission to list the project or show the job. If application-context project `read` is granted elsewhere, an API run request that already knows the job UUID can pass the job's `run` check while the job remains absent from listings. Without application-context project `read`, the user cannot access the project at all. This is a consequence of Rundeck's two-context authorization model, not a stale browser cache.

## The Authorization Gates Before Execution

A typical operator crosses these authorization gates:

1. **Application context:** `read` on the project makes the project visible.
2. **Project context:** `view` or `read` on the specific job makes the job visible at the intended detail level.
3. **Project context:** `run` on the job permits execution.
4. **Project context:** `run` on targeted nodes permits node dispatch; `read` makes those nodes visible in the UI.

The first rule answers "may this identity enter `Operations`?" The remaining rules answer "what may it do inside `Operations`?"

This incomplete policy declares the job's `run` action but grants neither project nor job visibility:

```yaml
description: Incomplete run permission
context:
  project: Operations
for:
  job:
    - equals:
        group: Production/Maintenance
        name: Restart API
      allow: [run]
by:
  group: release-operators
```

If project `read` is granted by another policy and any required node authorization is satisfied, an API run request that already knows the job UUID may succeed, but the UI cannot build a useful listing from `run` alone. A direct job-details URL still requires job `view` or `read`.

## Add Application Project Visibility

Create an application-context document:

```yaml
description: Show only the Operations project
context:
  application: rundeck
for:
  project:
    - equals:
        name: Operations
      allow: [read]
by:
  group: release-operators
```

This rule does not grant access to jobs inside the project. It only makes the project itself readable. If the Projects page is empty, troubleshoot this document first: confirm `application: rundeck`, the exact project name, and the user's effective group.

## Add the Right Job Visibility

Then complete the project-context rule:

```yaml
description: View and run one maintenance job
context:
  project: Operations
for:
  job:
    - equals:
        group: Production/Maintenance
        name: Restart API
      allow: [view, run]
  node:
    - contains:
        tags: [production, api]
      allow: [read, run]
by:
  group: release-operators
```

Here, `contains` is a superset test: a matching node must have both the `production` and `api` tags.

Rundeck distinguishes job `view` from `read`. The official authorization examples explain that a user with `view` but not `read` can view a job without reading its workflow definition or downloading that definition. Add `read` when the operator should inspect the definition:

```yaml
allow: [read, view, run]
```

Do not add `update`, `delete`, `toggle_schedule`, or a wildcard simply to make the job appear.

A workflow made entirely of Workflow Steps does not operate in a node context, so node rights may not be needed. A job configured to Execute Locally but containing Node Steps still targets the Rundeck server node and needs matching node authorization, such as a rule matching `rundeck_server: 'true'`. For a job dispatched to other nodes, missing node `run` blocks dispatch, while missing node `read` hides those nodes in the UI.

## Check the Match, Not Just the Actions

An action list can be correct while the resource selector matches nothing. Verify:

- `context.project` is a case-sensitive regex; confirm that it matches the actual project and escape regex metacharacters when targeting one literal name.
- `job.group` is the full job group path.
- `job.name` matches exactly when using `equals`.
- A regex under `match` is anchored as intended.
- The policy uses `job:` for a specific saved job, not only `resource: kind: job`.

`resource: kind: job` governs generic operations such as creating jobs. It does not replace the specific `job:` rule used for viewing and running existing jobs.

If a job was moved to another group, an exact policy for its old group correctly stops matching. Treat job path changes as authorization changes and review them together.

## Verify Effective Identity and Policy Placement

Rundeck authorizes the username and roles/groups produced by its authentication system. Confirm the user actually receives `release-operators`; an LDAP, SSO, or preauthenticated proxy group string may differ from the display name administrators expect.

Also confirm Rundeck loaded the policy in the intended scope. A syntactically invalid YAML document, wrong filesystem extension, unsupported storage location, or application-context document submitted as a project ACL can prevent a correct-looking snippet from loading. Project ACL storage accepts only that project's context or an omitted context; application-context rules belong in system ACL storage or a supported filesystem location. In commercial Runbook Automation, use the ACL Policy GUI and Access Level Checks. Otherwise, validate a filesystem policy with `rd acl validate -f path/to/policy.aclpolicy`. Inspect `rundeck.audit.log` for authorization decisions and the server logs for parse errors.

Policy effects are combined. Search all policies that match the username and groups. A broad rule can grant more access than expected, while an explicit deny can block an otherwise allowed action. Test with a clean user that has only the target role rather than an administrator who also carries unrelated groups.

## Use the Symptom to Locate the Missing Permission

- **No projects appear:** application-context project `read` is absent or does not match.
- **Project appears, job does not:** project-context job `view`/`read` is absent or the selector misses.
- **Job appears, Run is denied:** job `run` is absent, denied elsewhere, or execution is disabled.
- **Job starts but nodes are absent/unauthorized:** node `read` controls visibility; node `run` and the node selector control dispatch authorization.
- **History is unavailable:** when required, grant job `view_history` for the selected job and project resource `kind: event` `read`.
- **API returns unauthorized while GUI works for an admin:** the token's user/roles differ or the token is expired.

Do not use storage `read` as a generic fix for job visibility. Key Storage has its own authorization and should be granted only for a concrete credential-management need.

## Test Both Discovery and Direct Execution

Log in as the affected user and list project jobs in the GUI. If API access matters, use that user's token to call the project jobs endpoint, then the run endpoint. Record HTTP status and error body without exposing the token. This tests the same ACL model while separating list permission from run permission.

After modifying a policy, reauthenticate if group membership changed. A session established before an identity-provider role update may retain old authorities until the next login. Existing API tokens retain the username and roles assigned when they were generated, so create a new token if that stored identity needs to change.

## Conclusion

`run` is an action permission, not a visibility bundle. Give users application-context `read` on the exact project, project-context `view` or `read` on the exact job, `run` on that job, and node rights only where dispatch requires them. Then verify the effective user groups and every matching policy rather than widening actions blindly.

## Official Documentation

- [Rundeck Access Control Policy and two-context model](https://docs.rundeck.com/docs/administration/security/authorization.html)
- [Rundeck ACL policy YAML format](https://docs.rundeck.com/docs/manual/document-format-reference/aclpolicy-v10.html)
- [Basic ACL examples](https://docs.rundeck.com/docs/learning/howto/acl_basic_examples.html)
- [Access Control overview](https://docs.rundeck.com/docs/learning/getting-started/acl-overview.html)
