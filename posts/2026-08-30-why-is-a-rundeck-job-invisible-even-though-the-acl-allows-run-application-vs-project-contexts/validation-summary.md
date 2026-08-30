# Validation Summary: Invisible Rundeck Job? Application vs Project ACL Contexts

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Rundeck and PagerDuty Runbook Automation
- Rundeck ACLPOLICY YAML v1.0
- Access control, roles/groups, and deny/allow evaluation
- Rundeck job and node authorization
- Rundeck REST API tokens and endpoints
- Rundeck `rd acl` command-line validation

## Sources Consulted
- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html)
- [Rundeck ACLPOLICY YAML format](https://docs.rundeck.com/docs/manual/document-format-reference/aclpolicy-v10.html)
- [Rundeck ACL Policy GUI](https://docs.rundeck.com/docs/administration/security/acl-policy-editor.html)
- [Rundeck `rd acl` reference](https://docs.rundeck.com/docs/rd-cli/rd-acl.html)
- [Rundeck ACL basic examples](https://docs.rundeck.com/docs/learning/howto/acl_basic_examples.html)
- [Rundeck node-filtered ACL example](https://docs.rundeck.com/docs/learning/howto/acls/group-node-filtered.html)
- [Rundeck read-only ACL example](https://docs.rundeck.com/docs/learning/howto/acls/group-readonly.html)
- [Rundeck job workflows](https://docs.rundeck.com/docs/manual/jobs/job-workflows.html)
- [Rundeck creating jobs and node dispatch](https://docs.rundeck.com/docs/manual/jobs/creating-jobs.html)
- [Rundeck API reference](https://docs.rundeck.com/docs/api/)
- [Rundeck authenticating users](https://docs.rundeck.com/docs/administration/security/authentication.html)
- [Rundeck Key Storage](https://docs.rundeck.com/docs/manual/key-storage/index.html)

## Issues Found
- The section heading referred to two gates while the section enumerated four authorization checks across Rundeck's two contexts. It now refers to authorization gates without giving the wrong count.
- The opening and incomplete-policy explanation could be read as saying that project-context `run` alone provides complete execution access or that a direct job-details URL bypasses visibility checks. It now states that application-context project `read` and any required node authorization must also be satisfied, that a run-by-UUID API request can exercise `run` without listing the job, and that a job-details URL still requires job `view` or `read`.
- Node `read` and `run` were grouped together as dispatch permissions. The post now distinguishes their documented meanings: `read` controls node visibility, while `run` authorizes execution on matching nodes.
- The local-execution caveat was ambiguous. Rundeck's Execute Locally setting can still target the Rundeck server as a node for Node Steps. The post now limits the no-node-permission case to workflows composed entirely of Workflow Steps and explains that local Node Steps need authorization for the Rundeck server node.
- `context.project` was described without noting that its value is a regular expression. The checklist now identifies it as a case-sensitive regex and advises escaping metacharacters when a literal project name is intended.
- The node-tag selector did not explain that `contains: {tags: [production, api]}` is a superset/AND test. The post now states that matching nodes must have both tags.
- Policy placement and validation advice implied that an application-context document could simply be stored as a project ACL and that the GUI tooling was generally available. The post now explains the project-context restriction, identifies the ACL Policy GUI and Access Level Checks as commercial features, and gives the current `rd acl validate -f` alternative.
- Reauthentication advice did not distinguish browser sessions from API tokens. The post now notes that a token retains the username and roles assigned at generation and must be replaced when that stored identity needs to change.

## Review Notes
All YAML examples parse successfully and use current, non-deprecated ACLPOLICY fields, selectors, and actions. The four documentation links in the post returned HTTP 200 and pointed to the intended official Rundeck pages. The post does not target a specific Rundeck version; `view_history` is available in Rundeck 3.2.4 and later. No other technical issues were found.
