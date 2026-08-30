# Why Is a Rundeck Job Invisible Even Though the ACL Allows `run`? Application vs Project Contexts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Access Control, RBAC, Troubleshooting, Security

Description: Fix invisible Rundeck jobs by separating project visibility, job visibility, execution permission, node authorization, and effective group membership.

---

In Rundeck, permission to execute a job is not the same as permission to discover or inspect it. A project-context rule that grants `run` can authorize the action while the GUI still has no permission to list the project or show the job. This is a consequence of Rundeck's two-context authorization model, not a stale browser cache.

## The Two Gates Before Execution

A typical operator crosses these authorization gates:

1. **Application context:** `read` on the project makes the project visible.
2. **Project context:** `view` or `read` on the specific job makes the job visible at the intended detail level.
3. **Project context:** `run` on the job permits execution.
4. **Project context:** `read` and `run` on targeted nodes permit node dispatch.

The first rule answers "may this identity enter `Operations`?" The remaining rules answer "what may it do inside `Operations`?"

This incomplete policy grants execution but not project or job visibility:

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

The user may receive an authorization result different from what the job list suggests, particularly through a direct URL or API call, but the UI cannot build a useful listing from `run` alone.

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

Rundeck distinguishes job `view` from `read`. The official authorization examples explain that a user with `view` but not `read` can view a job without reading its workflow definition or downloading that definition. Add `read` when the operator should inspect the definition:

```yaml
allow: [read, view, run]
```

Do not add `update`, `delete`, `toggle_schedule`, or a wildcard simply to make the job appear.

For a job that executes only locally and does not dispatch to nodes, node rights may not be needed in this form. For a dispatched job, missing node `read/run` often produces the next failure after the job becomes visible.

## Check the Match, Not Just the Actions

An action list can be correct while the resource selector matches nothing. Verify:

- `context.project` matches the actual project, including case.
- `job.group` is the full job group path.
- `job.name` matches exactly when using `equals`.
- A regex under `match` is anchored as intended.
- The policy uses `job:` for a specific saved job, not only `resource: kind: job`.

`resource: kind: job` governs generic operations such as creating jobs. It does not replace the specific `job:` rule used for viewing and running existing jobs.

If a job was moved to another group, an exact policy for its old group correctly stops matching. Treat job path changes as authorization changes and review them together.

## Verify Effective Identity and Policy Placement

Rundeck authorizes the username and roles/groups produced by its authentication system. Confirm the user actually receives `release-operators`; an LDAP, SSO, or preauthenticated proxy group string may differ from the display name administrators expect.

Also confirm Rundeck loaded the policy in the intended scope. A syntactically invalid YAML document, wrong file extension, unsupported storage location, or application rule accidentally saved as a project-only policy can make a correct-looking snippet irrelevant. Use Rundeck's ACL management/validation interface and inspect server logs for parse errors.

Policy effects are combined. Search all policies that match the username and groups. A broad rule can grant more access than expected, while an explicit deny can block an otherwise allowed action. Test with a clean user that has only the target role rather than an administrator who also carries unrelated groups.

## Use the Symptom to Locate the Missing Permission

- **No projects appear:** application-context project `read` is absent or does not match.
- **Project appears, job does not:** project-context job `view`/`read` is absent or the selector misses.
- **Job appears, Run is denied:** job `run` is absent, denied elsewhere, or execution is disabled.
- **Job starts but nodes are absent/unauthorized:** node `read/run` or the node filter is the issue.
- **History is unavailable:** when required, grant job `view_history` for the selected job and project resource `kind: event` `read`.
- **API returns unauthorized while GUI works for an admin:** the token's user/roles differ or the token is expired.

Do not use storage `read` as a generic fix for job visibility. Key Storage has its own authorization and should be granted only for a concrete credential-management need.

## Test Both Discovery and Direct Execution

Log in as the affected user and list project jobs in the GUI. If API access matters, use that user's token to call the project jobs endpoint, then the run endpoint. Record HTTP status and error body without exposing the token. This tests the same ACL model while separating list permission from run permission.

After modifying a policy, reauthenticate if group membership changed. A session established before an identity-provider role update may retain old authorities until the next login.

## Conclusion

`run` is an action permission, not a visibility bundle. Give users application-context `read` on the exact project, project-context `view` or `read` on the exact job, `run` on that job, and node rights only where dispatch requires them. Then verify the effective user groups and every matching policy rather than widening actions blindly.

## Official Documentation

- [Rundeck Access Control Policy and two-context model](https://docs.rundeck.com/docs/administration/security/authorization.html)
- [Rundeck ACL policy YAML format](https://docs.rundeck.com/docs/manual/document-format-reference/aclpolicy-v10.html)
- [Basic ACL examples](https://docs.rundeck.com/docs/learning/howto/acl_basic_examples.html)
- [Access Control overview](https://docs.rundeck.com/docs/learning/getting-started/acl-overview.html)
