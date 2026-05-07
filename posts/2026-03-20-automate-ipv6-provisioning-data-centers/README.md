# How to Automate IPv6 Provisioning in Data Centers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Automation, Ansible, Terraform, Provisioning, Data Center

Description: Automate IPv6 address provisioning and configuration in data centers using Ansible, Terraform, and IPAM APIs.

## Why Automate IPv6 Provisioning?

Manual IPv6 address management in large data centers leads to address conflicts, documentation gaps, and slow provisioning. Automation ensures consistent, error-free configuration across thousands of devices.

## Ansible for Switch Configuration

Use Ansible to push IPv6 configurations to network switches. The following playbook configures IPv6 on Arista EOS switches:

```yaml
# playbooks/configure_ipv6_tor.yml

---
- name: Configure IPv6 on ToR Switches
  hosts: tor_switches
  gather_facts: false

  vars:
    rack_prefix_base: "2001:db8:100:"

  tasks:
    - name: Configure server VLAN IPv6 interface
      arista.eos.eos_l3_interfaces:
        config:
          - name: "Vlan100"
            ipv6:
              - address: "{{ rack_prefix_base }}{{ rack_id }}::1/64"
        state: merged

    - name: Enable IPv6 RA on VLAN interface
      arista.eos.eos_config:
        lines:
          - "ipv6 nd ra interval 30"
          - "ipv6 nd prefix {{ rack_prefix_base }}{{ rack_id }}::/64 2592000"
        parents: "interface Vlan100"
```

```yaml
# inventory/hosts.yml
tor_switches:
  vars:
    ansible_connection: ansible.netcommon.network_cli
    ansible_network_os: arista.eos.eos
  hosts:
    tor-rack1:
      ansible_host: 2001:db8:100::11
      rack_id: "1"
    tor-rack2:
      ansible_host: 2001:db8:100::12
      rack_id: "2"
```

## Terraform for Cloud/VM IPv6 Assignment

Terraform can provision IPv6 subnets in cloud environments:

```hcl
# main.tf - AWS IPv6 VPC and subnet
resource "aws_vpc" "main" {
  cidr_block                       = "10.0.0.0/16"
  assign_generated_ipv6_cidr_block = true
}

resource "aws_subnet" "app" {
  vpc_id                          = aws_vpc.main.id
  cidr_block                      = "10.0.1.0/24"
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 1)
  assign_ipv6_address_on_creation = true
  availability_zone               = "us-east-1a"
}
```

## IPAM Integration with phpIPAM API

Automate prefix allocation by integrating with phpIPAM:

```python
import requests

IPAM_URL = "https://[2001:db8:100::100]/api/myapp"
TOKEN = "your-api-token"
RACK_POOL_SUBNET_ID = 2

def allocate_rack_prefix(rack_id: int) -> str:
    """Allocate the next available /56 from the rack pool."""
    headers = {"token": TOKEN, "Content-Type": "application/json"}

    # Create the first available /56 as a child subnet of the rack pool
    response = requests.post(
        f"{IPAM_URL}/subnets/{RACK_POOL_SUBNET_ID}/first_subnet/56/",
        headers=headers
    )
    response.raise_for_status()
    subnet_id = response.json()["id"]

    # Update the new child subnet with a rack-specific description
    requests.patch(
        f"{IPAM_URL}/subnets/{subnet_id}/",
        json={"description": f"Rack-{rack_id}"},
        headers=headers
    ).raise_for_status()

    subnet = requests.get(
        f"{IPAM_URL}/subnets/{subnet_id}/",
        headers=headers
    )
    subnet.raise_for_status()
    prefix = subnet.json()["data"]
    return f'{prefix["subnet"]}/{prefix["mask"]}'

# Allocate a prefix for rack 42
rack_prefix = allocate_rack_prefix(42)
print(f"Rack 42 allocated: {rack_prefix}")
```

## CI/CD Pipeline for Network Config

Integrate network configuration into a CI/CD pipeline:

```yaml
# .gitlab-ci.yml
network-provision:
  stage: deploy
  script:
    - ansible-playbook -i inventory/hosts.yml playbooks/configure_ipv6_tor.yml
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
  environment:
    name: production
```

## Idempotency Checks

Always validate that your automation is idempotent - running it twice should not cause errors or duplicate entries. Use Ansible's `--check` mode before applying:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/configure_ipv6_tor.yml --check --diff
```

## Conclusion

Automating IPv6 provisioning with Ansible for switches, Terraform for cloud resources, and IPAM API integration ensures consistent, auditable configurations. CI/CD pipelines bring infrastructure-as-code discipline to network operations, reducing human error in large data center deployments.
