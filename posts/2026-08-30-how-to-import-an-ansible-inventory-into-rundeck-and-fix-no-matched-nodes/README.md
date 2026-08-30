# How to Import an Ansible Inventory into Rundeck and Fix "No Matched Nodes"

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Ansible, Automation, Troubleshooting, YAML

Description: Configure an Ansible Resource Model Source in Rundeck, verify inventory parsing as the service user, and diagnose filters that report no matched nodes.

---

Rundeck can use an existing Ansible inventory as a project Node Source. This does not copy a one-time host list into a job: the Ansible Resource Model Source reads inventory and turns its hosts and variables into Rundeck nodes. A `No Matched Nodes` result means either the source produced no nodes or the job filter does not match the names and attributes that Rundeck produced.

## Validate Ansible Before Configuring Rundeck

The inventory and `ansible.cfg` must be available in the execution environment where the Node Source runs. On a conventional installation, test them as the `rundeck` operating-system user:

```bash
sudo -u rundeck ansible-inventory \
  -i /etc/ansible/production/hosts.yml \
  --list

sudo -u rundeck ansible-inventory \
  -i /etc/ansible/production/hosts.yml \
  --graph
```

This catches file permissions, missing inventory plugins, Python dependencies, Vault prompts, and relative-path assumptions before Rundeck is involved. A static YAML inventory might look like:

```yaml
all:
  children:
    web:
      hosts:
        web01:
          ansible_host: 10.20.0.11
        web02:
          ansible_host: 10.20.0.12
      vars:
        ansible_user: deploy
```

Ansible's inventory host name (`web01`) is normally the useful Rundeck node name; `ansible_host` is the address used to connect. Do not assume a job filter for the IP address will match the node name.

## Add the Ansible Resource Model Source

In the project, open **Project Settings > Edit Nodes > Sources**, select **Add a new Node Source**, and choose **Ansible Resource Model Source**. Set:

- **Ansible inventory file path** to the absolute inventory path.
- **Ansible config file path** to the intended `ansible.cfg`.
- Any plugin-specific executable or Python settings required by the installation.
- The SSH user and authentication settings appropriate for node execution.

Save the source and refresh the Nodes page. The official integration guide also documents configuring **Ansible Ad-hoc Node Executor** as the project's default executor. That is a separate choice: importing nodes does not force you to execute through Ansible. You may import inventory through Ansible and still use Rundeck's SSH executor, provided the resulting node attributes contain suitable connection data.

If **Gather Facts** is disabled, the integration can read inventory as YAML without contacting every host, which is faster and avoids turning a node-discovery operation into a connectivity test. Choose fact gathering only when you need attributes that require it.

## Find Where the Nodes Disappeared

Work down the pipeline instead of editing the job repeatedly.

### 1. Does Ansible Return Hosts?

Run `ansible-inventory --list` with the same inventory and configuration, as the same OS user. For a dynamic inventory source, confirm required environment variables and credential files are available to the Rundeck service. Service processes do not inherit your interactive shell's environment.

### 2. Does Rundeck Show the Hosts?

Open **Nodes**, choose the filter that lists all nodes, and force a refresh. If only the local Rundeck server appears, inspect `rundeck.log` for the Resource Model Source exception. Common causes are:

- The inventory path exists on the host but not inside the container or Runner.
- The `rundeck` user cannot read a parent directory, inventory, variable file, or `ansible.cfg`.
- A dynamic inventory plugin or collection is installed for your account but not for the service runtime.
- Inventory output is invalid or exceeds configured YAML data/alias limits.
- Multiple Node Sources define the same node name, and a later source overrides attributes from an earlier one.

Rundeck's documented defaults for the Ansible integration include a 10 MB YAML data limit and 1,000 aliases. Large inventories are easier to operate when segmented into smaller sources rather than simply raising every limit.

### 3. What Name and Attributes Did Rundeck Import?

Click a node and record its exact node name, hostname, username, tags, and custom attributes. Test the simplest filter first:

```text
name: web01
```

Then test the intended group or tag expression. Rundeck filters use Rundeck attributes, not Ansible pattern syntax. For example:

```text
tags: web+production
hostname: 10\.20\.0\..*
```

`tags: web+production` means both tags are required. A comma is OR, while separate attribute clauses are combined. If Ansible group names were not mapped to tags by the plugin configuration, `tags: web` cannot match even though `ansible web --list-hosts` works.

### 4. Is the Job Using a Dynamic Filter?

A saved job filter containing `${option.target}` can legitimately show no preview match because the option has no runtime value yet. Run the job with a known value and inspect the resolved filter. The **Editable node filter** setting governs interactive editing and browser-link `nodeFilter` input; the run-job API separately documents a top-level `filter` override. Treat API callers as able to request an override, and rely on narrow node ACLs rather than the UI checkbox as the authorization boundary.

## Make Inventory Mapping Predictable

Choose and document a stable contract between the two tools:

- Ansible inventory hostname becomes the Rundeck node name.
- `ansible_host` becomes `hostname`.
- `ansible_user` becomes `username`.
- Selected groups or host variables become Rundeck tags/custom attributes.
- Secrets remain in Key Storage or Ansible's supported secret mechanism, not in ordinary node attributes.

Avoid whitespace in Rundeck node names when the inventory may be generated back into Ansible; Ansible treats whitespace as a separator. Prefer `web-prod-01` over `web prod 01`.

Create a diagnostic job that targets a single imported node and runs `id` or `hostname`. A successful import only proves discovery; executor credentials, network access, and sudo are independent layers.

## Refresh Safely

Rundeck caches project node data, with a documented default cache delay of 30 seconds. Use the Nodes page refresh control after changing inventory. For workflows that mutate inventory and then delegate work, the built-in **Refresh Project Nodes** workflow step makes refreshed nodes available to subsequent Job Reference steps, not to node dispatch already selected for the current workflow. Do not build new automation around the old `/project/PROJECT/resources/refresh` API: it was deprecated without a replacement and removed in API v21.

## Conclusion

The reliable approach is to validate inventory as the Rundeck service identity, confirm nodes in the Rundeck Nodes page, inspect their actual attributes, and only then build the job filter. `No Matched Nodes` is usually a precise signal: either discovery returned nothing, or the filter was written for Ansible's view of the host instead of Rundeck's imported model.

## Official Documentation

- [Rundeck: Integrate with Ansible](https://docs.rundeck.com/docs/learning/howto/using-ansible.html)
- [Rundeck Node Sources overview](https://docs.rundeck.com/docs/manual/projects/resource-model-sources/)
- [Rundeck Node Filter syntax](https://docs.rundeck.com/docs/manual/11-node-filters.html)
- [Rundeck API version history: removal of resource refresh](https://docs.rundeck.com/docs/api/rundeck-api-versions.html)
- [Ansible inventory guide](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html)
