# How to Manage Azure DNS Zones and Record Sets with Ansible Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, DNS, Ansible, Infrastructure as Code, Automation, DevOps, Cloud Networking

Description: Learn how to manage Azure DNS zones and record sets using Ansible playbooks for repeatable, version-controlled DNS infrastructure.

---

DNS management is one of those things that starts out simple and slowly becomes a nightmare. You add a few records here, delegate a subdomain there, and before long nobody on the team remembers why that CNAME exists or who created it. Managing Azure DNS through the portal is fine when you have five records, but once you hit production scale, you need something repeatable and auditable.

Ansible is a natural fit for this. It is agentless, works well with Azure through the `azure.azcollection` modules, and lets you describe your DNS zones and records as YAML files you can commit to version control. This post walks through setting up Ansible to manage Azure DNS zones and record sets from scratch.

## Prerequisites

You need a few things in place before diving in. First, make sure you have Ansible installed along with the Azure collection. You also need Azure credentials configured, either through a service principal or managed identity.

Install the Azure Ansible collection if you have not already.

```bash
# Install the Azure collection from Ansible Galaxy
ansible-galaxy collection install azure.azcollection

# Install the required Python dependencies for Azure modules
pip install -r ~/.ansible/collections/ansible_collections/azure/azcollection/requirements.txt
```

For authentication, the simplest approach during development is to export your service principal credentials as environment variables.

```bash
# Set Azure credentials as environment variables
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_SECRET="your-client-secret"
export AZURE_TENANT="your-tenant-id"
```

## Creating a DNS Zone

The first step is creating the DNS zone itself. This is the container that holds all your DNS records for a given domain. Here is a playbook that creates both a resource group and a public DNS zone.

```yaml
# playbook-dns-zone.yml
# Creates a resource group and an Azure DNS zone for the specified domain
---
- name: Manage Azure DNS Zones
  hosts: localhost
  connection: local
  vars:
    resource_group: rg-dns-production
    location: eastus
    zone_name: example.com

  tasks:
    # Ensure the resource group exists before creating DNS resources
    - name: Create resource group
      azure.azcollection.azure_rm_resourcegroup:
        name: "{{ resource_group }}"
        location: "{{ location }}"
        tags:
          environment: production
          managed_by: ansible

    # Create the public DNS zone
    - name: Create DNS zone
      azure.azcollection.azure_rm_dnszone:
        resource_group: "{{ resource_group }}"
        name: "{{ zone_name }}"
        type: public
        tags:
          environment: production
      register: dns_zone_result

    # Print the name servers so we know what to configure at the registrar
    - name: Display name servers
      ansible.builtin.debug:
        msg: "Name servers: {{ dns_zone_result.name_servers }}"
```

After running this playbook, Azure assigns name servers to your zone. You will need to update your domain registrar to point to these name servers for the delegation to work.

## Managing Record Sets

Now that the zone exists, you can start adding records. Ansible provides the `azure_rm_dnsrecordset` module for this purpose. Let us create a playbook that manages several common record types.

```yaml
# playbook-dns-records.yml
# Manages A, CNAME, MX, and TXT records for the DNS zone
---
- name: Manage Azure DNS Record Sets
  hosts: localhost
  connection: local
  vars:
    resource_group: rg-dns-production
    zone_name: example.com

    # Define all DNS records in a structured variable
    a_records:
      - name: "@"
        ttl: 300
        records:
          - entry: "20.50.100.10"
          - entry: "20.50.100.11"
      - name: "api"
        ttl: 300
        records:
          - entry: "20.50.100.20"

    cname_records:
      - name: "www"
        ttl: 3600
        record: "example.com"
      - name: "status"
        ttl: 3600
        record: "status.oneuptime.com"

    mx_records:
      - name: "@"
        ttl: 3600
        records:
          - preference: 10
            exchange: "mail1.example.com"
          - preference: 20
            exchange: "mail2.example.com"

    txt_records:
      - name: "@"
        ttl: 3600
        records:
          - entry: "v=spf1 include:_spf.google.com ~all"

  tasks:
    # Loop through A records and create each one
    - name: Create A records
      azure.azcollection.azure_rm_dnsrecordset:
        resource_group: "{{ resource_group }}"
        zone_name: "{{ zone_name }}"
        relative_name: "{{ item.name }}"
        record_type: A
        time_to_live: "{{ item.ttl }}"
        records: "{{ item.records }}"
      loop: "{{ a_records }}"
      loop_control:
        label: "{{ item.name }}"

    # Loop through CNAME records
    - name: Create CNAME records
      azure.azcollection.azure_rm_dnsrecordset:
        resource_group: "{{ resource_group }}"
        zone_name: "{{ zone_name }}"
        relative_name: "{{ item.name }}"
        record_type: CNAME
        time_to_live: "{{ item.ttl }}"
        records:
          - entry: "{{ item.record }}"
      loop: "{{ cname_records }}"
      loop_control:
        label: "{{ item.name }}"

    # Create MX records for email routing
    - name: Create MX records
      azure.azcollection.azure_rm_dnsrecordset:
        resource_group: "{{ resource_group }}"
        zone_name: "{{ zone_name }}"
        relative_name: "{{ item.name }}"
        record_type: MX
        time_to_live: "{{ item.ttl }}"
        records: "{{ item.records }}"
      loop: "{{ mx_records }}"
      loop_control:
        label: "{{ item.name }}"

    # Create TXT records for SPF, DKIM, verification, etc.
    - name: Create TXT records
      azure.azcollection.azure_rm_dnsrecordset:
        resource_group: "{{ resource_group }}"
        zone_name: "{{ zone_name }}"
        relative_name: "{{ item.name }}"
        record_type: TXT
        time_to_live: "{{ item.ttl }}"
        records: "{{ item.records }}"
      loop: "{{ txt_records }}"
      loop_control:
        label: "{{ item.name }}"
```

## Using Variables Files for Multiple Environments

In real-world setups, you likely have different DNS records for staging and production. Ansible variables files make this clean. Create separate variable files for each environment and pass them in at runtime.

```yaml
# vars/production.yml
# DNS records specific to the production environment
resource_group: rg-dns-production
zone_name: example.com
a_records:
  - name: "api"
    ttl: 300
    records:
      - entry: "20.50.100.20"
```

```yaml
# vars/staging.yml
# DNS records specific to the staging environment
resource_group: rg-dns-staging
zone_name: staging.example.com
a_records:
  - name: "api"
    ttl: 60
    records:
      - entry: "10.0.1.50"
```

Then run the playbook with the appropriate vars file.

```bash
# Deploy production DNS records
ansible-playbook playbook-dns-records.yml -e @vars/production.yml

# Deploy staging DNS records
ansible-playbook playbook-dns-records.yml -e @vars/staging.yml
```

## Managing Private DNS Zones

If you are running services inside a virtual network and need internal DNS resolution, Azure Private DNS Zones are the way to go. The module supports this with a `type` parameter.

```yaml
# Create a private DNS zone and link it to a VNet
- name: Create private DNS zone
  azure.azcollection.azure_rm_dnszone:
    resource_group: "{{ resource_group }}"
    name: "internal.example.com"
    type: private

- name: Link private zone to VNet
  azure.azcollection.azure_rm_privatednszonelink:
    resource_group: "{{ resource_group }}"
    zone_name: "internal.example.com"
    name: "vnet-link-production"
    virtual_network:
      name: "vnet-production"
      resource_group: "{{ resource_group }}"
    registration_enabled: true
```

Setting `registration_enabled` to `true` means that VMs in the linked VNet will automatically register their DNS records in the private zone. This is extremely useful for service discovery without an external tool.

## Handling Record Deletion

Ansible's declarative approach handles creation and updates well, but deleting records requires explicit state management. If you want to remove a record that is no longer needed, set the state to absent.

```yaml
# Remove a DNS record that is no longer needed
- name: Remove old staging CNAME
  azure.azcollection.azure_rm_dnsrecordset:
    resource_group: "{{ resource_group }}"
    zone_name: "{{ zone_name }}"
    relative_name: "old-staging"
    record_type: CNAME
    state: absent
```

A good practice is to maintain a separate list of records to delete and include that in your playbook so nothing is lost in translation.

## Adding Idempotency Checks

One advantage of Ansible is idempotency - running the playbook multiple times produces the same result. But it helps to add some verification tasks at the end.

```yaml
# Verify that critical DNS records exist after deployment
- name: Gather DNS zone facts
  azure.azcollection.azure_rm_dnszone_info:
    resource_group: "{{ resource_group }}"
    name: "{{ zone_name }}"
  register: zone_info

- name: Gather record set facts
  azure.azcollection.azure_rm_dnsrecordset_info:
    resource_group: "{{ resource_group }}"
    zone_name: "{{ zone_name }}"
  register: all_records

- name: Show total record count
  ansible.builtin.debug:
    msg: "Total record sets in zone: {{ all_records.dnsrecordsets | length }}"
```

## Best Practices

There are a few things I have learned the hard way managing DNS with Ansible.

First, always set explicit TTL values. The default TTL might be fine for development, but production records should have intentional TTLs. Lower TTLs for records that change frequently (like during a migration), higher TTLs for stable records.

Second, use Ansible Vault for any sensitive data. If your DNS records include things like DKIM keys or verification tokens, encrypt those values.

Third, keep your DNS playbooks in a separate repository or at least a separate directory from your application code. DNS changes have different risk profiles and review requirements.

Fourth, run your playbooks in check mode first before applying changes. The `--check` flag shows you what would change without actually modifying anything.

```bash
# Dry run to see what would change
ansible-playbook playbook-dns-records.yml -e @vars/production.yml --check --diff
```

Fifth, tag your DNS resources consistently. This makes it easier to track costs and ownership when you have multiple zones and hundreds of records.

## Wrapping Up

Managing Azure DNS with Ansible playbooks gives you version-controlled, repeatable DNS infrastructure. You get a clear audit trail of every change, the ability to review DNS modifications through pull requests, and consistent environments across staging and production. The combination of Ansible's idempotent modules with Azure's DNS service provides a solid foundation for teams that want to treat DNS as proper infrastructure rather than a set of manual portal clicks. Start with your simplest zone and build up from there.
