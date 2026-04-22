# How to Configure SAP Systems for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SAP, IPv6, Enterprise, ERP, ABAP, NetWeaver, Business Suite

Description: Configure SAP NetWeaver and SAP S/4HANA systems to operate in IPv6 and dual-stack environments, covering instance profiles, system parameters, and network configuration.

---

SAP systems built on NetWeaver support IPv6 when the instance starts with `SAP_IPv6_ACTIVE=1`. ICM and Web Dispatcher services are still configured with profile parameters; when no host binding is specified, the dispatcher, gateway, ICM, and related components listen on local IPv4 and IPv6 addresses unless explicitly restricted.

## SAP IPv6 Support Overview

```text
SAP IPv6 support requirements:
- SAP NetWeaver 7.0 Enhancement Package 2 with SAP Kernel 7.10 patch level 150 or later, or a later SAP Kernel
- Set SAP_IPv6_ACTIVE=1 consistently for all instances in the SAP system
- SAP S/4HANA: verify the underlying ABAP platform/kernel, SAP HANA, OS, and network support IPv6
- SAP HANA 2.0 SPS 04 or higher for HANA dual-stack or IPv6-only environments
- Underlying OS and network infrastructure must have IPv6 enabled

Architecture considerations:
- SAP Application Server (AS ABAP)
- SAP Message Server
- SAP Dispatcher
- SAP Web Dispatcher
- SAP HANA Database (separate IPv6 configuration)
```

## SAP ABAP Instance Profile for IPv6

```text
# /usr/sap/<SID>/SYS/profile/<SID>_DVEBMGS<NN>_<hostname>

# Enable IPv6 support for this instance
SETENV_00 = SAP_IPv6_ACTIVE=1

icm/server_port_0 = PROT=HTTP,PORT=8000,TIMEOUT=120

# For explicit host/interface binding:
# icm/server_port_0 = PROT=HTTP,PORT=8000,TIMEOUT=120,HOST=sapapp.example.com
# Without HOST, the port is bound to all local host names/addresses.

# Message server hostname (use FQDN with AAAA record)
rdisp/mshost = sap-ms.example.com

# ABAP RFC destination configuration supports IPv6
# via FQDN with AAAA record in SM59

# Standalone Enqueue Server 2 (use FQDN with AAAA record)
enq/serverhost = sap-ascs.example.com
enq/serverinst = 01
# Optional port override; default is derived from enq/serverinst
# enq/serverport = 3901
```

## SAP Web Dispatcher IPv6 Configuration

```text
# /usr/sap/<SID>/WebDisp/profile/<SID>_WebDisp_<host>

# Enable IPv6 support for this Web Dispatcher
SETENV_00 = SAP_IPv6_ACTIVE=1

# Web Dispatcher listener on IPv6
icm/server_port_0 = PROT=HTTP,PORT=80,TIMEOUT=120

# For explicit host/interface binding:
# icm/server_port_0 = PROT=HTTP,PORT=80,TIMEOUT=120,HOST=sap-webdisp.example.com

# Backend connection to AS ABAP over IPv6
# Use wdisp/system_<N> with an IPv6-capable message-server hostname

# Example backend with IPv6:
wdisp/system_0 = SID=<SID>, MSHOST=<IPv6-FQDN>, MSPORT=8100
```

## SAP HANA IPv6 Configuration

```bash
# SAP HANA IPv6 configuration via hdbsql

# Check current network config
hdbsql -n <host>:3<NN>13 -u SYSTEM -p <password> \
  "SELECT * FROM \"PUBLIC\".\"M_INIFILE_CONTENTS\" WHERE SECTION = 'communication' AND KEY = 'listeninterface'"

# Enable IPv6-capable listening in global.ini
hdbsql -n <host>:3<NN>13 -u SYSTEM -p <password> \
  "ALTER SYSTEM ALTER CONFIGURATION ('global.ini', 'SYSTEM') SET ('communication', 'listeninterface') = '.global' WITH RECONFIGURE"

# Or edit /hana/shared/<SID>/global/hdb/custom/config/global.ini
# [communication]
# listeninterface = .global

# Restart HANA after changes (as <sid>adm)
HDB stop
HDB start
```

## SAProuter for IPv6

```text
# saprouttab (SAProuter route permission table) with IPv6

# Allow DIAG from an IPv6 client subnet to an SAP system
P  2001:db8:100::/48  2001:db8:200::20  32<NN>

# Allow routing to another SAProuter over IPv6
P  2001:db8:100::/48  2001:db8:200::10  3299

# Start SAProuter with IPv6 (SAProuter 38.0 or later)
saprouter -r -6 -R /usr/sap/saprouter/saprouttab

# If using a non-default SAProuter port:
# saprouter -r -6 -S <port> -R /usr/sap/saprouter/saprouttab

# Check SAProuter status
saprouter -l
```

## SAP RFC Destinations over IPv6

```text
Configure RFC Destination (SM59) for IPv6:

1. Go to SM59 in SAP GUI
2. Create RFC Destination type "ABAP Connection" (type 3)
3. Technical Settings:
   - Load Balancing: No
   - Target Host: ipv6server.example.com
     (Use FQDN with AAAA record, not raw IPv6 address)
   - System Number: 00
4. Test Connection

Note: SAP GUI and RFC typically work best with
fully qualified hostnames that resolve to IPv6 addresses
rather than raw IPv6 address notation
```

## Verifying SAP IPv6 Configuration

```bash
# Check SAP processes are listening on IPv6
ss -6 -tlnp | grep -E "32|33|36|39|80|8000"

# Test connectivity to SAP system over IPv6
telnet -6 sap-system.example.com 3200  # DIAG port
curl -6 http://sap-web.example.com:8000/sap/bc/ping

# Check OS-level hosts file for SAP hostnames
grep "sap" /etc/hosts

# Verify FQDN resolves to IPv6
dig AAAA sap.example.com +short
```

SAP systems support IPv6 when instances are started with `SAP_IPv6_ACTIVE=1` and their profile-controlled services are configured for the required ports. The recommended approach is to use FQDNs with AAAA records rather than raw IPv6 addresses in SAP configuration, ensuring compatibility across SAP components and client tools.
