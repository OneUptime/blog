# Validation Summary: How to Use YANG Models for IPv6 Configuration

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- YANG (RFC 7950) data modeling language
- IETF YANG models: ietf-interfaces (RFC 8343), ietf-ip (RFC 8344)
- OpenConfig YANG models: openconfig-interfaces, openconfig-if-ip
- NETCONF protocol (over SSH, port 830)
- Python `ncclient` library
- Python `xmltodict` library
- `pyang` CLI for YANG module validation
- `yanglint` (libyang) for instance-data validation
- Python `yangson` library for YANG-aware data validation
- IPv6 addressing

## Sources Consulted
- RFC 7950 – YANG 1.1 (https://datatracker.ietf.org/doc/html/rfc7950)
- RFC 8343 – A YANG Data Model for Interface Management (https://datatracker.ietf.org/doc/html/rfc8343)
- RFC 8344 – A YANG Data Model for IP Management (https://datatracker.ietf.org/doc/html/rfc8344)
- yangson documentation and quickstart (https://yangson.labs.nic.cz/quickstart.html)
- pyang manual and InstanceValidation wiki (https://github.com/mbj4668/pyang/wiki/InstanceValidation)
- openconfig-interfaces.yang and openconfig-if-ip.yang (https://github.com/openconfig/public)
- ncclient documentation (https://ncclient.readthedocs.io/)

## Issues Found
1. **Incorrect `yangson.DataModel.from_file` usage.** The second argument was given as a list of YANG module names (`["ietf-interfaces", "ietf-ip"]`), but the API expects a list of directory paths where YANG modules are located. Fixed to `["./yang-modules/ietf"]` with a clarifying comment.
2. **Incorrect `inst.validate(dm.schema)` call.** The yangson `InstanceNode.validate()` method does not take the schema as an argument — the schema is already bound to the instance. It accepts optional `scope` (ValidationScope) and `ctype` (ContentType). Fixed to `inst.validate(ctype=ContentType.config)` and added the required import.
3. **Incorrect `pyang -f validate` command.** `validate` is not a valid pyang output format; pyang does not perform XML instance-data validation. Replaced with `yanglint` (from libyang), which is the standard tool for validating instance documents against YANG models.

## Review Notes
- NETCONF namespaces for IETF (`urn:ietf:params:xml:ns:yang:ietf-interfaces`, `urn:ietf:params:xml:ns:yang:ietf-ip`) and OpenConfig (`http://openconfig.net/yang/interfaces`, `http://openconfig.net/yang/interfaces/ip`) are all verified correct.
- The `ncclient.manager.connect(..., hostkey_verify=False)` usage is correct but not recommended for production — readers should enable host-key verification in real deployments.
- The OpenConfig XML payload structure (subinterfaces → subinterface → ipv6 → addresses → address → config) is accurate per openconfig-if-ip.yang.
- The ietf-ip tree diagram is simplified but structurally correct for a conceptual overview.
