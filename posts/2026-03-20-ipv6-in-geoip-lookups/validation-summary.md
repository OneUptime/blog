# Validation Summary: How to Handle IPv6 in GeoIP Lookups

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- GeoIP / GeoLite2 / GeoIP2
- MaxMind databases
- `geoipupdate`
- Python
- Node.js
- Nginx

## Sources Consulted
- MaxMind GeoLite Databases and Web Services: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data/
- MaxMind Updating GeoIP and GeoLite Databases: https://dev.maxmind.com/geoip/updating-databases/
- MaxMind GeoIP and GeoLite City and Country Databases: https://dev.maxmind.com/geoip/docs/databases/city-and-country/
- MaxMind Geolocate an IP Address Using Databases: https://dev.maxmind.com/geoip/geolocate-an-ip/databases/
- MaxMind GeoIP2 Python API docs: https://geoip2.readthedocs.io/en/latest/
- MaxMind GeoIP2 Python repository documentation: https://github.com/maxmind/GeoIP2-python
- MaxMind GeoIP2 Node.js API docs: https://maxmind.github.io/GeoIP2-node/
- MaxMind GeoIP2 Node.js repository documentation: https://github.com/maxmind/GeoIP2-node
- `ngx_http_geoip2_module` documentation: https://github.com/leev/ngx_http_geoip2_module
- NGINX `log_format` directive docs: https://nginx.org/en/docs/http/ngx_http_log_module.html#log_format
- Python `ipaddress` module docs: https://docs.python.org/3/library/ipaddress.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/rfc3849/

## Issues Found
- The `geoipupdate` instructions said to configure `/etc/GeoIP.conf` with only a license key. Current MaxMind documentation requires `AccountID`, `LicenseKey`, and `EditionIDs`, so I corrected that comment.
- The Python example handled IPv4-mapped IPv6 by text replacement before parsing. That can misclassify mapped addresses and is less correct than parsing first and using `IPv6Address.ipv4_mapped`, so I updated the normalization logic accordingly.
- The Python example coerced missing latitude and longitude values to `0`, which can incorrectly look like real coordinates. I changed it to preserve the database values as-is and added `timezone` to the result schema for consistency.
- The Node.js example used non-official package/API patterns while the post is framed around MaxMind GeoIP2 usage. I updated it to use MaxMind’s official `@maxmind/geoip2-node` reader API, corrected the current field names, and normalized IPv4-mapped IPv6 addresses before lookup.
- The Nginx snippet placed `geoip2` and `log_format` in the wrong contexts. Per the module docs and NGINX docs, `geoip2` belongs in `http` and `log_format` is only valid in `http`, so I moved them to valid locations.
- The reserved-address helper only skipped some non-public addresses even though the section covers reserved IPv6 handling. I expanded the checks to include multicast, unspecified, and reserved addresses, and simplified the RFC 3849 documentation-prefix check.

## Review Notes
- The Python example opens a new `geoip2.database.Reader` for each lookup. MaxMind’s documentation recommends reusing a reader across requests because constructing it is expensive. The current code is valid, but it is not the most efficient pattern for production use.
- MaxMind recommends `geoipupdate` for automated binary-database updates. The direct download example is still usable, but `geoipupdate` remains the preferred operational approach.
