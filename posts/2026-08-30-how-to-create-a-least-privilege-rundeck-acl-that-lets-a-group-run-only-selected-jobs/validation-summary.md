# Validation Summary: Create a Least-Privilege Rundeck ACL for Selected Jobs

## Status

validated

## Post Type

Tutorial and security configuration guide

## Technologies Covered

- Rundeck ACL Policy 1.0
- Rundeck application- and project-context authorization
- Role-based access control (RBAC)
- YAML
- Job, node, and history-event permissions
- Node tag and custom-attribute filters
- Rundeck API tokens, webhooks, and Key Storage

## Sources Consulted

- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html)
- [Rundeck ACLPOLICY YAML format](https://docs.rundeck.com/docs/manual/document-format-reference/aclpolicy-v10.html)
- [Rundeck basic ACL examples](https://docs.rundeck.com/docs/learning/howto/acl_basic_examples.html)
- [Rundeck node-filtered group execution recipe](https://docs.rundeck.com/docs/learning/howto/acls/group-node-filtered.html)
- [Rundeck single-job execution recipe](https://docs.rundeck.com/docs/learning/howto/acls/group-jobname.html)
- [Rundeck API reference: ACLs, tokens, history, and Key Storage](https://docs.rundeck.com/docs/api/)
- [Rundeck ACL Policy GUI](https://docs.rundeck.com/docs/administration/security/acl-policy-editor.html)
- [Rundeck Key Storage](https://docs.rundeck.com/docs/manual/key-storage/)
- [Rundeck Storage Facility and Key Storage security model](https://docs.rundeck.com/docs/administration/configuration/storage-facility.html)
- [Rundeck Webhooks](https://docs.rundeck.com/docs/manual/webhooks.html)
- [Rundeck editable node-filter behavior](https://docs.rundeck.com/docs/learning/getting-started/jobs/pieces-of-a-job.html#editable-filter)
- [Rundeck 6.1.0 release notes](https://docs.rundeck.com/docs/history/6_x/version-6.1.0.html)
- [Rundeck source: node-list authorization in FrameworkController](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/rundeckapp/grails-app/controllers/rundeck/controllers/FrameworkController.groovy)
- [Rundeck source: project-history authorization in ReportsController](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/rundeckapp/grails-app/controllers/rundeck/controllers/ReportsController.groovy)
- [Rundeck source: per-job history authorization in ReportService](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/rundeckapp/grails-app/services/rundeck/services/ReportService.groovy)

## Issues Found

- The project-context policy omitted generic `resource: kind: node` `read`. Current node-list, node-inventory, and editable-filter-preview endpoints require that generic gate before applying per-node authorization. Added the generic node-resource rule while retaining the tag-filtered `node: read/run` rule that limits returned and runnable nodes.
- The post described `view_history` as necessary for the selected job's history even though job `view` already permits viewing the job and its executions. Removed the redundant `view_history` grant and corrected the action descriptions. Job `read` remains intentionally absent because it also exposes the workflow definition and permits definition download.
- Generic event `read` was presented as part of selected-job history access, but it authorizes project-wide history events and is not scoped by the exact job match. Removed it from the least-privilege policy and explained that it should be added only when project Activity/history access is intended.
- The warning about `name: '.*'` did not identify the comparator. Under `equals`, that value is literal; it is broad only under regex `match`. Corrected the warning.
- The storage instructions could lead readers to upload both YAML documents as a project policy. Project ACL storage accepts only project-context policies. Corrected the instructions so the combined document is stored as a system policy, or split between system and project storage.
- The post implied that any API token inherits the user's authorization. Corrected this to the current token model: ACLs use the token's effective username and stored roles; user tokens carry a subset of their owner's roles, while authorized service tokens can carry a different identity or roles.
- The Key Storage section could imply that an operator needs storage `read` whenever a job uses a stored secret. Clarified that Rundeck can use referenced private keys and passwords internally without exposing them to the operator, and that private-key/password contents cannot be retrieved directly through the standard API.
- The automation guidance conflated webhook authentication with API tokens. Corrected it to use a webhook's configured assumed identity/roles and webhook Authorization String, while reserving bounded-lifetime user or service tokens for direct API automation.
- The conclusion called effective authorization a simple union. Corrected it to state that matching allows are additive but any matching deny takes precedence.

## Review Notes

- The revised YAML was parsed successfully as valid YAML, and all resource types, comparators, properties, and action names are current.
- Every documentation and source link in the post and this summary returned HTTP 200 during validation.
- The review used current Rundeck 6.1 documentation and source behavior as of 2026-08-30. Rundeck 6.0.0 had a regression that prevented `view_history`-only users from seeing executions through the executions API; Rundeck 6.1.0 fixed it. Deployments remaining on 6.0.0 should upgrade or test history behavior explicitly.
- Generic node-resource `read` is required for the Nodes GUI/API and editable-filter previews, but fixed saved-job execution checks the filtered per-node `read/run` permissions directly. The post includes the generic rule because it explicitly requires GUI and API testing.
