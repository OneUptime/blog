# Validation Summary: How to Configure Snort Rules for Custom Threat Detection on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- RHEL
- Snort
- IDS
- Linux package management
- systemd
- firewalld

## Sources Consulted
- Snort 3 Rule Writing Guide: Command Line Basics: https://docs.snort.org/start/help
- Snort 3 Rule Writing Guide: Configuration: https://docs.snort.org/start/configuration
- Red Hat Enterprise Linux documentation: Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_software_with_the_dnf_tool/index
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld guide: Open a Port or Service: https://firewalld.org/documentation/howto/open-a-port-or-service.html

## Issues Found
- The post is placeholder content and does not provide a working Snort procedure. Commands such as `sudo dnf install -y <package-name>`, `sudo vi /etc/<service>/config.conf`, `sudo systemctl enable --now <service>`, and `sudo <service> --test` cannot be executed as written.
- The article title promises custom Snort rule configuration, but the body does not include Snort rule syntax, a Snort configuration file path, rule file inclusion, interface configuration, or a Snort validation command.
- The Snort 3 documentation shows configuration is Lua-based and commonly validated with `snort -c <config> -T`; the post instead uses generic service placeholders and does not mention `snort.lua`, rule files, or Snort's actual command-line usage.
- The firewalld section is generic and uses `<service>` as though a firewalld service definition necessarily exists. Official firewalld documentation distinguishes predefined services from custom services and ports.

## Review Notes
The post should be removed or replaced with a real Snort-on-RHEL tutorial. A salvageable version would need concrete Snort installation steps for the targeted RHEL version, accurate Snort 2 versus Snort 3 configuration paths, custom rule examples, rule inclusion in the Snort configuration, interface selection, validation with Snort's actual CLI, and logging or alert verification.
