# Validation Summary: How to Configure Firewall Rules for Podman Containers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- firewalld
- firewall-cmd
- Linux container networking
- Firewall zones, rich rules, and policy objects

## Sources Consulted
- Podman network documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman network inspect documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman run documentation for published ports: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd
- firewalld rich language manual: https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- Red Hat Enterprise Linux firewalld policy object guidance for Podman zones: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/securing_networks/securing-networks.pdf

## Issues Found
- The post described Podman container traffic through firewalld zones without distinguishing rootful bridge networking from rootless networking. Current Podman uses `pasta` by default for rootless networking, so the host bridge interface workflow only applies to rootful bridge networks. I clarified that scope and changed relevant Podman commands to use `sudo podman`.
- The dedicated zone example used `podman network inspect` without root privileges even though it was inspecting the rootful default bridge network. I changed it to `sudo podman network inspect`.
- The interface assignment used `--add-interface`. This is valid, but `--change-interface` is the documented command for moving an interface into a specific zone when it may already be assigned elsewhere. I changed the command to `--change-interface`.
- The outbound blocking rich rule was not valid firewalld rich language because it used a destination-only rule with an action but no rule element such as a service, port, or protocol. I replaced it with a firewalld policy object using the `containers` zone as ingress, `ANY` as egress, and a `DROP` target.
- The verification step used `podman exec webserver curl`, but the `nginx:alpine` image should not be assumed to include `curl`. I changed the test to run the official curl container image on the Podman network.
- The summary only mentioned zones and rich rules for outbound control. I updated it to mention policies as well.

## Review Notes
The examples are now technically consistent for Linux hosts using firewalld with rootful Podman bridge networking. Rootless Podman firewall behavior is different and would need separate examples if covered in a future post.
