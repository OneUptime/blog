# How to Use SNMP over IPv6 with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Python, SNMP, Network Monitoring, Pysnmp

Description: Poll network devices over IPv6 using SNMP with Python's PySNMP library, query IPv6-specific MIBs, and build IPv6 network monitoring tools.

## Install PySNMP

```bash
pip install pysnmp pysnmp-mibs
```

## SNMP GET over IPv6

```python
import asyncio
from pysnmp.hlapi.v3arch.asyncio import *

async def _snmp_get_ipv6(host: str, oid: str,
                         community: str = "public",
                         port: int = 161) -> str | None:
    """
    SNMP GET request to an IPv6 device.
    host: IPv6 address (without brackets)
    """
    snmp_engine = SnmpEngine()

    try:
        error_indication, error_status, error_index, var_binds = await get_cmd(
            snmp_engine,
            CommunityData(community, mpModel=1),   # mpModel=1 = SNMPv2c
            await Udp6TransportTarget.create(
                (host, port),
                timeout=5,
                retries=2,
            ),
            ContextData(),
            ObjectType(ObjectIdentity(oid)),
        )

        if error_indication:
            print(f"SNMP error: {error_indication}")
            return None
        if error_status:
            print(f"SNMP error status: {error_status.prettyPrint()}")
            return None

        for var_bind in var_binds:
            return str(var_bind[1])
    finally:
        snmp_engine.close_dispatcher()

def snmp_get_ipv6(host: str, oid: str,
                  community: str = "public",
                  port: int = 161) -> str | None:
    return asyncio.run(_snmp_get_ipv6(host, oid, community, port))

# Query sysDescr from an IPv6 device

host = "2001:db8::1"
result = snmp_get_ipv6(host, "1.3.6.1.2.1.1.1.0")
print(f"sysDescr: {result}")
```

## SNMP WALK over IPv6

```python
import asyncio
from pysnmp.hlapi.v3arch.asyncio import *

async def _snmp_walk_ipv6(host: str, oid: str,
                          community: str = "public",
                          port: int = 161) -> list[tuple[str, str]]:
    """SNMP WALK to enumerate a subtree from an IPv6 device."""
    snmp_engine = SnmpEngine()
    results = []

    try:
        transport = await Udp6TransportTarget.create(
            (host, port),
            timeout=5,
            retries=2,
        )

        async for error_indication, error_status, error_index, var_binds in walk_cmd(
            snmp_engine,
            CommunityData(community, mpModel=1),
            transport,
            ContextData(),
            ObjectType(ObjectIdentity(oid)),
            lexicographicMode=False,   # Stop at end of subtree
        ):
            if error_indication:
                print(f"SNMP error: {error_indication}")
                break
            if error_status:
                print(f"SNMP error status: {error_status.prettyPrint()}")
                break

            for var_bind in var_binds:
                oid_str = str(var_bind[0])
                val_str = str(var_bind[1])
                results.append((oid_str, val_str))

        return results
    finally:
        snmp_engine.close_dispatcher()

def snmp_walk_ipv6(host: str, oid: str,
                   community: str = "public",
                   port: int = 161) -> list[tuple[str, str]]:
    return asyncio.run(_snmp_walk_ipv6(host, oid, community, port))

# Walk interface table
host = "2001:db8::2"
ifaces = snmp_walk_ipv6(host, "1.3.6.1.2.1.2.2.1")  # ifTable
for oid, val in ifaces[:10]:
    print(f"  {oid}: {val}")
```

## Query IPv6-Specific MIBs

```python
# IPv6-related MIB OIDs (RFC 4293 IP-MIB + legacy RFC 2465 IPv6 MIB)
IPV6_MIBS = {
    # Legacy IPv6 MIB tables from RFC 2465 (obsoleted by RFC 4293)
    "ipv6IfDescr":           "1.3.6.1.2.1.55.1.5.1.2",
    "ipv6IfPhysicalAddress": "1.3.6.1.2.1.55.1.5.1.8",
    "ipv6IfOperStatus":      "1.3.6.1.2.1.55.1.5.1.10",

    # RFC 4293 IP-MIB ipAddressTable
    "ipAddressType":         "1.3.6.1.2.1.4.34.1.4",
    "ipAddressPrefix":       "1.3.6.1.2.1.4.34.1.5",

    # Legacy IPv6 address table from RFC 2465
    "ipv6AddrAddress":       "1.3.6.1.2.1.55.1.8.1.1",
    "ipv6AddrPfxLength":     "1.3.6.1.2.1.55.1.8.1.2",

    # Cisco-specific BGP4 MIB extension
    "cbgpPeer2RemoteAs":     "1.3.6.1.4.1.9.9.187.1.2.5.1.11",
}

def get_ipv6_interfaces(host: str, community: str = "public") -> list[dict]:
    """Get IPv6 addresses from the legacy ipv6AddrTable."""
    results = []

    # Walk the legacy ipv6AddrTable to find IPv6 addresses
    addresses = snmp_walk_ipv6(host, "1.3.6.1.2.1.55.1.8.1.1", community)
    prefix_lens = snmp_walk_ipv6(host, "1.3.6.1.2.1.55.1.8.1.2", community)

    for (addr_oid, addr_val), (pl_oid, pl_val) in zip(addresses, prefix_lens):
        results.append({
            "oid": addr_oid,
            "address": addr_val,
            "prefixlen": pl_val,
        })

    return results

# Get IPv6 addresses from router
interfaces = get_ipv6_interfaces("2001:db8::1")
for iface in interfaces:
    print(f"  {iface['address']}/{iface['prefixlen']}")
```

## SNMPv3 over IPv6 (Secure)

```python
import asyncio
from pysnmp.hlapi.v3arch.asyncio import *

async def _snmp_get_v3_ipv6(host: str, oid: str,
                            username: str,
                            auth_key: str,
                            priv_key: str,
                            port: int = 161) -> str | None:
    """SNMPv3 with authentication and encryption over IPv6."""
    snmp_engine = SnmpEngine()

    try:
        error_indication, error_status, error_index, var_binds = await get_cmd(
            snmp_engine,
            UsmUserData(
                username,
                authKey=auth_key,
                privKey=priv_key,
                authProtocol=USM_AUTH_HMAC96_SHA,
                privProtocol=USM_PRIV_CFB128_AES,
            ),
            await Udp6TransportTarget.create(
                (host, port),
                timeout=10,
                retries=2,
            ),
            ContextData(),
            ObjectType(ObjectIdentity(oid)),
        )

        if error_indication:
            print(f"SNMP error: {error_indication}")
            return None
        if error_status:
            print(f"SNMP error status: {error_status.prettyPrint()}")
            return None

        for var_bind in var_binds:
            return str(var_bind[1])
    finally:
        snmp_engine.close_dispatcher()

def snmp_get_v3_ipv6(host: str, oid: str,
                     username: str,
                     auth_key: str,
                     priv_key: str,
                     port: int = 161) -> str | None:
    return asyncio.run(
        _snmp_get_v3_ipv6(host, oid, username, auth_key, priv_key, port)
    )

# Secure SNMP query over IPv6
result = snmp_get_v3_ipv6(
    host="2001:db8::100",
    oid="1.3.6.1.2.1.1.1.0",
    username="snmpv3user",
    auth_key="authpassphrase123",
    priv_key="privpassphrase123",
)
print(f"sysDescr: {result}")
```

## Bulk Device Polling

```python
import concurrent.futures

DEVICES = [
    "2001:db8::10",
    "2001:db8::11",
    "2001:db8::12",
]

SYS_OIDS = {
    "sysDescr":   "1.3.6.1.2.1.1.1.0",
    "sysName":    "1.3.6.1.2.1.1.5.0",
    "sysUpTime":  "1.3.6.1.2.1.1.3.0",
}

def poll_device(host: str) -> dict:
    """Poll a single device for system info."""
    result = {"host": host}
    for name, oid in SYS_OIDS.items():
        result[name] = snmp_get_ipv6(host, oid)
    return result

# Poll all devices in parallel
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    futures = {executor.submit(poll_device, dev): dev for dev in DEVICES}
    for future in concurrent.futures.as_completed(futures):
        data = future.result()
        print(f"\nDevice: {data['host']}")
        print(f"  Name:    {data.get('sysName')}")
        print(f"  UpTime:  {data.get('sysUpTime')}")
```

## Conclusion

In current PySNMP releases, use the asyncio high-level API with `Udp6TransportTarget.create((host, port))` for IPv6 endpoints, and pass the bare IPv6 address without brackets. Use SNMPv2c (`CommunityData`) for backward compatibility or SNMPv3 (`UsmUserData`) with SHA/AES for secure polling over IPv6. For current, IP version-independent address data, prefer RFC 4293 (`1.3.6.1.2.1.4.34.*` for ipAddressTable); legacy RFC 2465 IPv6 tables (`1.3.6.1.2.1.55.*`) are still seen on some devices, but RFC 4293 obsoleted RFC 2465. Use `walk_cmd` for WALK operations and `concurrent.futures.ThreadPoolExecutor` to poll multiple IPv6 devices in parallel. Prefer SNMPv3 in production - community strings in SNMPv2c are transmitted in cleartext.
