# How to Configure RADIUS IPv6 Accounting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RADIUS, IPv6, Accounting, FreeRADIUS, AAA, Session Management, SQL

Description: Configure RADIUS accounting for IPv6 subscribers including session tracking, IPv6 attribute logging, interim updates, and usage reporting with FreeRADIUS and SQL.

## RADIUS Accounting Overview

RADIUS accounting tracks subscriber sessions with three packet types:
- **Acct-Status-Type = Start**: session begins, IPv6 prefix assigned
- **Acct-Status-Type = Interim-Update**: periodic usage update
- **Acct-Status-Type = Stop**: session ends, final byte counts

IPv6 accounting extends this with additional attributes to log the assigned IPv6 prefix.

## Accounting Attributes for IPv6 Sessions

```text
Typical Accounting-Request (Start) with IPv6:

  Acct-Status-Type:       Start
  User-Name:              alice
  NAS-IPv6-Address:       2001:db8:0:1::1
  NAS-Port:               100
  Framed-IPv6-Prefix:     2001:db8:1::/64
  Delegated-IPv6-Prefix:  2001:db8:100::/56
  Acct-Session-Id:        5e8a1f00-00000001
  Event-Timestamp:        1709000000
```

## FreeRADIUS: SQL Accounting with IPv6

```sql
-- Current FreeRADIUS 3.0 MySQL schema already includes
-- framedipv6prefix and delegatedipv6prefix.
-- Add NAS IPv6 storage only if you want to persist
-- NAS-IPv6-Address separately.
ALTER TABLE radacct
    ADD COLUMN nasipv6address VARCHAR(45) DEFAULT NULL;

CREATE INDEX idx_nasipv6address ON radacct(nasipv6address);
```

```sql
# /etc/freeradius/3.0/mods-config/sql/main/mysql/queries.conf

# Stock FreeRADIUS 3.0 MySQL queries already store
# Framed-IPv6-Address, Framed-IPv6-Prefix, and Delegated-IPv6-Prefix.
# If you add a custom nasipv6address column, add it to column_list and
# populate it from %{NAS-IPv6-Address} in your INSERT/UPDATE statements.

column_list = "\
    acctsessionid, acctuniqueid, username, realm, nasipaddress, \
    nasportid, nasporttype, acctstarttime, acctupdatetime, \
    acctstoptime, acctsessiontime, acctauthentic, connectinfo_start, \
    connectinfo_stop, acctinputoctets, acctoutputoctets, \
    calledstationid, callingstationid, acctterminatecause, servicetype, \
    framedprotocol, framedipaddress, framedipv6address, framedipv6prefix, \
    framedinterfaceid, delegatedipv6prefix, class"

interim-update {
    query = "\
        UPDATE ${....acct_table1} \
        SET acctupdatetime = (@acctupdatetime_old:=acctupdatetime), \
            acctupdatetime = ${....event_timestamp}, \
            acctinterval = ${....event_timestamp_epoch} - UNIX_TIMESTAMP(@acctupdatetime_old), \
            framedipv6address = '%{Framed-IPv6-Address}', \
            framedipv6prefix = '%{Framed-IPv6-Prefix}', \
            framedinterfaceid = '%{Framed-Interface-Id}', \
            delegatedipv6prefix = '%{Delegated-IPv6-Prefix}', \
            acctinputoctets = '%{%{Acct-Input-Gigawords}:-0}' << 32 | '%{%{Acct-Input-Octets}:-0}', \
            acctoutputoctets = '%{%{Acct-Output-Gigawords}:-0}' << 32 | '%{%{Acct-Output-Octets}:-0}' \
        WHERE AcctUniqueId = '%{Acct-Unique-Session-Id}'"
}
```

## FreeRADIUS: Detail File Accounting

```text
# /etc/freeradius/3.0/mods-enabled/detail
# Log accounting detail records; IPv6 attributes are written with the rest of the packet

detail {
    # Use the packet source address for per-client detail files
    filename = ${radacctdir}/%{%{Packet-Src-IP-Address}:-%{Packet-Src-IPv6-Address}}/detail-%Y%m%d

    permissions = 0600
    locking = yes

    # Also log packet src/dst IP/port
    log_packet_header = yes
}
```

## Accounting Start/Interim/Stop Testing

```bash
# Test accounting Start
radclient -x -6 [2001:db8::10]:1813 acct testing123 << 'EOF'
Acct-Status-Type = Start
User-Name = "alice"
NAS-IPv6-Address = "2001:db8:0:1::1"
NAS-Port = 100
Acct-Session-Id = "test-session-001"
Framed-IPv6-Prefix = "2001:db8:1::/64"
Delegated-IPv6-Prefix = "2001:db8:100::/56"
Acct-Authentic = RADIUS
Event-Timestamp = 1709000000
EOF

# Test Interim-Update (with byte counts)
radclient -x -6 [2001:db8::10]:1813 acct testing123 << 'EOF'
Acct-Status-Type = Interim-Update
User-Name = "alice"
NAS-IPv6-Address = "2001:db8:0:1::1"
Acct-Session-Id = "test-session-001"
Framed-IPv6-Prefix = "2001:db8:1::/64"
Acct-Input-Octets = 1073741824
Acct-Output-Octets = 1073741824
Acct-Input-Gigawords = 0
Acct-Output-Gigawords = 1
Acct-Session-Time = 3600
EOF

# Test Accounting Stop
radclient -x -6 [2001:db8::10]:1813 acct testing123 << 'EOF'
Acct-Status-Type = Stop
User-Name = "alice"
NAS-IPv6-Address = "2001:db8:0:1::1"
Acct-Session-Id = "test-session-001"
Acct-Session-Time = 7200
Acct-Input-Octets = 2147483648
Acct-Input-Gigawords = 0
Acct-Output-Octets = 2147483648
Acct-Output-Gigawords = 2
Acct-Terminate-Cause = User-Request
EOF
```

## Usage Reporting Queries

```sql
-- Session totals per IPv6 subscriber by start day
SELECT
    username,
    framedipv6prefix,
    delegatedipv6prefix,
    DATE(acctstarttime) AS date,
    SUM(COALESCE(acctinputoctets, 0) + COALESCE(acctoutputoctets, 0)) AS total_bytes,
    SUM(COALESCE(acctsessiontime, 0)) AS total_seconds,
    COUNT(*) AS sessions
FROM radacct
WHERE framedipv6prefix IS NOT NULL
  AND acctstarttime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY username, framedipv6prefix, delegatedipv6prefix, DATE(acctstarttime)
ORDER BY username, date;

-- Top IPv6 bandwidth users by total session bytes, limited to sessions updated in the last 24h
SELECT
    username,
    framedipv6prefix,
    SUM(COALESCE(acctinputoctets, 0) + COALESCE(acctoutputoctets, 0)) / (1024*1024*1024) AS total_gb
FROM radacct
WHERE COALESCE(acctupdatetime, acctstarttime) > DATE_SUB(NOW(), INTERVAL 24 HOUR)
  AND framedipv6prefix IS NOT NULL
GROUP BY username, framedipv6prefix
ORDER BY total_gb DESC
LIMIT 10;
```

## Detecting Accounting Gaps

```bash
#!/bin/bash
# Find sessions missing Stop records (potential accounting gaps)

mysql -u radius -p"${MYSQL_PASS}" -s radius << 'EOF'
-- Sessions older than 2h with no Stop and no accounting update in the last 30 minutes
SELECT
    username,
    framedipv6prefix,
    nasipaddress,
    acctstarttime,
    TIMESTAMPDIFF(HOUR, acctstarttime, NOW()) AS hours_open,
    COALESCE(acctinputoctets, 0) + COALESCE(acctoutputoctets, 0) AS bytes
FROM radacct
WHERE acctstoptime IS NULL
  AND acctstarttime < DATE_SUB(NOW(), INTERVAL 2 HOUR)
  AND COALESCE(acctupdatetime, acctstarttime) < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
ORDER BY acctstarttime;
EOF
```

## Cisco NAS: Accounting Configuration

```text
! Cisco BNG - enable RADIUS accounting

aaa accounting network default start-stop group RADIUS_GRP

! Interim updates every 10 minutes
aaa accounting update periodic 10

! On platforms with AAA over IPv6 support, Framed-IPv6-Prefix and
! Delegated-IPv6-Prefix can be sent as standard RADIUS attributes when applicable.

! Verify accounting is being sent
debug radius accounting
show aaa servers
```

## Conclusion

RADIUS IPv6 accounting captures session details including `Framed-IPv6-Prefix` and `Delegated-IPv6-Prefix` in Accounting-Request packets. In FreeRADIUS 3.0, the stock MySQL schema and queries already store `framedipv6prefix` and `delegatedipv6prefix`; add a custom `nasipv6address` column only if you also want to persist `NAS-IPv6-Address` separately. Test with `radclient` sending accounting packets to UDP port 1813. Remember that RADIUS octet counters are 32-bit, so Interim-Update and Stop packets need `Acct-Input-Gigawords` and `Acct-Output-Gigawords` when counters wrap; the stock FreeRADIUS 3.0 MySQL queries fold those values into 64-bit `acctinputoctets` and `acctoutputoctets`. Monitor for accounting gaps with `acctupdatetime` on sessions that have not yet received a Stop record.
