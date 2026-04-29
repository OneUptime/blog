# Validation Summary: How to Set Up OSPF for IPv4 on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- MikroTik RouterOS v7
- MikroTik RouterOS v6
- OSPFv2 (IPv4 link-state routing)
- OSPF areas (backbone, stub, NSSA)
- OSPF authentication (MD5)
- Route redistribution (connected, static)

## Sources Consulted
- [MikroTik RouterOS v7 OSPF documentation (/routing/ospf)](https://help.mikrotik.com/docs/spaces/ROS/pages/331612216/routing+ospf)
- [MikroTik OSPF help portal](https://help.mikrotik.com/docs/display/ROS/OSPF)
- [MikroTik Wiki: Manual:Routing/OSPF (v6 reference)](https://wiki.mikrotik.com/wiki/Manual:Routing/OSPF)
- RFC 2328 (OSPF Version 2) for terminology accuracy

## Issues Found
- **`auth-key` → `authentication-key`**: The OSPF Authentication code block used `auth-key=OSPFsecret123`, which is not the property name accepted by RouterOS v7. The official `/routing/ospf/interface-template` reference lists `authentication-key` (string, sensitive) as the correct parameter. Fixed by replacing `auth-key=` with `authentication-key=`.

All other commands and parameters (`router-id`, `area-id`, `instance`, `interfaces`, `area`, `hello-interval`, `dead-interval`, `passive`, `auth=md5`, `type=stub`, `type=nssa`, `redistribute=connected,static`, the v6 `/routing ospf network add` syntax, and the verification commands `/routing ospf neighbor print`, `/ip route print where ospf`, `/routing ospf instance print`, `/routing ospf lsa print`) match the current RouterOS documentation.

## Review Notes
- The `passive` parameter is documented as a "flag" in the RouterOS reference, but the `passive=yes` form used in the post is the conventional MikroTik CLI assignment for flag-style booleans and is widely accepted in practice.
- The `redistribute` example uses the consolidated v7 syntax (`redistribute=connected,static`); RouterOS v6 uses separate `redistribute-connected` / `redistribute-static` properties on the instance, but the post explicitly references the v7 instance name (`ospf-main`) so this is not misleading.
- The `version` parameter on `/routing ospf instance` defaults to 2 (OSPFv2 / IPv4), so omitting it for IPv4 examples is correct.
- For long-term security, MD5 OSPF authentication is acceptable on internal links but operators should consider SHA-based options (`auth=sha256` or higher) which RouterOS v7 also supports.
