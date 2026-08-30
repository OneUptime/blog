# Validation Summary: How to Import an Ansible Inventory into Rundeck and Fix "No Matched Nodes"

## Status
validated

## Post Type
Tutorial and troubleshooting guide

## Technologies Covered
- Rundeck Resource Model Sources and Node Executors
- Rundeck node filters, job options, ACLs, and Web API
- Rundeck Enterprise Runner node discovery
- Ansible inventory and inventory plugins
- `ansible-inventory` and `ansible` command-line tools
- YAML

## Sources Consulted
- [Ansible `ansible-inventory` CLI documentation](https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html)
- [Ansible configuration-file discovery and relative-path rules](https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#the-configuration-file)
- [Ansible YAML inventory plugin](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yaml_inventory.html)
- [Ansible inventory guide](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html)
- [Ansible host-pattern guide](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html)
- [Ansible inventory-plugin guide](https://docs.ansible.com/projects/ansible/latest/plugins/inventory.html)
- [Rundeck: Integrate with Ansible](https://docs.rundeck.com/docs/learning/howto/using-ansible.html)
- [Official Rundeck Ansible plugin: Resource Model Source](https://github.com/rundeck-plugins/ansible-plugin#resource-model-source)
- [Official plugin property metadata at reviewed commit `4ed7b6b`](https://github.com/rundeck-plugins/ansible-plugin/blob/4ed7b6be6bc692100464cf0b93c2b8c385f5d853/src/main/groovy/com/rundeck/plugins/ansible/ansible/AnsibleDescribable.java)
- [Official plugin inventory-to-node mapping at reviewed commit `4ed7b6b`](https://github.com/rundeck-plugins/ansible-plugin/blob/4ed7b6be6bc692100464cf0b93c2b8c385f5d853/src/main/groovy/com/rundeck/plugins/ansible/plugin/AnsibleResourceModelSource.java)
- [Official plugin no-facts field mapping at reviewed commit `4ed7b6b`](https://github.com/rundeck-plugins/ansible-plugin/blob/4ed7b6be6bc692100464cf0b93c2b8c385f5d853/src/main/groovy/com/rundeck/plugins/ansible/ansible/InventoryList.java)
- [Rundeck Node Sources overview](https://docs.rundeck.com/docs/manual/projects/resource-model-sources/)
- [Rundeck Node Sources setup and cache behavior](https://docs.rundeck.com/docs/learning/getting-started/jobs/node-sources.html)
- [Rundeck Resource Model Source ordering](https://docs.rundeck.com/docs/administration/configuration/plugins/configuring.html#resource-model-sources)
- [Rundeck node-filter syntax](https://docs.rundeck.com/docs/manual/11-node-filters.html#node-filter-syntax)
- [Rundeck dynamic node filters](https://docs.rundeck.com/docs/manual/jobs/creating-jobs.html#dynamic-node-filters)
- [Rundeck job links and editable node filters](https://docs.rundeck.com/docs/manual/jobs/job-options.html#linking-to-jobs-and-providing-option-values)
- [Rundeck API: Running a Job](https://docs.rundeck.com/docs/api/#running-a-job)
- [Rundeck built-in Refresh Project Nodes workflow step](https://docs.rundeck.com/docs/manual/jobs/job-plugins/workflow-steps/builtin.html#refresh-project-nodes)
- [Rundeck API version history](https://docs.rundeck.com/docs/api/rundeck-api-versions.html#version-21)
- [Rundeck node discovery with Enterprise Runners](https://docs.rundeck.com/docs/administration/runner/using-runners/runners-for-node-discovery.html)
- [Rundeck Runner log documentation](https://docs.rundeck.com/docs/administration/runner/runner-troubleshooting/troubleshooting-runners.html#runner-logs)

## Issues Found
- The service-user test commands selected the inventory with `-i` but did not guarantee that Ansible loaded the same explicit `ansible.cfg` configured in Rundeck. Added `sudo -H -u rundeck env ANSIBLE_CONFIG=...` so both commands pin the intended configuration while running under the conventional service identity.
- The diagnostics sentence said the commands catch Vault prompts and other failures. `ansible-inventory` does not prompt for a Vault password unless prompting is configured or requested, and some inventory parsing problems can be warnings. Changed the text to tell readers to inspect warnings and returned hosts and to describe Vault-credential problems accurately.
- The Resource Model Source setup referred vaguely to executable or Python settings. The current source exposes **Ansible binaries directory path**; **Executable** belongs to the separate Ansible Ad-Hoc Node Executor. Replaced the bullet with the current source field and its purpose.
- The source's SSH authentication settings were described as node-execution settings. They are used by Ansible when discovery gathers facts and do not configure a separate Rundeck Node Executor. Clarified the separation and noted that executor authentication must be configured separately.
- Saving a Node Source requires committing the Sources page after saving the source entry. Added the documented page-level **Save** step.
- Troubleshooting mentioned only the conventional `rundeck` identity and `rundeck.log`, even though the post includes Runner-based discovery. Clarified runtime path and identity checks and added the documented Runner logs for delegated discovery.
- The post implied that Ansible groups needed a configurable mapping to Rundeck tags and grouped arbitrary host-variable mapping with that behavior. The plugin imports groups as tags by default, subject to its ignored-tag setting, while arbitrary host variables become custom attributes only when **Import host vars** is enabled. Corrected both explanations.
- Duplicate-source precedence was described as an attribute override. Rundeck documents that the node definition from the lowest (later) source in the list is used. Updated the wording to match that behavior.
- The 10 MB YAML data limit and 1,000-alias defaults apply to the YAML inventory path used when **Gather Facts** is disabled. Added that qualifier.
- The whitespace statement was too broad. A YAML key can contain whitespace, but ordinary Ansible host-pattern parsing can split such a name into separate patterns. Updated the explanation while retaining the correct operational advice to avoid whitespace.
- The removed refresh endpoint omitted its method, API prefix, and deprecation version. Replaced it with the documented `POST /api/2/project/[PROJECT]/resources/refresh` endpoint and stated that it was deprecated without replacement in API v14 and removed in API v21.

## Review Notes
- The static inventory example is valid YAML and follows Ansible's `all`/`children`/`hosts`/`vars` inventory structure. The group variable `ansible_user: deploy` applies to both example hosts.
- The `ansible-inventory -i ... --list`, `ansible-inventory -i ... --graph`, and `ansible web --list-hosts` command forms and flags are current.
- The documented mappings from inventory hostname, `ansible_host`, and `ansible_user` to Rundeck node name, `hostname`, and `username` match the current official plugin implementation.
- The Rundeck filter examples are valid: `+` requires both tags, a comma expresses alternatives, separate attribute clauses are combined, and the hostname value is a valid regular expression.
- Dynamic `${option.target}` filters can legitimately show no preview matches before an option value is supplied. The browser `nodeFilter` parameter depends on an editable filter, while the run-job API separately accepts `filter`; node ACLs remain the authorization boundary.
- Disabling **Gather Facts**, the 30-second default node-cache delay, the Refresh Project Nodes workflow-step scope, and the historical API removal are all accurately described after the corrections.
- All external links in the post point to the intended current official Ansible or Rundeck documentation pages as of the validation date.
