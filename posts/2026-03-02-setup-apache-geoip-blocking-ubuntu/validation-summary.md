# Validation Summary: How to Set Up Apache with GeoIP Blocking on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (apt, add-apt-repository)
- Apache HTTP Server 2.4 (mod_geoip, mod_maxminddb, `<If>` expressions, RewriteEngine, `SetEnvIf`)
- MaxMind GeoIP2 / GeoLite2 (.mmdb) databases
- MaxMind `geoipupdate` (v4+ config format with AccountID/LicenseKey/EditionIDs)
- `geoip-bin` (geoiplookup)
- UFW firewall (with comment support)
- ipdeny.com country zone files
- cron / `/etc/cron.d`

## Sources Consulted
- Apache mod_maxminddb README and releases — https://github.com/maxmind/mod_maxminddb
- Apache 2.4 expression syntax — https://httpd.apache.org/docs/2.4/expr.html
- Apache mod_authz_host (Order/Allow/Deny vs. Require) — https://httpd.apache.org/docs/2.4/mod/mod_authz_host.html
- Ubuntu package archive — https://packages.ubuntu.com/search?keywords=libapache2-mod-geoip
- MaxMind PPA on Launchpad — https://launchpad.net/~maxmind/+archive/ubuntu/ppa
- MaxMind geoipupdate GeoIP.conf docs — https://github.com/maxmind/geoipupdate/blob/main/doc/GeoIP.conf.md
- ipdeny.com — https://www.ipdeny.com/ipblocks/

## Issues Found
1. **`libapache2-mod-geoip` availability claim** — Post stated the package is available on Ubuntu "20.04+". In fact, the package was removed in 20.04 (focal) and reintroduced in 22.04 (jammy) and 24.04 (noble). Updated the comment to accurately reflect availability ("22.04+; was removed in 20.04 and reintroduced in 22.04").
2. **`mod_maxminddb` build was missing `./configure` and `make`** — Original snippet jumped straight to `sudo make install` after extraction. The official build process requires `./configure && make && sudo make install`. Added the missing steps.
3. **Broken `sudo echo > file` redirection** — Shell processes redirection as the unprivileged user before `sudo` is invoked, so writing to `/etc/apache2/mods-available/maxminddb.load` would have failed with Permission denied. Changed to the standard `echo ... | sudo tee FILE` pattern.
4. **mod_maxminddb version bump** — Updated the pinned tarball name from `mod_maxminddb-1.2.0.tar.gz` to `mod_maxminddb-1.3.0.tar.gz` to match the current latest release (May 2026), since the `latest/download/<filename>` URL only resolves when the filename matches the actual latest asset.
5. **ipdeny.com URL upgraded to HTTPS** — Changed `http://www.ipdeny.com/...` to `https://...` since the site now supports SSL for downloads, avoiding cleartext fetches of firewall rule data.

## Review Notes
- The `Order`/`Allow`/`Deny` directives shown in Methods 1 and 2 are the **Apache 2.2** access-control syntax, still supported in Apache 2.4 via `mod_access_compat` but officially deprecated in favour of `Require all granted` / `Require all denied` / `Require env=NAME` / `Require not env=NAME`. The post's snippets will still work on default Ubuntu Apache installs (which load `mod_access_compat`), so this was left unchanged, but readers writing new configs from scratch should prefer the modern `Require` syntax.
- The post installs both `libapache2-mod-geoip` (legacy v1, `.dat` format) and `mod_maxminddb` (modern, `.mmdb` format), and the configured `geoipupdate` only fetches `.mmdb` databases. Using `mod_geoip` requires a legacy `GeoIP.dat` file which MaxMind no longer distributes, so in practice the `mod_geoip` example is included as historical context only — readers should use the `mod_maxminddb` path.
- The Apache `<If>` example mixes `reqenv('GEOIP_COUNTRY_CODE')` with `%{REQUEST_URI}` and uses `m#...#` as the regex delimiter; both forms are valid per the official Apache 2.4 expression grammar.
- The blocklist example in Method 2 uses `Order allow,deny` with `Allow from all` followed by `Deny from env=BlockedCountry`. With `Order allow,deny`, the last matching rule wins and the default is `deny`, so this works as intended for blocked countries, but readers should be aware the semantics are subtle — testing is recommended.
