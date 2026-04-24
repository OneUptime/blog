# How to Use Python for IPv6 SNMP Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv6, SNMP, Network Management, Pysnmp, Monitoring

Description: Use Python with pysnmp to perform SNMP queries over IPv6 to monitor and manage network devices.

## SNMP and IPv6

SNMP (Simple Network Management Protocol) works over IPv6 using the same operations (GET, GETNEXT, GETBULK, SET) but with IPv6 transport. Most managed network devices support SNMP over both IPv4 and IPv6. In current PySNMP releases, the documented high-level API for these operations is asyncio-based.

```bash
pip install pysnmp
```

## Basic SNMP GET over IPv6

Query a network device using SNMPv2c over IPv6:

```python
import asyncio

from pysnmp.hlapi.v3arch.asyncio import (
    get_cmd, SnmpEngine, CommunityData,
    Udp6TransportTarget,
    ContextData, ObjectType, ObjectIdentity
)

async def snmp_get_ipv6(
    host: str,
    community: str,
    oid: str,
    port: int = 161
) -> str:
    """
    Perform an SNMP GET over IPv6.
    host: IPv6 address of the target device
    """
    engine = SnmpEngine()
    try:
        transport = await Udp6TransportTarget.create(
            (host, port), timeout=5, retries=3
        )

        error_indication, error_status, error_index, var_binds = await get_cmd(
            engine,
            CommunityData(community),  # SNMPv2c
            transport,
            ContextData(),
            ObjectType(ObjectIdentity(oid))
        )
    finally:
        engine.close_dispatcher()

    if error_indication:
        raise RuntimeError(f"SNMP error: {error_indication}")
    if error_status:
        raise RuntimeError(f"PDU error at index {error_index}: {error_status}")

    return str(var_binds[0][1])

# Query sysDescr from a router over IPv6

async def main() -> None:
    sys_descr = await snmp_get_ipv6(
        host="2001:db8::1",
        community="public",
        oid="1.3.6.1.2.1.1.1.0"
    )
    print(f"System Description: {sys_descr}")

asyncio.run(main())
```

## SNMP WALK over IPv6 (getBulk)

Walk an OID tree using GETBULK for efficiency:

```python
import asyncio

from pysnmp.hlapi.v3arch.asyncio import (
    bulk_walk_cmd, SnmpEngine, CommunityData,
    Udp6TransportTarget, ContextData,
    ObjectType, ObjectIdentity
)

async def snmp_walk_ipv6(
    host: str, community: str, oid: str
) -> list[tuple[str, str]]:
    """Walk an OID subtree via SNMP GETBULK over IPv6."""
    results = []
    engine = SnmpEngine()

    try:
        transport = await Udp6TransportTarget.create((host, 161))

        async for error_indication, error_status, error_index, var_binds in bulk_walk_cmd(
            engine,
            CommunityData(community),
            transport,
            ContextData(),
            0,  # nonRepeaters
            10, # maxRepetitions
            ObjectType(ObjectIdentity(oid)),
            lexicographicMode=False
        ):
            if error_indication:
                raise RuntimeError(f"SNMP error: {error_indication}")
            if error_status:
                raise RuntimeError(f"PDU error at index {error_index}: {error_status}")
            for var_bind in var_binds:
                results.append((str(var_bind[0]), str(var_bind[1])))
    finally:
        engine.close_dispatcher()

    return results

# Walk interface table
async def main() -> None:
    interfaces = await snmp_walk_ipv6(
        host="2001:db8::1",
        community="public",
        oid="1.3.6.1.2.1.2.2.1"  # ifTable
    )
    for oid, value in interfaces[:10]:
        print(f"  {oid} = {value}")

asyncio.run(main())
```

## SNMPv3 over IPv6

SNMPv3 with authentication and privacy over IPv6:

```python
import asyncio

from pysnmp.hlapi.v3arch.asyncio import (
    get_cmd, SnmpEngine, UsmUserData,
    Udp6TransportTarget, ContextData,
    ObjectType, ObjectIdentity,
    usmHMACMD5AuthProtocol, usmDESPrivProtocol
)

async def snmp_v3_get_ipv6(
    host: str,
    username: str,
    auth_key: str,
    priv_key: str,
    oid: str
) -> str:
    """SNMPv3 GET over IPv6 with auth and encryption."""
    engine = SnmpEngine()
    try:
        transport = await Udp6TransportTarget.create((host, 161))

        error_indication, error_status, error_index, var_binds = await get_cmd(
            engine,
            UsmUserData(
                username,
                authKey=auth_key,
                privKey=priv_key,
                authProtocol=usmHMACMD5AuthProtocol,
                privProtocol=usmDESPrivProtocol
            ),
            transport,
            ContextData(),
            ObjectType(ObjectIdentity(oid))
        )
    finally:
        engine.close_dispatcher()

    if error_indication or error_status:
        raise RuntimeError(f"SNMP v3 error: {error_indication or error_status}")

    return str(var_binds[0][1])
```

## Monitoring IPv6 Interface Statistics

```python
import asyncio

# Interface MIB OIDs
IF_MIB = {
    "ifDescr":            "1.3.6.1.2.1.2.2.1.2",
    "ifOperStatus":       "1.3.6.1.2.1.2.2.1.8",
    "ifInOctets":         "1.3.6.1.2.1.2.2.1.10",
    "ifOutOctets":        "1.3.6.1.2.1.2.2.1.16",
}

async def get_interface_stats(host: str, community: str, if_index: int) -> dict:
    """Get interface statistics from a network device via IPv6 SNMP."""
    stats = {}
    for name, base_oid in IF_MIB.items():
        oid = f"{base_oid}.{if_index}"
        try:
            stats[name] = await snmp_get_ipv6(host, community, oid)
        except Exception as e:
            stats[name] = f"Error: {e}"
    return stats

# stats = asyncio.run(get_interface_stats("2001:db8::1", "public", 1))
# print(stats)
```

## Bulk Network Discovery via SNMP over IPv6

```python
import asyncio
from typing import Optional

async def probe_snmp_host(host: str, community: str) -> Optional[str]:
    """Check if a host responds to SNMP over IPv6."""
    try:
        return await asyncio.wait_for(
            snmp_get_ipv6(host, community, "1.3.6.1.2.1.1.1.0"),
            timeout=5.0
        )
    except Exception:
        return None

async def discover_snmp_hosts(hosts: list[str], community: str) -> dict:
    """Discover which hosts respond to SNMP over IPv6."""
    tasks = [probe_snmp_host(host, community) for host in hosts]
    results = await asyncio.gather(*tasks)
    return {host: result for host, result in zip(hosts, results) if result is not None}
```

## Conclusion

Python's pysnmp library supports SNMP over IPv6 using `Udp6TransportTarget`. In the current asyncio-based high-level API, the overall request flow is the same as IPv4 SNMP - the main transport-specific change is using the IPv6 transport target. SNMP over IPv6 is essential for network monitoring of IPv6-only devices and for management systems that need to reach devices with IPv6 addresses in dual-stack networks.
