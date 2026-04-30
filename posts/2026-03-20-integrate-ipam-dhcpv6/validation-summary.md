# Validation Summary: How to Integrate IPAM with DHCPv6 for IPv6

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6
- DHCPv6
- ISC Kea
- NetBox
- pynetbox
- Python
- Bash
- curl
- cron

## Sources Consulted
- ISC Kea Hook Libraries (`run_script`, `lease_cmds`): https://kea.readthedocs.io/en/stable/arm/hooks.html
- ISC Kea Management API / control channel behavior and `config-reload`: https://kea.readthedocs.io/en/latest/arm/ctrl-channel.html
- ISC Kea DHCPv6 host reservations: https://kea.readthedocs.io/en/kea-2.7.7/arm/dhcp6-srv.html
- ISC Kea `kea-admin` manual page: https://kea.readthedocs.io/en/kea-1.7.1/man/kea-admin.8.html
- NetBox IP address model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/ipaddress/
- NetBox interface model documentation (`mac_address` property): https://netbox.readthedocs.io/en/stable/models/dcim/interface/
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox REST API filtering documentation: https://netbox.readthedocs.io/en/stable/reference/filtering/
- pynetbox endpoint documentation (`create`, `update`, `filter`): https://pynetbox.readthedocs.io/en/stable/endpoint.html

## Issues Found
- The architecture diagram and Step 3 wording described Kea "webhooks" and a "lease file," but the examples were actually using a Kea hook script and the Kea control API. I corrected the diagram and wording to match documented Kea behavior.
- The NetBox-to-Kea reservation generator could emit `"None"` strings because it stringified null `dns_name` and `mac_address` values. I fixed the null handling.
- The reservation generator emitted a partial `Dhcp6` config object that did not match the later reload workflow. I changed it to emit a reservations array suitable for use with Kea's documented `<?include ...?>` configuration inclusion mechanism.
- The lease import example parsed the Kea HTTP control response as a JSON object, but Kea wraps HTTP control responses in a list for compatibility. I fixed the parser and allowed the documented "no leases found" result instead of treating it as a hard failure.
- The lease import example claimed to import active leases but did not filter lease state. I updated it to import only active `IA_NA` leases.
- The real-time sync example used nonexistent `KEA_LEASE6_ACTION`-style semantics and labeled a `POST` request as "create/update" even though it only attempted creation. I replaced it with documented `run_script` hook points and a NetBox lookup plus `POST`/`PATCH` flow.
- The `run_script` example placed the script under `/etc/kea/hooks/`, but ISC documents that external scripts for this hook library must live under Kea's scripts directory unless `KEA_HOOK_SCRIPTS_PATH` is overridden. I updated the example paths accordingly.
- The periodic reconciliation example used `kea-admin lease-reload dhcp6`, which is not a valid `kea-admin` command. I replaced it with a documented `config-reload` call over Kea's control API after writing the generated reservations file.

## Review Notes
- Kea documents that since version 2.7.2, DHCP servers can expose HTTP/HTTPS control channels directly, so the Control Agent pattern used here still works but is no longer strictly required.
- Kea documents that `lease6-get-all` can produce very large responses; for large environments, `lease6-get-page` would be a better fit than a full snapshot pull.
