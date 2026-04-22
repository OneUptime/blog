# Validation Summary: How to Configure SAP Systems for IPv6

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SAP NetWeaver / ABAP Platform
- SAP S/4HANA
- SAP Web Dispatcher
- SAP HANA
- SAProuter
- IPv6, DNS AAAA records, Linux network verification tools

## Sources Consulted
- SAP Help Portal: Configuring SAP Systems for IPv6 - https://help.sap.com/doc/saphelp_nw73ehp1/7.31.19/en-US/46/cd5ee2c45365dde10000000a155369/content.htm
- SAP Help Portal: IPv6 Support in SAP Systems - https://help.sap.com/saphelp_aii710/helpdata/en/65/c9064ea4654c8697abc0d78aa73d12/content.htm
- SAP Help Portal: Variables in Profile Values / SETENV - https://help.sap.com/docs/ABAP_PLATFORM_NEW/e067931e0b0a4b2089f4db327879cd55/e05f0c5000efc06fe10000000a423f68.html
- SAP Help Portal: `icm/server_port_<xx>` - https://help.sap.com/docs/SAP_NETWEAVER_750/0c333adb55cd4dbf8e92a5175703224c/483ae05299c172d0e10000000a42189c.html
- SAP Help Portal: `wdisp/system_<xx>` - https://help.sap.com/docs/ABAP_PLATFORM_NEW/683d6a1797a34730a6e005d1e8de6f22/1bb0fd8a12344c4ca89b7a1c5d1d7310.html
- SAP Help Portal: Standalone Enqueue Server 2 parameters - https://help.sap.com/docs/latest/e458064e3077486994caaf9a85c4aa23/1ca2eab4fca04d2696b7185f470b51aa.html
- SAP Help Portal: SAP HANA listeninterface / network configuration - https://help.sap.com/docs/SAP_HANA_PLATFORM/6b94445c94ae495c83a19646e7c3fd56/0c6738ab85c64da1aed0fa91c25ed47c.html
- SAP Help Portal: SAP HANA ALTER SYSTEM example for listeninterface - https://help.sap.com/docs/SAP_HANA_PLATFORM/6b94445c94ae495c83a19646e7c3fd56/08f6be2eb0b647f5be1b01f1fe5043eb.html
- SAP Help Portal: SAP HANA HDBSQL command-line reference - https://help.sap.com/docs/HANA_CLOUD_DATABASE/f1b440ded6144a54ada97ff95dac7adf/c22c67c3bb571014afebeb4a76c3d95d.html
- SAP Help Portal: Start and Stop the SAP HANA System - https://help.sap.com/docs/SAP_HANA_PLATFORM/2c1988d620e04368aa4103bf26f17727/cbdb1298bb5710148fd6e6fb71038ba2.html
- SAP Help Portal: SAProuter option -6 - https://help.sap.com/doc/saphelp_snc70/7.0/en-US/48/6e348e04be055ee10000000a42189b/content.htm
- SAP Help Portal: SAProuter route permission table - https://help.sap.com/doc/saphelp_snc700_ehp01/7.0.1/en-US/48/6c7a3fc1504e6ce10000000a421937/content.htm
- SAP Help Portal: SAProuter option -S - https://help.sap.com/docs/ABAP_PLATFORM_NEW/e245703406684d8a81812f4c6334eb2f/486b5b06b74c07bee10000000a42189d.html
- SAP Help Portal: SM59 ABAP connection type 3 target host/system number example - https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/4cef93946a0b48ec89533b3c34443b85/2924b36d215a4cf0b523e4f4d2f578fe.html
- Local command help checked for `ss --help`, `curl --help all`, `dig -h`, and `telnet --help`.

## Issues Found
- The post described IPv6 as enabled mainly through profile parameters. SAP documentation requires starting the instance with `SAP_IPv6_ACTIVE=1`, so the overview and profile snippets were corrected to include that environment variable.
- The support matrix claimed SAP Basis 7.0+ and NetWeaver 7.4+ full IPv6 support. This was corrected to SAP NetWeaver 7.0 Enhancement Package 2 with SAP Kernel 7.10 patch level 150 or later, plus consistent IPv6 activation across instances.
- The ICM and Web Dispatcher examples used non-documented `icm/bind_addr`. SAP documents host binding through the `HOST` subparameter on `icm/server_port_<xx>`, so the examples were changed accordingly.
- The Web Dispatcher backend example used `MSSYSPORT`, which is not a documented `wdisp/system_<xx>` subparameter. It was changed to `MSPORT`.
- The enqueue example used `enque/server_port`, which is not the current Standalone Enqueue Server 2 profile parameter. It was replaced with `enq/serverhost`, `enq/serverinst`, and optional `enq/serverport`.
- The SAP HANA query checked `SYS.M_CONFIGURATION_PARAMETER_VALUES` without section/file context. It was changed to query `PUBLIC.M_INIFILE_CONTENTS` for `[communication] listeninterface`.
- The HANA section said `sudo HDB restart`. SAP documents `HDB stop` and `HDB start` as `<sid>adm` for local HDB operations, so the restart instructions were corrected.
- The SAProuter section used invalid example IPv6 literals, an unsupported `T` row type for route permission entries, and `saprouter -r -n <NN>` as a startup command. The route entries now use valid documentation IPv6 prefixes with `P`, and startup uses `saprouter -r -6` with optional `-S <port>`.
- The SM59 section mixed TCP/IP destination activation fields with ABAP system `System Number` fields. It now uses an ABAP Connection (type 3), which matches the target-host and system-number configuration shown.
- The verification commands used URL-style brackets with `telnet` and invalid IPv6 placeholders. They were changed to FQDN-based `telnet -6` and `curl -6` examples.

## Review Notes
Using `.global` for SAP HANA `listeninterface` is technically valid for listening on all interfaces, but production systems should also account for network isolation, firewalling, and TLS/SNC requirements. SAProuter examples remain illustrative and should be adapted to the exact route topology and security policy.
