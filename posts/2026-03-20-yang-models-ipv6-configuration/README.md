# How to Use YANG Models for IPv6 Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YANG, IPv6, NETCONF, RESTCONF, Network Automation, OpenConfig, RFC 7950

Description: Use YANG data models to describe and validate IPv6 interface and routing configurations, leveraging OpenConfig and IETF models for vendor-agnostic automation.

## Introduction

YANG (RFC 7950) is a data modeling language for network configuration. YANG models define the structure and constraints of configuration data, enabling validation before deployment and vendor-agnostic automation via NETCONF and RESTCONF. OpenConfig provides standard IPv6 YANG models used by Cisco, Juniper, and Arista.

## Key IPv6 YANG Models

```text
ietf-interfaces (RFC 8343)
  └── interface
      └── ietf-ip (RFC 8344)
          └── ipv6
              ├── address
              │   ├── ip (IPv6Address)
              │   └── prefix-length
              ├── enabled (boolean)
              └── autoconf (SLAAC)

openconfig-interfaces
  └── interface
      └── subinterfaces
          └── subinterface
              └── openconfig-if-ip:ipv6
                  └── addresses
                      └── address
                          ├── ip
                          └── config
                              └── prefix-length
```

## Step 1: Read IPv6 Config via YANG (ncclient)

```python
# yang/get_ipv6_ietf.py

from ncclient import manager
import xmltodict
import json

IETF_INTERFACES_FILTER = """
<filter>
  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
    <interface>
      <ipv6 xmlns="urn:ietf:params:xml:ns:yang:ietf-ip"/>
    </interface>
  </interfaces>
</filter>
"""

def get_ipv6_addresses(host: str) -> list:
    """Get IPv6 addresses via NETCONF using IETF interfaces YANG model."""
    with manager.connect(
        host=host,
        port=830,
        username="admin",
        password="secret",
        hostkey_verify=False,
    ) as conn:
        response = conn.get_config(source="running", filter=IETF_INTERFACES_FILTER)

    data = xmltodict.parse(response.xml)
    interfaces = (
        data.get("rpc-reply", {})
            .get("data", {})
            .get("interfaces", {})
            .get("interface", [])
    )

    if isinstance(interfaces, dict):
        interfaces = [interfaces]

    result = []
    for iface in interfaces:
        name = iface.get("name")
        ipv6_data = iface.get("ipv6", {})
        addresses = ipv6_data.get("address", [])
        if isinstance(addresses, dict):
            addresses = [addresses]

        for addr in addresses:
            result.append({
                "interface": name,
                "address": addr.get("ip"),
                "prefix_length": addr.get("prefix-length"),
            })

    return result
```

## Step 2: Configure IPv6 via YANG (NETCONF edit-config)

```python
# yang/configure_ipv6.py
from ncclient import manager

def configure_ipv6_address(host: str, interface: str,
                             address: str, prefix_length: int):
    """Configure IPv6 address using IETF interfaces YANG model."""
    config_xml = f"""
    <config>
      <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
        <interface>
          <name>{interface}</name>
          <ipv6 xmlns="urn:ietf:params:xml:ns:yang:ietf-ip">
            <enabled>true</enabled>
            <address>
              <ip>{address}</ip>
              <prefix-length>{prefix_length}</prefix-length>
            </address>
          </ipv6>
        </interface>
      </interfaces>
    </config>
    """

    with manager.connect(
        host=host,
        port=830,
        username="admin",
        password="secret",
        hostkey_verify=False,
    ) as conn:
        response = conn.edit_config(
            target="candidate",
            config=config_xml
        )
        conn.commit()

    return response
```

## Step 3: OpenConfig YANG for IPv6

```python
# yang/openconfig_ipv6.py

OPENCONFIG_IPV6_CONFIG = """
<config>
  <interfaces xmlns="http://openconfig.net/yang/interfaces">
    <interface>
      <name>GigabitEthernet0/0/0/0</name>
      <subinterfaces>
        <subinterface>
          <index>0</index>
          <ipv6 xmlns="http://openconfig.net/yang/interfaces/ip">
            <addresses>
              <address>
                <ip>2001:db8::1</ip>
                <config>
                  <ip>2001:db8::1</ip>
                  <prefix-length>64</prefix-length>
                </config>
              </address>
            </addresses>
            <config>
              <enabled>true</enabled>
              <dhcp-client>false</dhcp-client>
            </config>
          </ipv6>
        </subinterface>
      </subinterfaces>
    </interface>
  </interfaces>
</config>
"""
```

## Step 4: YANG Validation with pyang

```bash
# Install pyang
pip install pyang

# Download IETF models
git clone https://github.com/YangModels/yang.git

# Validate a YANG model
pyang -f tree yang/ietf/ietf-ip.yang

# Validate a YANG instance document (XML) with yanglint from libyang
# (pyang itself validates YANG modules, not instance data)
yanglint -p yang/ietf/ yang/ietf/ietf-ip.yang my_ipv6_config.xml
```

## Step 5: YANG-Aware Automation with yangson

```python
# validate an IPv6 configuration document
from yangson import DataModel
from yangson.enumerations import ContentType
import json

# Load YANG data model. The second argument is a list of directories
# to search for YANG modules, not a list of module names.
dm = DataModel.from_file("yang-library.json", ["./yang-modules/ietf"])

# Validate a configuration document
ipv6_config = {
    "ietf-interfaces:interfaces": {
        "interface": [{
            "name": "GigabitEthernet0/0/0/0",
            "ietf-ip:ipv6": {
                "enabled": True,
                "address": [{
                    "ip": "2001:db8::1",
                    "prefix-length": 64
                }]
            }
        }]
    }
}

inst = dm.from_raw(ipv6_config)
inst.validate(ctype=ContentType.config)
print("Configuration is valid")
```

## Conclusion

YANG models provide a structured, validated approach to IPv6 configuration. Use `ietf-ip.yang` for standards-based IPv6 address management and OpenConfig for vendor-agnostic multi-vendor deployments. NETCONF `edit-config` with YANG payloads provides transactional configuration with commit/rollback. Monitor NETCONF session health with OneUptime to detect automation failures.
