# Validation Summary: How to Configure Icecast with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Icecast
- IPv6
- Liquidsoap
- Linux systemd
- ip6tables
- curl
- ffplay
- VLC

## Sources Consulted
- Icecast configuration file documentation: https://www.icecast.org/docs/icecast-latest/config_file/
- Icecast admin interface documentation: https://www.icecast.org/docs/icecast-trunk/admin_interface/
- Icecast YP / dual-stack listener socket guidance: https://www.icecast.org/docs/icecast-latest/yp/
- Icecast relaying documentation: https://www.icecast.org/docs/icecast-trunk/relaying/
- Icecast download page for current package naming guidance: https://icecast.org/download
- Debian `icecast2` package file list: https://packages.debian.org/bookworm/amd64/icecast2/filelist
- Debian Icecast source `main.c` showing `-v` / `--version`: https://sources.debian.org/src/icecast2/2.4.4-1/src/main.c/
- Debian Icecast default config path: https://sources.debian.org/src/icecast2/2.4.4-1/debian/icecast2.default/
- Fedora `icecast` package files and service name: https://packages.fedoraproject.org/pkgs/icecast/icecast/fedora-41.html
- RHEL 9 package manifest checked for package availability: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf
- Liquidsoap quick start and playlist usage: https://liquidsoap.readthedocs.io/en/stable/content/quick_start.html
- Liquidsoap output examples and Icecast usage: https://liquidsoap.readthedocs.io/en/latest/content/on2_part2.html
- Liquidsoap migration notes for `output.icecast` / `mount`: https://liquidsoap.readthedocs.io/en/latest/content/migrating.html
- RFC 3849 IPv6 documentation prefix: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- The post said Icecast supports IPv6 through its "hostname binding configuration". I changed that to listener socket configuration because `hostname` controls advertised URLs and listings, while `listen-socket` / `bind-address` control binding.
- The install section used `icecast -v` universally, but Debian/Ubuntu package the binary as `icecast2` while Fedora packages use `icecast`. I split the version check accordingly.
- The RPM-based example was labeled `RHEL/CentOS`, but the package and service names I verified were from Fedora packaging, and the RHEL 9 package manifest does not list Icecast. I narrowed those references to Fedora.
- The config snippet mixed Debian paths with incorrect web/admin asset paths. I kept the Debian/Ubuntu config path context and corrected `webroot` and `adminroot` to `/etc/icecast2/web` and `/etc/icecast2/admin`.
- The start/log commands used Debian service and log paths for all distributions. I added the Fedora `icecast` service name and `/var/log/icecast/error.log` path.
- Several IPv6 examples used invalid placeholder literals such as `2001:db8::icecast-server` and `2001:db8::master-icecast`. I replaced them with syntactically valid documentation addresses from `2001:db8::/32`.
- The Liquidsoap playlist example used a less standard argument order. I changed it to the documented `playlist(mode="normal", "/var/music/")` form.
- The firewall section saved rules to a non-portable path. I replaced that with a neutral note because persistence is distribution-specific.
- The closing explanation implied `::` alone was the dual-stack answer. I corrected it to reflect Icecast's documented guidance that explicit `::` and `0.0.0.0` listener sockets make dual-stack behavior predictable across systems.

## Review Notes
- Icecast upstream notes that if `bind-address` is omitted, it binds to all interfaces, including IPv6 if available, but operating system socket behavior can still affect dual-stack reachability. The explicit two-socket example is the safer guidance for a public dual-stack radio server.
- The Icecast documentation index still centers on the 2.4.x docs, while the download page now advertises Icecast 2.5.0 source releases. The corrected post avoids version-specific claims that would conflict with either stream.
