# Validation Summary: How to Use Ansible netconf_get Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.netcommon.netconf_get
- NETCONF
- YANG
- Junos XML/NETCONF concepts
- Cisco IOS-XE NETCONF/YANG

## Sources Consulted
- Ansible netconf_get module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/netconf_get_module.html
- Ansible parse_xml filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/parse_xml_filter.html
- RFC 6241, Network Configuration Protocol (NETCONF): https://www.rfc-editor.org/rfc/rfc6241
- Juniper Networks, Request Operational Information Using NETCONF: https://www.juniper.net/documentation/us/en/software/junos/netconf/topics/task/netconf-requesting-operational-information.html
- Juniper Networks, Map Junos OS Commands and Command Output to Junos XML Tag Elements: https://www.juniper.net/documentation/us/en/software/junos/netconf/junos-xml-protocol/topics/task/junos-xml-protocol-rpcs-and-xml-mapping.html
- Cisco IOS XE NETCONF programmability documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/prog/configuration/1715/b_1715_programmability_cg/netconf_protocol.html

## Issues Found
- The post said both configuration and operational state retrieval were controlled through the `source` parameter. Updated this to explain that `source` selects a configuration datastore (`running`, `candidate`, or `startup`), and omitting `source` uses NETCONF `<get>` to retrieve running configuration plus state.
- The source-parameter diagram omitted the supported `startup` datastore and implied the omitted-source behavior was another source value. Updated the diagram to include `startup` and show omitted `source` separately.
- The operational-state examples used Junos response tags such as `<interface-information>`, `<route-information>`, and `<system-information>` as `netconf_get` subtree filters. Juniper documents those as responses to vendor RPC request tags such as `<get-interface-information>`, not as generic NETCONF datastore filters. Replaced them with YANG datastore filters for `ietf-interfaces`, `ietf-netconf-monitoring`, and `ietf-system`.
- The XML parsing example used the deprecated `ansible.netcommon.parse_xml` filter and described it as using `xmltodict`. Replaced it with `display: native`, which Ansible documents as returning dictionary output using `xmltodict`.
- The IOS-XE section said all filters used Cisco-specific namespaces, but one example used the standard IETF `ietf-interfaces` namespace. Updated the wording to say Cisco-specific and standard YANG namespaces.

## Review Notes
- YAML syntax for all eight code blocks was checked with PyYAML.
- Device support for individual YANG models can vary by vendor, platform, and software release, so the examples remain model-dependent even though the Ansible module syntax and NETCONF/YANG usage are correct.
