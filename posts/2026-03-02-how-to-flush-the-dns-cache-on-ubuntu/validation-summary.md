# Validation Summary: How to Flush the DNS Cache on Ubuntu

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ubuntu
- systemd-resolved
- resolvectl / systemd-resolve
- nscd
- dnsmasq
- NetworkManager
- dig
- Docker container DNS

## Sources Consulted
- systemd resolvectl manual: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- Ubuntu resolvectl manual: https://manpages.ubuntu.com/manpages/focal/man1/resolvectl.1.html
- Ubuntu 18.04 systemd-resolve manual: https://manpages.ubuntu.com/manpages/bionic/man1/systemd-resolve.1.html
- Ubuntu systemd-resolved manual: https://manpages.ubuntu.com/manpages/resolute/en/man8/systemd-resolved.service.8.html
- Ubuntu DNSSEC / resolver documentation: https://ubuntu.com/server/docs/explanation/dnssec/dnssec/
- nscd manual: https://www.man7.org/linux/man-pages/man8/nscd.8.html
- Ubuntu nscd manual: https://manpages.ubuntu.com/manpages/jammy/man8/nscd.8.html
- dnsmasq manual: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- Ubuntu NetworkManager.conf manual: https://manpages.ubuntu.com/manpages/jammy/man5/NetworkManager.conf.5.html
- Docker networking documentation: https://docs.docker.com/engine/network/

## Issues Found
- The introduction said flushing the local DNS cache forces fresh records from authoritative servers immediately. This was changed to say the system fetches from its configured DNS resolver, because typical clients query a recursive resolver and upstream caches may still hold old records.
- The systemd-resolved section described `resolvectl flush-caches` as the method for Ubuntu 18.04+. Ubuntu 18.04 documents `systemd-resolve --flush-caches`, while newer Ubuntu releases document `resolvectl flush-caches`, so a version-specific note was added.
- The verification comment said the cache size should be "0 or lower." Cache size cannot be lower than zero, so it now says `Current Cache Size` should be 0.
- The nscd command comment said `nscd --invalidate=hosts` flushes all databases. It only invalidates the hosts cache, so the comment was corrected.
- The `dig example.com @8.8.8.8` example called 8.8.8.8 an authoritative DNS server. It is a public recursive resolver, so the wording was corrected.
- The automation script assumed `resolvectl` exists whenever systemd-resolved is active. It now falls back to `systemd-resolve --flush-caches` for older Ubuntu systems.
- The `/etc/hosts` section said changes are always read on each lookup and never cached. This is true for the typical `files` NSS path, but nscd and dnsmasq can cache hosts data, so the caveat was added.
- The container section recommended running `resolvectl` or `systemctl restart systemd-resolved` inside Docker containers. Docker containers usually use inherited DNS settings or Docker's embedded DNS rather than systemd-resolved inside the container, so the section now recommends clearing application/container-level cache or restarting the container when appropriate.

## Review Notes
The post is technically relevant and useful after the corrections. Future improvements could mention that `resolvectl query --cache=no` can bypass the local systemd-resolved cache for a single query on systemd versions that support it, but that was not necessary to correct the existing content.
