# Validation Summary: How to Pass a Job Option into a Rundeck Node Filter for Dynamic Target Selection

## Status

validated

## Post Type

Technical tutorial / guide

## Technologies Covered

- Rundeck Jobs and job options
- Rundeck node resources and node-filter expressions
- Rundeck Web API
- Rundeck access-control policies
- Shell, curl, JSON, and jq

## Sources Consulted

- [Rundeck: Creating jobs](https://docs.rundeck.com/docs/manual/jobs/creating-jobs.html)
- [Rundeck: Node Filters](https://docs.rundeck.com/docs/manual/11-node-filters.html)
- [Rundeck: Job Options](https://docs.rundeck.com/docs/manual/jobs/job-options.html)
- [Rundeck: RESOURCE-YAML](https://docs.rundeck.com/docs/manual/document-format-reference/resource-yaml-v13.html)
- [Rundeck API: Running a Job](https://docs.rundeck.com/docs/api/#running-a-job)
- [Rundeck API: Getting Started](https://docs.rundeck.com/docs/api/api_basics.html)
- [Rundeck: Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html)
- [Rundeck: Group/Project Node-Filtered Execute](https://docs.rundeck.com/docs/learning/howto/acls/group-node-filtered.html)
- [Rundeck source: run-job API controller](https://github.com/rundeck/rundeck/blob/v6.1.0/rundeckapp/grails-app/controllers/rundeck/controllers/ScheduledExecutionController.groovy)
- [Rundeck source: dynamic whole-filter expansion tests](https://github.com/rundeck/rundeck/blob/v6.1.0/rundeckapp/src/test/groovy/rundeck/ExecutionService2Spec.groovy)
- [Rundeck source: current option-editor labels](https://github.com/rundeck/rundeck/blob/v6.1.0/rundeckapp/grails-app/i18n/messages.properties)
- [jq Manual](https://jqlang.org/manual/)
- [curl Manual](https://curl.se/docs/manpage.html)

## Issues Found

- The API example did not state the minimum API version for its JSON `options` map. Added that `RUNDECK_API_VERSION` must select API version 18 or later; the run-job endpoint exists in API v17, but the `options` object is supported from API v18.

## Review Notes

- Verified that the RESOURCE-YAML map form, custom attributes, comma-separated tags, dynamic `${option.name}` expansion, complete-filter option expansion, negated attributes, tag AND/OR operators, and regular-expression filters are valid.
- Verified that a top-level `filter` in the run-job API request overrides the saved node filter independently of the GUI's editable-filter setting. The browser-link `nodeFilter` parameter, by contrast, is ignored unless `nodeFilterEditable` is enabled.
- Verified the curl and jq syntax locally. `curl --fail-with-body` is current and non-deprecated but requires curl 7.76.0 or later.
- Verified that node ACLs remain the authorization boundary for execution targets and that all documentation links in the post resolve successfully.
