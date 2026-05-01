# Validation Summary: How to Design a VLSM Addressing Plan

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv4
- VLSM
- CIDR-style subnetting
- Python
- Python `ipaddress` standard library
- RIP routing protocol behavior

## Sources Consulted
- Python Standard Library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4632, Classless Inter-domain Routing (CIDR): https://www.rfc-editor.org/rfc/rfc4632
- RFC 1058, Routing Information Protocol: https://www.rfc-editor.org/rfc/rfc1058
- RFC 2453, RIP Version 2: https://www.rfc-editor.org/rfc/rfc2453
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://www.rfc-editor.org/rfc/rfc3021

## Issues Found
- The example parent block was incorrect. The post used `192.168.20.0/24`, but the listed allocations require 500 total addresses (`/24 + /25 + /26 + /27 + /28 + /30`), while a `/24` only provides 256. I changed the parent block to `192.168.20.0/23` in both the example text and the verification snippet.
- The `design_vlsm` example did not verify that each computed subnet stayed inside the declared parent block, so it could silently allocate outside the parent network. I added an explicit boundary check that raises `ValueError` when a segment does not fit.
- The design process said to document the broadcast address for each subnet, but the example table did not print it. I added a `Broadcast` column so the code matches the stated process.
- The routing guidance said “OSPF or BGP must be used,” which was too restrictive. RIPv1 is the actual limitation because it does not include subnet masks in its advertisements; I corrected the sentence to reflect that.

## Review Notes
- The example now fits correctly inside the stated parent block, but it leaves only 12 addresses unused in the `/23`. If the author wants the example to demonstrate the separate “leave growth room” recommendation, a larger parent block would be needed.
- The WAN-link example still uses conventional `/30` sizing for two hosts. RFC 3021 allows `/31` on point-to-point IPv4 links where both ends support it, but the post does not cover that optimization.
