# Validation Summary: How to Set Up SAP Router on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- SAProuter
- SAP Cryptographic Library
- SAPGENPSE
- SAP route permission table (`saprouttab`)
- systemd
- firewalld

## Sources Consulted
- SAP Help Portal: SAProuter Options - https://help.sap.com/saphelp_gbt10/helpdata/en/48/6e2ef629540e27e10000000a421937/content.htm
- SAP Help Portal: Route Permission Table - https://help.sap.com/docs/SAP_NETWEAVER_701/6d9a59096c4b1014b507f15bed51571f/486c7a3fc1504e6ce10000000a421937.html
- SAP Help Portal: Creating a Route Permission Table - https://help.sap.com/doc/saphelp_nw75/7.5.5/en-US/ea/214d2aafaa43feaee78375cb16552f/content.htm
- SAP Help Portal: Creating a PSE for the Server Using SAPGENPSE - https://help.sap.com/docs/SAP_NETWEAVER_750/e73bba71770e4c0ca5fb2a3c17e8e229/56a92f3ae689f058e10000000a11402f.html
- SAP Help Portal: Importing the Certificate Request Responses - https://help.sap.com/saphelp_snc700_ehp01/helpdata/en/49/45935a3a293b5be10000000a42189b/content.htm
- SAP Help Portal: Creating the Server's Credentials Using SAPGENPSE - https://help.sap.com/docs/SAP_NETWEAVER_700/129dc8e26c531014a028840c4c35d3aa/32ce2e3ad962a51ae10000000a11402f.html
- Red Hat Enterprise Linux 9 documentation: Using and configuring firewalld - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- systemd.service manual - https://www.freedesktop.org/software/systemd/man/254/systemd.service.html

## Issues Found
- Corrected the `saprouttab` comments. The post described `S` as "Permit with SNC", but SAP documents `S` as permitting only NI protocol connections. SAProuter SNC route entries start with `K`, such as `KT`, `KP`, `KS`, or `KD`.
- Corrected SAProuter port option usage. The post used `-p 3299` in stop and status commands, but SAP documents `-p` as soft shutdown and `-S <service>` as the service/port option. The commands now use `-S 3299`.
- Corrected the connected-client verification command. The post used `saprouter -n`, but SAP documents `-n` as re-reading the route permission table. The detailed route-information command now uses `saprouter -L -S 3299`.
- Corrected the conclusion's SNC claim. Starting SAProuter with SNC settings does not automatically mean every permitted route is encrypted; the wording now says SNC protects connections configured to use SNC.

## Review Notes
The example route table uses placeholder private addresses, a placeholder password, and a sample SAP support IP. In a production deployment, administrators should replace these with values from their SAP support configuration and avoid broad destination wildcards in permit rules, as SAP warns against wildcard target hosts and ports in `P` and `S` entries.
