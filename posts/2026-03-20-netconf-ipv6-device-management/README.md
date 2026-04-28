# How to Use NETCONF for IPv6 Device Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NETCONF, IPv6, Network Automation, Ncclient, Python, RFC 6241, SSH

Description: Use NETCONF (RFC 6241) with Python ncclient to manage IPv6 configurations on network devices, including get-config, edit-config, and commit operations.

## Introduction

NETCONF is an IETF standard (RFC 6241) for network device management over SSH. It provides transactional configuration management with candidate/running datastores and rollback capabilities. ncclient is the Python library for NETCONF.

## Installation

```bash
pip install ncclient xmltodict
```

## Step 1: Connect to Device via NETCONF over IPv6

```python
from ncclient import manager

# Connect to a device using its IPv6 management address

def netconf_connect(host: str):
    """Open a NETCONF session to a device."""
    return manager.connect(
        host=host,                    # IPv6 address: "2001:db8::1"
        port=830,                     # NETCONF port
        username="admin",
        password="secret",
        hostkey_verify=False,
        device_params={"name": "iosxr"},  # Vendor hint
        timeout=30,
    )

# Check server capabilities
with netconf_connect("2001:db8::1") as conn:
    for cap in conn.server_capabilities:
        if "ipv6" in cap.lower() or "ip" in cap.lower():
            print(cap)
```

## Step 2: Get IPv6 Interface Configuration

```python
from ncclient import manager
import xmltodict

def get_ipv6_config(host: str) -> dict:
    """Retrieve IPv6 interface configuration via NETCONF."""
    filter_xml = """
    <filter type="subtree">
      <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
        <interface>
          <ipv6 xmlns="urn:ietf:params:xml:ns:yang:ietf-ip"/>
        </interface>
      </interfaces>
    </filter>
    """

    with manager.connect(
        host=host, port=830,
        username="admin", password="secret",
        hostkey_verify=False
    ) as conn:
        response = conn.get_config(source="running", filter=filter_xml)

    return xmltodict.parse(response.xml)

config = get_ipv6_config("2001:db8::1")
interfaces = (config.get("rpc-reply", {})
                    .get("data", {})
                    .get("interfaces", {})
                    .get("interface", []))
print(interfaces)
```

## Step 3: Configure IPv6 Address via edit-config

```python
def configure_ipv6(host: str, interface: str, ipv6_addr: str, prefix_len: int):
    """Add an IPv6 address using NETCONF edit-config."""
    config_payload = f"""
    <config xmlns:xc="urn:ietf:params:xml:ns:netconf:base:1.0">
      <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
        <interface>
          <name>{interface}</name>
          <ipv6 xmlns="urn:ietf:params:xml:ns:yang:ietf-ip">
            <enabled>true</enabled>
            <address>
              <ip>{ipv6_addr}</ip>
              <prefix-length>{prefix_len}</prefix-length>
            </address>
          </ipv6>
        </interface>
      </interfaces>
    </config>
    """

    with manager.connect(
        host=host, port=830,
        username="admin", password="secret",
        hostkey_verify=False
    ) as conn:
        # Edit candidate datastore
        conn.edit_config(target="candidate", config=config_payload)

        # Validate before commit
        conn.validate(source="candidate")

        # Commit
        conn.commit()
        print(f"Committed: {interface} {ipv6_addr}/{prefix_len}")
```

## Step 4: Delete an IPv6 Address

```python
def delete_ipv6_address(host: str, interface: str, ipv6_addr: str):
    """Remove an IPv6 address using NETCONF with nc:operation delete."""
    delete_payload = f"""
    <config xmlns:xc="urn:ietf:params:xml:ns:netconf:base:1.0">
      <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
        <interface>
          <name>{interface}</name>
          <ipv6 xmlns="urn:ietf:params:xml:ns:yang:ietf-ip">
            <address xc:operation="delete">
              <ip>{ipv6_addr}</ip>
            </address>
          </ipv6>
        </interface>
      </interfaces>
    </config>
    """

    with manager.connect(
        host=host, port=830,
        username="admin", password="secret",
        hostkey_verify=False
    ) as conn:
        conn.edit_config(target="candidate", config=delete_payload)
        conn.commit()
```

## Step 5: Rollback on Error

```python
def safe_configure_ipv6(host: str, interface: str,
                         ipv6_addr: str, prefix_len: int) -> bool:
    """Configure with automatic rollback on failure."""
    with manager.connect(
        host=host, port=830,
        username="admin", password="secret",
        hostkey_verify=False
    ) as conn:
        try:
            conn.edit_config(
                target="candidate",
                config=f"""
                <config>
                  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
                    <interface>
                      <name>{interface}</name>
                      <ipv6 xmlns="urn:ietf:params:xml:ns:yang:ietf-ip">
                        <address>
                          <ip>{ipv6_addr}</ip>
                          <prefix-length>{prefix_len}</prefix-length>
                        </address>
                      </ipv6>
                    </interface>
                  </interfaces>
                </config>
                """
            )
            conn.validate(source="candidate")
            conn.commit()
            return True
        except Exception as e:
            print(f"Error: {e} - discarding candidate")
            conn.discard_changes()
            return False
```

## Conclusion

NETCONF provides transactional IPv6 configuration with validation and rollback - critical for production network changes. Connect via IPv6 management addresses, use IETF YANG filters for structured retrieval, and always validate the candidate before commit. The `discard_changes()` operation prevents partial configurations from being applied. Monitor NETCONF operations with OneUptime to detect failed configuration pushes.
