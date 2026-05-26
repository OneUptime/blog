# Validation Summary: How to Use the community.general.lmdb_kv Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible lookup plugins
- `community.general.lmdb_kv`
- LMDB
- Python `lmdb`
- PowerDNS LMDB backend
- OpenLDAP `mdb` backend

## Sources Consulted
- Ansible Community Documentation, `community.general.lmdb_kv` lookup: https://docs.ansible.com/projects/ansible/latest/collections/community/general/lmdb_kv_lookup.html
- `community.general.lmdb_kv` lookup source: https://raw.githubusercontent.com/ansible-collections/community.general/main/plugins/lookup/lmdb_kv.py
- Python LMDB documentation: https://lmdb.readthedocs.io/en/latest/
- PowerDNS Authoritative Server LMDB backend documentation: https://doc.powerdns.com/authoritative/backends/lmdb.html
- OpenLDAP Administrator's Guide, backends: https://openldap.org/doc/admin25/backends.html

## Issues Found
- The basic example passed `db='/var/lib/myapp/data.mdb'`. Current `community.general.lmdb_kv` opens the path with Python `lmdb.open()` and does not expose `subdir=False`, so `db` should point to the LMDB environment directory containing `data.mdb`. Updated the example to use `/var/lib/myapp`.
- The database path guidance said users could point to either a directory or the `.mdb` file depending on plugin version. Current documentation and source describe a single `db` path passed to `lmdb.open()`; the practical path for the examples created with default Python LMDB settings is the environment directory. Updated the guidance accordingly.
- The PowerDNS example implied arbitrary PowerDNS LMDB keys could be read directly. PowerDNS documents its LMDB backend as an internal schema and recommends the API or `pdnsutil` for direct inspection. Replaced the direct lookup example with a file existence check and clarified the limitation.
- The OpenLDAP section implied LDAP configuration could be read from the LMDB store with a simple key lookup. OpenLDAP's `mdb` backend is an internal directory database format, so LDAP tools are the correct interface for directory data. Clarified this and replaced the direct lookup with a file-status check and LDAP-tool guidance.

## Review Notes
The remaining examples are valid for LMDB environments that store simple UTF-8 keys and values created by the Python examples in the post. The `community.general.lmdb_kv` lookup returns a list internally; `query()` is generally clearer for list results, while `lookup(..., wantlist=True)` is appropriate where the post explicitly needs a list.
