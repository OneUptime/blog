# Why Does Rundeck Miss New or Changed Inventory Hosts? Controlling Node Source Refresh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Ansible, Automation, Troubleshooting

Description: Trace stale Rundeck nodes through inventory generation, Node Source caching, refresh controls, source ordering, and workflow dispatch timing.

---

Rundeck does not necessarily read an inventory backend every time you open a page or start a step. A project aggregates one or more Node Sources and caches the resulting resource model. An upstream inventory can be correct while the project still shows an older snapshot, and a refreshed project can still leave a currently running node-dispatched workflow on its original target set.

The fix starts by identifying which layer is stale.

## Follow One Host Through the Pipeline

Choose a newly added or changed host and verify it at each boundary.

For an Ansible inventory, run the official inventory command as the operating-system identity used by Rundeck:

```bash
sudo -u rundeck ansible-inventory \
  -i /etc/ansible/production/hosts.yml \
  --host web-prod-17

sudo -u rundeck ansible-inventory \
  -i /etc/ansible/production/hosts.yml \
  --graph
```

If this output is stale, Rundeck cannot correct it. Check dynamic-inventory plugin caching, cloud/CMDB consistency, credential scope, the selected `ansible.cfg`, and whether the service user sees the same environment as your shell.

If Ansible is current, open **Project Settings > Edit Nodes > Sources** and confirm the source path and configuration. A file changed on the host may not be the file mounted inside a Rundeck container. Likewise, an Enterprise Runner may see a different filesystem and network route from the Automation Server.

## Understand the Project Node Cache

Rundeck documentation calls the setting **cache delay**, under **Edit Nodes > Configuration**. The documented default is 30 seconds. With the default global node-cache configuration, 30 seconds is also the minimum effective refresh interval. During that interval, repeated consumers can receive the cached resource model rather than causing every source plugin to run again.

Set the delay according to how quickly inventory must converge and how expensive the backend is. A 30-second delay against a slow CMDB may create load and latency without making the CMDB itself more current. A long delay is reasonable for static infrastructure but surprising for autoscaled fleets.

The cache delay is distinct from caching inside the source:

- Rundeck's project cache controls when it asks Node Sources again.
- An Ansible dynamic-inventory plugin may maintain its own cache.
- A URL source can use HTTP `ETag` and `Last-Modified` when its `cache` option is enabled.
- A CMDB or cloud API may be eventually consistent.

Refreshing only the outer layer cannot fix stale data returned by an inner layer.

## Force a Refresh with Supported Paths

For an interactive check, wait for the cache delay to elapse, then rerun the Nodes search or reload the Nodes page. Current Rundeck does **not** expose a standalone force-refresh REST endpoint. The historical `POST /api/2/project/PROJECT/resources/refresh` endpoint was deprecated without a replacement in API v14 and removed in API v21. Changing `V` to a current API version does not bring it back.

The current `GET /api/V/project/PROJECT/resources` endpoint lists the resource model; it is not a force-refresh replacement. Once the project cache delay has expired, a resource-model request can trigger an asynchronous source reload, so the triggering response may still contain the previous cached model. Callers that require an explicit workflow boundary should use the built-in step below.

Rundeck includes a **Refresh Project Nodes** workflow step. It is useful in an orchestration job that first provisions infrastructure and then calls another job. Its important limitation is explicit in the documentation: refreshed nodes are available to subsequent **Job Reference** steps, but not to the current workflow's already established node dispatch.

A reliable orchestration shape is therefore:

1. Workflow step provisions or updates inventory.
2. Workflow step refreshes project nodes.
3. Job Reference invokes a node-dispatched child job with the desired filter.

Do not expect `refresh -> command node step` in the same job to add a host to the current job's target set.

## Check Source Ordering and Duplicate Names

Projects can merge several Node Sources. Current Rundeck loads the numbered `resources.source.N` sources in order; the legacy `project.resources.file` and `project.resources.url` properties are no longer supported. When more than one source defines the same node name, Rundeck merges their attributes by default: later values win on conflicts, earlier-only attributes remain, and tags are combined. If `project.resources.mergeNodeAttributes=false`, the later node definition replaces the earlier one.

That can make a host look partially stale: the correct source updates `hostname`, but a later source with the same node name supplies an older value. Inspect all sources and make node names globally unique within the project. If overlays are intentional, document which source owns each attribute and keep the ordering stable.

Removing a node upstream can also be masked when another source still defines it. Listing all sources is more useful than repeatedly refreshing one of them.

## Diagnose Refresh Failures

If a forced refresh does not change the Nodes page, inspect `rundeck.log` at the refresh timestamp. Look for a `ResourceModelSourceException`, subprocess exit status, parsing error, timeout, or authorization failure. Then reproduce the source call as the service user.

Common causes include:

- Inventory or configuration files are unreadable by `rundeck`.
- A script source writes diagnostics to standard output and corrupts the resource document.
- A dynamic inventory command waits for an interactive credential prompt.
- The returned YAML exceeds the Ansible Node Source's configured data-size or alias limit, or the returned YAML/JSON is malformed.
- A remote URL endpoint incorrectly returns `304 Not Modified` because it did not update its `ETag` or `Last-Modified` validator when the content changed.
- A cluster or Runner is reaching a different backend endpoint than your manual test.

Do not "fix" a transient source failure by returning an empty inventory. Depending on the plugin and merge behavior, that can make every target disappear. Fail explicitly, retain useful logs, and alert on repeated refresh errors.

## Measure Convergence

Treat node freshness as an operational objective. Record when a source-of-truth change occurs, when the inventory command exposes it, and when Rundeck's Nodes API returns it. After the cache delay or an explicit supported refresh, a small periodic check can query:

```bash
curl --fail --silent \
  --header "X-Rundeck-Auth-Token: $RUNDECK_TOKEN" \
  --header "Accept: application/json" \
  "$RUNDECK_URL/api/$RUNDECK_API_VERSION/project/Operations/resources"
```

Alert on refresh exceptions and excessive convergence time, not simply on a fixed node count; autoscaled fleets legitimately change size.

## Conclusion

Stale Rundeck nodes are usually caused by one of four boundaries: the upstream inventory, a source plugin, the project cache, or workflow dispatch timing. Validate the source as the service identity, control the documented cache delay, use the **Refresh Project Nodes** step when a forced refresh is required, and use a subsequent Job Reference when newly discovered nodes must participate in an orchestration.

## Official Documentation

- [Node Sources and cache delay](https://docs.rundeck.com/docs/learning/getting-started/jobs/node-sources.html)
- [Rundeck Node Sources overview](https://docs.rundeck.com/docs/manual/projects/resource-model-sources/)
- [Built-in Workflow Steps: Refresh Project Nodes](https://docs.rundeck.com/docs/manual/jobs/job-plugins/workflow-steps/builtin.html)
- [Rundeck API: List Project Resources](https://docs.rundeck.com/docs/api/#updating-and-listing-resources-for-a-project)
- [Rundeck API version history: removal of resource refresh](https://docs.rundeck.com/docs/api/rundeck-api-versions.html)
- [Ansible inventory guide](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html)
