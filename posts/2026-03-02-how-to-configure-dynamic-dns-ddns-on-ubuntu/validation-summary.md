# Validation Summary: How to Configure Dynamic DNS (DDNS) on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu package management and systemd services
- Dynamic DNS
- ddclient
- Cloudflare DNS API
- DuckDNS
- inadyn
- Bash scripting with curl and Python JSON parsing
- DNS lookup testing with dig
- cron and logrotate

## Sources Consulted
- ddclient official documentation: https://ddclient.net/
- ddclient protocol documentation for DuckDNS and nsupdate: https://ddclient.net/protocols.html
- ddclient upstream sample configuration: https://raw.githubusercontent.com/ddclient/ddclient/master/ddclient.conf.in
- Cloudflare official guide for dynamically updating DNS records: https://developers.cloudflare.com/dns/manage-dns-records/how-to/managing-dynamic-ip-addresses/
- Cloudflare DNS Records API reference: https://developers.cloudflare.com/api/resources/dns/subresources/records/
- inadyn upstream README and Cloudflare configuration example: https://github.com/troglobit/inadyn
- Local command help output for apt, systemctl, journalctl, curl, dig, crontab, and logrotate

## Issues Found
- The ddclient Cloudflare example used the Cloudflare account email as `login` while also saying the password value was an API token. ddclient's upstream sample specifies `login=token` when using an API token, so the example was changed to `login=token`.
- The ddclient DuckDNS example included an unnecessary `login` value and used a fully qualified `yoursubdomain.duckdns.org` hostname. ddclient's DuckDNS protocol documentation lists only the token as `password` and expects the registered non-fully-qualified host label, so the example was changed to use `password=your-duckdns-token` and `yoursubdomain`.
- The custom Cloudflare script would attempt to update an empty record ID if the requested DNS record was not found in the API response. A check was added after record lookup so the script exits with a clear error when `CF_RECORD_ID` is empty.
- The inadyn Cloudflare example used an email address as `username`. inadyn's upstream Cloudflare example uses the zone name as `username`, so this was changed to `example.com`.

## Review Notes
- Cloudflare's DNS Records API supports the GET and PUT endpoints used by the script, and Cloudflare documents `ttl=1` as automatic TTL while `ttl=120` is a valid explicit TTL for normal zones.
- The inadyn upstream repository was archived in October 2025, but the project remains packaged in Debian/Ubuntu and the Cloudflare configuration example is still documented upstream.
