# How to Configure Ansible AWX/Tower with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWX, Ansible Tower, IPv6, Automation Platform, Networking

Description: A guide to configuring Ansible AWX and Ansible Automation Platform (Tower) to manage IPv6 hosts, including inventory configuration and credential setup.

Ansible AWX (one of the upstream projects for Red Hat Ansible Automation Platform) and Automation Controller can manage IPv6 hosts just like IPv4 hosts, with a few configuration considerations around inventory formats, SSH settings, and network connectivity.

## Step 1: Configure AWX to Reach IPv6 Hosts

The AWX execution plane must have IPv6 connectivity to reach managed IPv6 hosts. On a Kubernetes-deployed AWX, verify the task or execution pods have IPv6 addresses and can route to your managed networks:

```bash
# Check if AWX pods have IPv6 addresses

kubectl get pods -n awx -o wide
kubectl exec -n awx <awx-task-pod> -- ip -6 addr show
```

If the cluster is dual-stack, IPv6 reachability still depends on your CNI plugin, node addressing, and IPv6 egress/routing.

## Step 2: Add IPv6 Hosts to AWX Inventory

Via the AWX API or UI, create an inventory and add hosts with IPv6 addresses:

```bash
AWX_URL=https://awx.example.com
ORGANIZATION_ID=1

# AWX API: Create an inventory
INVENTORY_ID=$(
  curl -s -X POST "$AWX_URL/api/v2/inventories/" \
    -H "Authorization: Bearer $AWX_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg name "IPv6 Production Fleet" \
      --arg description "All IPv6-enabled production hosts" \
      --argjson organization "$ORGANIZATION_ID" \
      '{name: $name, description: $description, organization: $organization}')" \
  | jq -r '.id'
)

# Add a host with an IPv6 address
curl -s -X POST "$AWX_URL/api/v2/hosts/" \
  -H "Authorization: Bearer $AWX_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg name "web-01" \
    --argjson inventory "$INVENTORY_ID" \
    --arg variables $'ansible_host: "2001:db8::10"\nansible_ssh_common_args: "-6"' \
    '{name: $name, inventory: $inventory, variables: $variables}')"
```

## Step 3: Configure SSH Credentials for IPv6

AWX SSH credentials work the same for IPv6 as IPv4. Create a Machine credential with your SSH private key:

```bash
# Look up the built-in Machine credential type
MACHINE_CRED_TYPE_ID=$(
  curl -s "$AWX_URL/api/v2/credential_types/?search=Machine" \
    -H "Authorization: Bearer $AWX_TOKEN" \
  | jq -r '.results[] | select(.kind == "ssh") | .id'
)

# Create an SSH machine credential via API
CREDENTIAL_ID=$(
  curl -s -X POST "$AWX_URL/api/v2/credentials/" \
    -H "Authorization: Bearer $AWX_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg name "IPv6 Production SSH Key" \
      --argjson credential_type "$MACHINE_CRED_TYPE_ID" \
      --argjson organization "$ORGANIZATION_ID" \
      --arg username "ubuntu" \
      --arg ssh_key_data "$(cat ~/.ssh/id_ed25519)" \
      '{
        name: $name,
        credential_type: $credential_type,
        organization: $organization,
        inputs: {
          username: $username,
          ssh_key_data: $ssh_key_data
        }
      }')" \
  | jq -r '.id'
)
```

## Step 4: Configure Job Template with IPv6-Specific Settings

If you want to force the SSH client to prefer IPv6, set the SSH common args on the Job Template:

```bash
PROJECT_ID=1

# Create a Job Template with IPv6 SSH args
JOB_TEMPLATE_ID=$(
  curl -s -X POST "$AWX_URL/api/v2/job_templates/" \
    -H "Authorization: Bearer $AWX_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg name "Deploy to IPv6 Fleet" \
      --argjson inventory "$INVENTORY_ID" \
      --argjson project "$PROJECT_ID" \
      --arg playbook "deploy.yml" \
      --arg extra_vars $'ansible_ssh_common_args: "-6"' \
      '{
        name: $name,
        job_type: "run",
        inventory: $inventory,
        project: $project,
        playbook: $playbook,
        extra_vars: $extra_vars
      }')" \
  | jq -r '.id'
)

# Associate the Machine credential with the Job Template
curl -s -X POST "$AWX_URL/api/v2/job_templates/${JOB_TEMPLATE_ID}/credentials/" \
  -H "Authorization: Bearer $AWX_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --argjson id "$CREDENTIAL_ID" '{associate: true, id: $id}')"
```

## Step 5: AWX Instance Group with IPv6 Execution Node

For large IPv6 deployments, create an instance group in AWX and associate your IPv6-capable execution nodes with it. Then allow the Job Template to target that instance group at launch:

```bash
# Allow the Job Template to select an instance group at launch
curl -s -X PATCH "$AWX_URL/api/v2/job_templates/${JOB_TEMPLATE_ID}/" \
  -H "Authorization: Bearer $AWX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ask_instance_groups_on_launch": true}'
```

## Step 6: Dynamic IPv6 Inventory Script

Store a custom inventory script in source control and register it as a project-sourced inventory source. If you use a script, make sure it is executable in source control (`chmod +x`):

```bash
# Register the inventory script as a project-sourced inventory source
curl -s -X POST "$AWX_URL/api/v2/inventory_sources/" \
  -H "Authorization: Bearer $AWX_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg name "IPv6 CMDB Inventory" \
    --argjson inventory "$INVENTORY_ID" \
    --argjson source_project "$PROJECT_ID" \
    --arg source_path "inventory/dynamic-ipv6-inventory.py" \
    '{
      name: $name,
      inventory: $inventory,
      source: "scm",
      source_project: $source_project,
      source_path: $source_path,
      update_on_launch: true
    }')"
```

```python
#!/usr/bin/env python3
# dynamic-ipv6-inventory.py - Return IPv6 hosts for AWX
import json

def get_ipv6_hosts():
    # In practice, query your CMDB or cloud API
    return {
        "web_servers": {
            "hosts": ["web-01", "web-02"],
            "vars": {
                "ansible_ssh_common_args": "-6"
            }
        },
        "_meta": {
            "hostvars": {
                "web-01": {"ansible_host": "2001:db8::10"},
                "web-02": {"ansible_host": "2001:db8::11"}
            }
        }
    }

if __name__ == "__main__":
    print(json.dumps(get_ipv6_hosts(), indent=2))
```

## Step 7: Verify IPv6 Connectivity from AWX

```bash
# Launch an ad hoc ping test from the AWX API
curl -s -X POST "$AWX_URL/api/v2/ad_hoc_commands/" \
  -H "Authorization: Bearer $AWX_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --argjson inventory "$INVENTORY_ID" \
    --argjson credential "$CREDENTIAL_ID" \
    --arg module_name "ping" \
    --arg limit "web-01" \
    '{
      inventory: $inventory,
      credential: $credential,
      module_name: $module_name,
      limit: $limit
    }')"
```

AWX and Automation Controller manage IPv6 hosts effectively with proper inventory variable configuration and by ensuring the AWX execution plane itself has IPv6 network access to reach managed hosts.
