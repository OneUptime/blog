# Validation Summary: How to Automate IPv6 Provisioning in Data Centers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and router advertisements
- Ansible with the `arista.eos` collection
- Arista EOS switch configuration
- Terraform with the AWS provider
- AWS VPC and subnet IPv6 provisioning
- phpIPAM REST API
- GitLab CI/CD

## Sources Consulted
- Ansible `arista.eos.eos_l3_interfaces` module docs: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_l3_interfaces_module.html
- Ansible EOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_eos.html
- Ansible check and diff mode docs: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Arista EOS IPv6 command reference: https://www.arista.com/en/um-eos/eos-ipv6
- Terraform `cidrsubnet` function docs: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform AWS provider `aws_vpc` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- AWS subnet IPv6 CIDR docs: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-associate-ipv6-cidr.html
- phpIPAM API documentation: https://www.phpipam.net/api-documentation/
- phpIPAM API cURL examples: https://phpipam.net/api/api_curl_example/
- GitLab CI `rules` docs: https://docs.gitlab.com/ci/jobs/job_rules/
- RFC 3849 documentation prefix: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The original Ansible examples used invalid IPv6 literals such as `2001:db8:rack` and `2001:db8:mgmt::...`. I replaced them with valid addresses under the `2001:db8::/32` documentation prefix and kept the same address-plan intent.
- The inventory snippet omitted the connection settings required for Arista EOS network modules. I added `ansible_connection: ansible.netcommon.network_cli` and `ansible_network_os: arista.eos.eos` so the playbook matches the Ansible platform guidance.
- The EOS router-advertisement command was written as `ipv6 nd ra-interval 30`, which does not match Arista's documented syntax. I corrected it to `ipv6 nd ra interval 30`.
- The explicit `ipv6 nd prefix` command lacked the lifetime argument required by the Arista command reference. I added a valid lifetime value so the configuration is syntactically correct.
- The phpIPAM example used a GET request to discover a free child prefix and then a generic POST to `/subnets/`, which omitted required creation context. I changed it to the documented `POST /subnets/{id}/first_subnet/{mask}/` flow, followed by `PATCH /subnets/{id}/` to set the rack description and `GET /subnets/{id}/` to read back the allocated prefix.
- The phpIPAM example used HTTP with a token-based workflow. I switched it to HTTPS to align with phpIPAM's API guidance for token-authenticated requests.
- The GitLab CI example used deprecated `only` syntax and also overrode `rack_id` globally, which conflicted with the per-host inventory values used by the playbook. I updated it to `rules` and removed the incorrect override.

## Review Notes
- The Terraform example is technically correct for a dual-stack AWS VPC that uses an Amazon-provided `/56` IPv6 block; `cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 1)` correctly derives a `/64` subnet.
- The Ansible example assumes switch authentication and any required privilege escalation are handled by the surrounding automation environment.
