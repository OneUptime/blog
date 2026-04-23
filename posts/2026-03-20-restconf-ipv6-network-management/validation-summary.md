# Validation Summary: How to Use RESTCONF for IPv6 Network Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RESTCONF
- IPv6
- YANG
- IETF interfaces, IP, and routing YANG models
- Python
- Python requests
- curl

## Sources Consulted
- RFC 8040: RESTCONF Protocol - https://datatracker.ietf.org/doc/html/rfc8040
- RFC 7951: JSON Encoding of Data Modeled with YANG - https://datatracker.ietf.org/doc/html/rfc7951
- RFC 8343: A YANG Data Model for Interface Management - https://datatracker.ietf.org/doc/html/rfc8343
- RFC 8344: A YANG Data Model for IP Management - https://datatracker.ietf.org/doc/html/rfc8344
- RFC 8349: A YANG Data Model for Routing Management - https://datatracker.ietf.org/doc/html/rfc8349
- RFC 3986: Uniform Resource Identifier (URI): Generic Syntax - https://datatracker.ietf.org/doc/html/rfc3986
- Requests advanced usage documentation - https://docs.python-requests.org/en/master/user/advanced/#ssl-cert-verification
- Cisco IOS XE RESTCONF Programmable Interface documentation - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/prog/configuration/166/b_166_programmability_cg/restconf_prog_int.html
- Juniper Junos REST API documentation - https://www.juniper.net/documentation/us/en/software/junos/rest-api/topics/concept/rest-api-overview.html
- Local curl help output for `-k`, `-u`, `-H`, `-X`, and `-d` flags

## Issues Found
- The examples used `2001:db8::r1`, which is not a valid IPv6 literal because IPv6 address hextets use hexadecimal digits only. Replaced it with `2001:db8::10`.
- The introduction listed exact vendor release claims that were too broad and platform-dependent. Replaced them with a platform/release-dependent support note.
- RESTCONF URI list key values were inserted directly into paths. Interface names such as `GigabitEthernet0/0` contain reserved characters, so the Python examples now percent-encode list keys and the curl example uses `GigabitEthernet0%2F0`.
- The PATCH payload encoded `ietf-interfaces:interface` as a JSON object. RFC 7951 encodes YANG list instances as arrays, so the payload now uses an array.
- The PATCH helper treated only `204 No Content` as success. RFC 8040 allows `200 OK` when a response body is returned and `204 No Content` when no body is returned, so the helper now accepts both.
- The IPv6 route example assumed a RIB key named `ipv6-unicast`. RFC 8349 defines the RIB key as an implementation-specific name and uses `address-family` to identify IPv6 unicast RIBs, so the example now retrieves RIBs and filters by `ietf-ipv6-unicast-routing:ipv6-unicast`.
- The conclusion stated that PATCH is idempotent. Reworded it to the RFC 8040 plain PATCH merge behavior used by the example.
- The client imported `json` without using it and used the less direct `requests.packages.urllib3` warning hook. Updated the example to import `urllib3` directly for disabling the lab-only insecure-request warning.

## Review Notes
The examples still use `verify=False` and `curl -k` for lab or self-signed certificate environments. For production, the client should validate the device certificate or pass an explicit CA bundle.
