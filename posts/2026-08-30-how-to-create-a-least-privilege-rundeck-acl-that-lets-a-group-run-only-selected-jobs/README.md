# How to Create a Least-Privilege Rundeck ACL That Lets a Group Run Only Selected Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Access Control, RBAC, Security, YAML

Description: Grant a Rundeck group access to one project, selected jobs, and only the nodes those jobs require using application- and project-context ACL rules.

---

Rundeck authorization has two contexts. The **application** context controls whether a user can see and enter a project. The **project** context controls what the user can do to jobs, nodes, events, and other resources inside it. A least-privilege execution role normally needs rules in both contexts.

The example below lets the group `release-operators` run one job, `Production/Maintenance/Restart API`, in the `Operations` project. It does not grant job editing, ad-hoc commands, project configuration, schedule changes, or access to every production node.

## Define the Application-Context Rule

The user must be able to see the target project:

```yaml
description: Allow release operators to enter the Operations project
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

This does not authorize actions inside `Operations`; it only grants application-level project visibility. Avoid `name: '.*'` when the role is meant for one project.

## Define the Project-Context Rule

Add a second YAML document, separated by `---`:

```yaml
description: Run only the Restart API job on production API nodes
context:
  project: Operations
for:
  job:
    - equals:
        group: Production/Maintenance
        name: Restart API
      allow: [view, run, view_history]
  node:
    - contains:
        tags: [production, api]
      allow: [read, run]
  resource:
    - equals:
        kind: event
      allow: [read]
by:
  group: release-operators
```

`view` lets the operator view the job without granting its workflow definition; `run` authorizes execution; and `view_history` permits access to that job's execution history. Add job `read` only if the user needs to inspect/download the definition. The node rule is needed for a node-dispatched job. With both tags in one `contains` rule, a node must carry both `production` and `api`.

Generic event `read` and job-specific `view_history` are not required to start the job, but current ACL examples use both for execution-history visibility. Remove `view_history` from the job action list and remove the event rule if that visibility is outside the role.

Store the two documents together as, for example, `release-operators.aclpolicy` through the supported ACL management interface. On filesystem-backed open-source installations, system policy files commonly live in `/etc/rundeck` for package installs or `$RDECK_BASE/etc` for launcher installs. Project ACL storage and commercial ACL features can change where policies are managed; use the UI/API appropriate to the deployment.

## Match the Job Precisely

The `job` stanza addresses existing, specific jobs. Match both `group` and `name` when names can repeat in different folders. `group` is the job's full group path without inventing a leading slash.

For a small approved set, add one exact rule per job:

```yaml
job:
  - equals:
      group: Production/Maintenance
      name: Restart API
    allow: [view, run]
  - equals:
      group: Production/Maintenance
      name: Clear API Cache
    allow: [view, run]
```

A regex `match` is convenient but can silently grant access to a future job whose name matches. Exact matches make review and change control clearer.

Do not confuse `resource: kind: job` with `job:`. The generic resource rule controls operations such as creating or deleting jobs; the `job:` rule controls actions on particular saved jobs. This execution role does not need generic job-resource permissions.

## Put a Ceiling on Node Access

Job permission alone does not authorize execution on every node. The node rule should match only the job's intended targets. You can match a custom attribute instead:

```yaml
node:
  - equals:
      environment: production
      application: api
    allow: [read, run]
```

Use `equals` for exact attributes, `match` for regex matching, and `contains` for tag membership. Multiple criteria in one rule are AND conditions; separate rules broaden access with OR behavior.

If the saved job can accept an editable node filter, node ACLs are particularly important. A user may request a broad filter, but authorization should still prevent execution outside their approved nodes. Also review whether the job itself can use `sudo` or an API credential to affect systems beyond those nodes; Rundeck ACLs cannot constrain privileges hidden inside a script.

## Test as the Real Group

Create a test user that receives only `release-operators`, then verify:

- `Operations` appears, but unrelated projects do not.
- The approved job is visible and runnable.
- Other jobs are absent or unauthorized.
- The job sees only nodes with both approved tags.
- Job edit, delete, schedule toggle, ad-hoc command, and project configuration actions are unavailable.
- Execution history visibility matches the event rule.

Test through both the GUI and an API token for that user if automation will call the job. API tokens inherit the effective user's authorization; an endpoint does not bypass ACLs.

Rundeck policies are evaluated together. Another policy for the same group, a broad mapped role, or a username-specific rule may grant additional rights. Search all applicable policies before concluding this file is the user's complete permission set. Likewise, an explicit deny elsewhere can explain an unexpected refusal.

## Account for Key Storage

Key Storage has separate `storage` authorization; job `run` does not itself grant storage access. If the selected executor or plugin requires the caller's roles to have storage `read`, scope it to the exact project key hierarchy and test that execution path. Be aware that storage `read` authorizes listing and reading matching entries, so do not copy an administrator policy's broad storage rule into a run-only role.

Keep the webhook or service account used for automated execution separate from human groups. Give it the same narrow job/node rights and short-lived API tokens where possible.

## Conclusion

A complete run-only role needs application `project: read`, project-level permission on exact jobs, and node `read/run` only for intended targets. Avoid generic job-resource and ad-hoc permissions, test with a clean user, and audit every other policy that applies to the group. Least privilege is the union of effective policies, not just the smallest file you wrote.

## Official Documentation

- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html)
- [Rundeck ACL policy YAML format](https://docs.rundeck.com/docs/manual/document-format-reference/aclpolicy-v10.html)
- [Basic ACL examples](https://docs.rundeck.com/docs/learning/howto/acl_basic_examples.html)
- [Node-filtered group execution](https://docs.rundeck.com/docs/learning/howto/acls/group-node-filtered.html)
