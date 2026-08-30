# Validation Summary: Why Does Rundeck Miss Inventory Changes? Node Source Refresh

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Rundeck and PagerDuty Runbook Automation
- Rundeck Node Sources and project node caching
- Rundeck REST API and workflow steps
- Rundeck Enterprise Runners and clustered deployments
- Ansible inventory and dynamic-inventory caching
- HTTP conditional requests (`ETag`, `Last-Modified`, and `304 Not Modified`)
- curl

## Sources Consulted

- [Rundeck: Node Sources and How to Use Them](https://docs.rundeck.com/docs/learning/getting-started/jobs/node-sources.html)
- [Rundeck: Node Sources Overview](https://docs.rundeck.com/docs/manual/projects/resource-model-sources/)
- [Rundeck: Open Source Resource Model Source Plugins](https://docs.rundeck.com/docs/manual/projects/resource-model-sources/builtin.html)
- [Rundeck: Configuring Resource Model Sources](https://docs.rundeck.com/docs/administration/configuration/plugins/configuring.html#resource-model-sources)
- [Rundeck: Built-in Workflow Steps](https://docs.rundeck.com/docs/manual/jobs/job-plugins/workflow-steps/builtin.html#refresh-project-nodes)
- [Rundeck API: Listing Resources](https://docs.rundeck.com/docs/api/#listing-resources)
- [Rundeck API Version History](https://docs.rundeck.com/docs/api/rundeck-api-versions.html)
- [Rundeck 6.1 source: node-cache settings and refresh behavior](https://github.com/rundeck/rundeck/blob/v6.1.0/rundeckapp/grails-app/services/rundeck/services/NodeService.groovy)
- [Rundeck 6.1 source: Node Source loading and merge selection](https://github.com/rundeck/rundeck/blob/v6.1.0/core/src/main/java/com/dtolabs/rundeck/core/common/ProjectNodeSupport.java)
- [Rundeck 6.1 source: default duplicate-node attribute merging](https://github.com/rundeck/rundeck/blob/v6.1.0/core/src/main/java/com/dtolabs/rundeck/core/common/MergedAttributesNodeSet.java)
- [Rundeck source: removal of legacy project file/URL properties](https://github.com/rundeck/rundeck/commit/29f7c1284d6729ecb6566311926f61639ae5ba2a)
- [Rundeck 6.1 source: API route mappings](https://github.com/rundeck/rundeck/blob/v6.1.0/rundeckapp/grails-app/controllers/rundeckapp/UrlMappings.groovy)
- [Rundeck 6.1 source: Nodes page](https://github.com/rundeck/rundeck/blob/v6.1.0/rundeckapp/grails-spa/packages/ui-trellis/src/app/pages/nodes/main.ts)
- [Rundeck 6.1 source: node-filter results refresh behavior](https://github.com/rundeck/rundeck/blob/v6.1.0/rundeckapp/grails-spa/packages/ui-trellis/src/app/components/job/resources/NodeFilterResults.vue)
- [Rundeck: Ansible Integration](https://docs.rundeck.com/docs/learning/howto/using-ansible.html)
- [Rundeck: Server Logs](https://docs.rundeck.com/docs/administration/maintenance/logs.html)
- [Ansible: `ansible-inventory` CLI](https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html)
- [Ansible: Configuration Settings](https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html)
- [Ansible: Cache Plugins](https://docs.ansible.com/projects/ansible/latest/plugins/cache.html)
- [curl Manual](https://curl.se/docs/manpage.html)

## Issues Found

- The five-second cache-delay example was below the minimum effective interval under Rundeck's default global node-cache configuration. Added the 30-second effective minimum and changed the example to 30 seconds.
- The post described a Nodes UI control as a supported force refresh. Current Rundeck's Nodes-page search/reload reads through the cache rather than explicitly invalidating it. Replaced that advice with waiting for the cache delay and rerunning the search or reloading the page; the conclusion now reserves forced refreshes for the **Refresh Project Nodes** workflow step.
- The resource-model GET discussion did not mention asynchronous cache refresh behavior. Clarified that an eligible request can trigger the reload while that same response still contains the previous cached model.
- The source-order statement said current Rundeck loads legacy `project.resources.file` and `project.resources.url` sources. Those properties are no longer supported. Corrected the post to describe ordered `resources.source.N` sources only.
- The duplicate-node statement implied wholesale replacement by the later source. By default, Rundeck retains earlier-only attributes, lets later values win conflicts, and unions tags. Corrected the merge explanation and documented whole-node replacement when `project.resources.mergeNodeAttributes=false`.
- The failure list generalized the Ansible Node Source's documented YAML size and alias limits to JSON. Limited that claim to YAML while retaining malformed YAML/JSON as a general parsing failure.
- The `304 Not Modified` example did not identify the actual validator error. Clarified that the remote endpoint must have failed to update its `ETag` or `Last-Modified` validator after changing content.

## Review Notes

- Both `ansible-inventory` commands use current, documented flags. The `curl` request uses the current project-resources GET endpoint, a supported API-token header, and valid JSON content negotiation.
- The refresh endpoint history is correct: the API v2 endpoint was deprecated without replacement in v14 and removed in v21. The **Refresh Project Nodes** limitation and the provision → refresh → Job Reference workflow are also correct.
- All external links in the post resolved successfully during validation.
- The current Rundeck configuration documentation still describes the removed legacy `project.resources.file` and `project.resources.url` loading order. The version-pinned 6.1 runtime source and the official removal commit were used to resolve that documentation discrepancy.
- `sudo -u rundeck` reproduces the service account identity but not automatically a container's or Runner's filesystem, environment, working directory, or explicitly configured `ansible.cfg`; the post appropriately warns readers to check those execution-context differences.
