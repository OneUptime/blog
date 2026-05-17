# Validation Summary: How to Use snmpwalk to Query Server Metrics on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- net-snmp tools (snmpwalk, snmpget, snmpbulkwalk)
- SNMP v1, v2c, v3 protocols
- Ubuntu package management (apt)
- Standard MIBs: SNMPv2-MIB, UCD-SNMP-MIB, HOST-RESOURCES-MIB, IF-MIB, NET-SNMP-MIB
- Bash scripting

## Sources Consulted
- net-snmp project documentation: http://www.net-snmp.org/docs/man/
- snmpcmd(1) manpage for shared SNMP command options
- snmpwalk(1), snmpget(1), snmpbulkwalk(1) manpages
- Ubuntu package documentation for `snmp` and `snmp-mibs-downloader`
- RFC 3418 (SNMPv2-MIB / system group), RFC 2863 (IF-MIB)
- UCD-SNMP-MIB definitions (memory, load, CPU, disk OIDs)
- HOST-RESOURCES-MIB (RFC 2790) for hrStorage/hrSWRun objects

## Issues Found
No technical issues found.

Verified items:
- Package names `snmp` and `snmp-mibs-downloader` are correct for Ubuntu.
- `download-mibs` command and the `mibs +ALL` directive in `/etc/snmp/snmp.conf` are accurate.
- All snmpwalk/snmpget/snmpbulkwalk command-line flags (`-v`, `-c`, `-u`, `-l`, `-a`, `-A`, `-x`, `-X`, `-O*`, `-Cr`) match the net-snmp manpages.
- OID names referenced (sysDescr, sysObjectID, sysUpTime, sysContact, sysName, sysLocation, ssCpuUser/System/Idle, laLoad, laTable, systemStats, memTotalReal, memAvailReal, memTotalFree, memShared, memBuffer, memCached, memTotalSwap, memAvailSwap, hrStorage(Table), dskTable/dskPath/dskTotal/dskAvail/dskUsed/dskPercent, ifTable, ifDescr, ifSpeed, ifInOctets/ifOutOctets, ifHCInOctets/ifHCOutOctets, ifInErrors/ifOutErrors, ifOperStatus, hrSWRunTable/hrSWRunName/hrSWRunPerfCPU/hrSWRunPerfMem, prTable) all exist in their respective MIBs.
- The numeric OID `.1.3.6.1.2.1.1.1.0` correctly maps to `SNMPv2-MIB::sysDescr.0`.
- 32-bit vs 64-bit interface counter guidance (use ifHC* for gigabit+ to avoid wrap) is correct per RFC 2863.
- `ifSpeed` units (bits per second) and `ifOperStatus` enum values (1=up, 2=down) are correct per IF-MIB.
- SNMPv3 authPriv example with SHA auth + AES privacy is syntactically correct.
- `snmpbulkwalk -Cr` for setting max-repetitions and the documented default of 10 are correct.
- The example sysObjectID output `NET-SNMP-MIB::netSnmpAgentOIDs.10` is the correct value the net-snmp Linux agent reports.
- laLoad index ordering (1=1min, 2=5min, 3=15min) used in the bash script is correct.

## Review Notes
- On modern Ubuntu releases (20.04+), `snmp-mibs-downloader` lives in the `multiverse` repository (due to MIB licensing). Some users may need to enable multiverse with `sudo add-apt-repository multiverse` before `apt install` succeeds. The post does not mention this, but it is a minor environment caveat rather than a technical inaccuracy.
- `ifOperStatus` actually has seven enum values per RFC 2863 (up, down, testing, unknown, dormant, notPresent, lowerLayerDown); the post only mentions 1=up/2=down, which is sufficient for the inline comment but readers in unusual environments may see other values.
- Walking `HOST-RESOURCES-MIB::hrSWRunTable` and `UCD-SNMP-MIB::dskTable` requires corresponding snmpd configuration (the post notes this for dskTable but not hrSWRunTable — host resources is included by default in most distros' snmpd, so this is not an error).
- The `download-mibs` step is technically already triggered by the package's postinst on Ubuntu, but running it again is harmless and ensures the MIBs are present.
