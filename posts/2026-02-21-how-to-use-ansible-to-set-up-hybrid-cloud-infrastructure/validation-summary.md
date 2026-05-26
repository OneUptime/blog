# Validation Summary: How to Use Ansible to Set Up Hybrid Cloud Infrastructure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible configuration and playbooks
- Ansible static YAML inventory and group variables
- Ansible SSH connection settings and bastion ProxyJump usage
- Ansible built-in modules: apt, template, copy, service, get_url, unarchive, command, debug
- Amazon AWS Ansible collection modules: ec2_vpc_vgw, ec2_vpc_vpn, ec2_instance, route53
- Community AWS Ansible collection module: ec2_customer_gateway
- AWS Site-to-Site VPN and Direct Connect
- Azure ExpressRoute
- StrongSwan IPsec
- Consul service discovery
- rsyslog, NTP, Prometheus Node Exporter, PostgreSQL health checks, DNS checks

## Sources Consulted
- Ansible inventory documentation: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible strategy and serial execution documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- amazon.aws.ec2_vpc_vgw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_vgw_module.html
- community.aws.ec2_customer_gateway module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/ec2_customer_gateway_module.html
- amazon.aws.ec2_vpc_vpn module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_vpn_module.html
- amazon.aws.ec2_instance module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- amazon.aws.route53 module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/route53_module.html
- AWS Direct Connect documentation: https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html
- AWS Direct Connect dedicated and hosted connections documentation: https://docs.aws.amazon.com/directconnect/latest/UserGuide/WorkingWithConnections.html
- AWS Site-to-Site VPN customer gateway options documentation: https://docs.aws.amazon.com/vpn/latest/s2svpn/cgw-options.html
- Azure ExpressRoute architecture documentation: https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/hybrid-networking/expressroute

## Issues Found
- The hybrid architecture diagram labeled the AWS private connectivity option as "ExpressRoute". Updated the AWS link to "VPN/Direct Connect" because ExpressRoute is Azure-specific and AWS uses Direct Connect for dedicated private connectivity.
- The `ansible.cfg` example was marked as a YAML code block. Changed the code fence to `ini` because Ansible configuration uses INI-style sections and keys.
- The customer gateway example used `amazon.aws.ec2_customer_gateway`, but the current documented module is `community.aws.ec2_customer_gateway`. Updated the module namespace.
- The VPN connection example used `type: ipsec.1` with `amazon.aws.ec2_vpc_vpn`. Updated it to `connection_type: ipsec.1`, matching the current module parameter.
- The base configuration example used injected top-level fact variables with `ansible_os_family`. Updated the conditionals to `ansible_facts['os_family']`, matching current Ansible facts documentation and avoiding dependence on injected fact variables.
- Several Debian package/service examples used `apt` or services installed by `apt` without matching OS guards on dependent tasks. Added Debian conditionals to the NTP configuration, node exporter tasks, and Consul tasks so the playbooks do not try to configure packages that were skipped on non-Debian hosts.
- The application deployment play tried to set `serial` from the host variable `location` at play level while targeting a mixed-location group. Replaced it with a fixed `"50%"` batch size because `serial` is a play-level batching directive, not a per-host setting.
- The application version default used `default('latest')`, which does not replace an empty string returned by the environment lookup. Updated it to `default('latest', true)`.
- The application configuration example generated AWS RDS and ElastiCache hostnames for every cloud location, including Azure. Replaced the inline conditional with per-location database and cache host maps.
- The health-check play referenced `db_host` without defining it. Added the same per-location database host map and task-local `db_host` variable.

## Review Notes
- The examples are illustrative and still require real inventory entries, cloud credentials, package repositories, VPN templates, and service-specific configuration files before they can be run in production.
- `host_key_checking = False` is technically valid Ansible configuration, but it is not a recommended security setting for production.
- Ansible was not installed in the local environment, so I could not run `ansible-playbook --syntax-check`; review was performed against official documentation and by inspecting the snippets directly.
