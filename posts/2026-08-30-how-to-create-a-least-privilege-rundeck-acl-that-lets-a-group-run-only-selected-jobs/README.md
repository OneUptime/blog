# Create a Least-Privilege Rundeck ACL for Selected Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Access Control, RBAC, Security, YAML

Description: Grant a Rundeck group access to one project and selected jobs, with execution limited to only the nodes those jobs require, using application- and project-context ACL rules.

---

Rundeck authorization has two contexts. The **application** context controls whether a user can see and enter a project. The **project** context controls what the user can do to jobs, nodes, events, and other resources inside it. A least-privilege execution role normally needs rules in both contexts.

The example below lets the group `release-operators` run one job, `Production/Maintenance/Restart API`, in the `Operations` project. It does not grant job editing, ad-hoc commands, project configuration, schedule changes, or execution access to every production node.

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

This does not authorize actions inside `Operations`; it only grants application-level project visibility. Avoid a `match` rule with `name: '.*'` when the role is meant for one project; under `equals`, `.*` would be a literal project name.

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
      allow: [view, run]
  node:
    - contains:
        tags: [production, api]
      allow: [read, run]
  resource:
    - equals:
        kind: node
      allow: [read]
by:
  group: release-operators
```

`view` lets the operator view the job and its executions without granting its workflow definition; `run` authorizes execution. The separate job action `view_history` is useful as a history-only permission but is redundant here because `view` already includes execution visibility. Add job `read` only if the user needs to inspect or download the definition.

The generic node-resource `read` rule opens node-list and node-filter-preview endpoints; the filtered `node` rule determines which individual nodes the operator can read and run against. The specific node rule is needed for a node-dispatched job. With both tags in one `contains` rule, a node must carry both `production` and `api`.

The policy intentionally omits generic event `read`. A `resource` rule for `kind: event` grants access to project-wide history events, not only the selected job. Add it only if the role should also read the project's Activity/history data.

Store the two documents together as a system ACL policy, for example as `release-operators.aclpolicy` in the system policy directory or through the System ACL API. If you use Project ACL storage, split them: keep the application-context document in a system policy and store only the project-context document under `Operations`. On self-managed installations using filesystem policies, the default directory is `/etc/rundeck` for RPM/DEB packages or `$RDECK_BASE/etc` for launcher/WAR installs. The graphical ACL policy editor is a commercial feature, so use the filesystem or ACL APIs where that editor is unavailable.

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
- Node selectors return only nodes with both approved tags, and execution on other nodes is unauthorized.
- Job edit, delete, schedule toggle, ad-hoc command, and project configuration actions are unavailable.
- The approved job's executions are visible through its job view, but project-wide Activity/history access is unavailable.

Test through both the GUI and an API token for that user if automation will call the job. API calls are checked against the token's effective username and stored authorization roles. A user token carries the owner's username and a subset of the owner's roles; an authorized service token can carry a different username or roles. An API endpoint does not bypass ACLs.

Rundeck policies are evaluated together. Another policy for the same group, a broad mapped role, or a username-specific rule may grant additional rights. Search all applicable policies before concluding this file is the user's complete permission set. Allows are additive, but any matching explicit deny takes precedence and can explain an unexpected refusal.

## Account for Key Storage

Key Storage has separate `storage` authorization; job `run` does not itself grant direct storage access. A job can use referenced private keys or passwords internally without granting the operator storage `read`. Grant narrowly scoped storage `read` only when the operator must browse or read the path, or when a plugin explicitly documents a caller-role check, and test that execution path. Storage `read` permits listing matching paths and reading accessible entry metadata or data, but private-key and password contents cannot be retrieved directly through the standard API. Do not copy an administrator policy's broad storage rule into a run-only role.

For a webhook, configure a dedicated assumed user and roles with the same narrow job/node rights, and protect the endpoint with its webhook Authorization String. For direct API automation, use a dedicated user or controlled service token with narrow stored roles and a bounded lifetime.

## Conclusion

For this UI- and API-tested node-dispatched example, a complete run-only role needs application `project: read`, project-level permission on exact jobs, generic node-resource `read` for node-list endpoints, and specific node `read/run` only for intended targets. Avoid generic job-resource, event, and ad-hoc permissions unless they are required, test with a clean user, and audit every other policy that applies to the group. Effective authorization is the aggregate of every matching policy: allows are additive, and any matching deny overrides an allow.

## Official Documentation

- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html)
- [Rundeck ACL policy YAML format](https://docs.rundeck.com/docs/manual/document-format-reference/aclpolicy-v10.html)
- [Basic ACL examples](https://docs.rundeck.com/docs/learning/howto/acl_basic_examples.html)
- [Node-filtered group execution](https://docs.rundeck.com/docs/learning/howto/acls/group-node-filtered.html)
