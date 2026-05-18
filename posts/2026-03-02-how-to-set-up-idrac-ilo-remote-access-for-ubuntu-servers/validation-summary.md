# Validation Summary: How to Set Up iDRAC/iLO Remote Access for Ubuntu Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dell iDRAC (Integrated Dell Remote Access Controller)
- Dell racadm CLI / OpenManage Server Administrator (OMSA)
- HPE iLO 4 / iLO 5 (Integrated Lights-Out)
- HPE hponcfg / RIBCL XML
- HPE python-ilorest-library
- Redfish REST API
- Ubuntu (focal / 20.04 packaging)

## Sources Consulted
- HPE iLO 5/6 Scripting and Command Line Guide (support.hpe.com, doc IDs a00018323en_us, sd00002199en_us) — hponcfg flags
- HPE Software Delivery Repository project page (downloads.linux.hpe.com/SDR/project/mcp/) — package names
- Dell iDRAC9 RACADM CLI Reference Guide (Dell support manual) — `racadm update`, set/get syntax
- Dell KB 000133536 and iDRAC9 Security Configuration Guide — default password behavior on modern PowerEdge
- linux.dell.com/repo/community/openmanage/ directory listing — repository paths
- Dell KB 000178045 (Redfish API with iDRAC); HPE iLO Redfish API Reference (hewlettpackard.github.io/ilo-rest-api-docs) — Redfish resource IDs

## Issues Found
1. **`hponcfg -g -f /tmp/file.xml` was incorrect.** The `-g` flag prints brief host info (it is `--get_hostinfo`), and `-f` reads/applies a config file. To write the current iLO config to a file the correct flag is `-w filename`. Replaced with `sudo hponcfg -w /tmp/current_ilo_config.xml` and added an inline comment about `-w`/`-f` direction.
2. **`ilo-utilities` package does not exist in the HPE SDR MCP repo.** Replaced with `hponcfg`. Also added a comment noting that `hp-health` is Gen9-and-earlier only — Gen10+ servers use `amsd` (Agentless Management Service) since health/SNMP moved into iLO itself.
3. **`racadm update -f iDRAC_Firmware.exe -l /tmp/` misused `-l`.** The `-l` flag specifies a remote network share (CIFS/NFS/HTTP(S)/FTP), not a local path. Replaced with the correct local form `racadm update -f /tmp/iDRAC_Firmware.exe` and added an example of the proper remote form with a share path and credentials.
4. **Default credentials `root/calvin` are outdated for modern iDRAC.** Since 14th-generation PowerEdge / iDRAC 9, each unit ships with a unique factory-generated password printed on the pull-out Service Tag unless `calvin` was explicitly requested at order time. Expanded the credentials note to cover both cases.
5. **OpenManage repository path `openmanage/960/focal` does not exist.** Dell never published a `960` directory; the 9.x line tops out at `950`, and the current line is `1001`. Corrected to `950/focal`.
6. **Misleading `IDRAC_HOST` variable in the iLO RESTful API example.** Renamed to `ILO_HOST` in the iLO section for clarity.
7. **Redfish section comment "Works for both iDRAC and iLO" was misleading.** The base URL is reachable on both, but the resource IDs differ: Dell uses named instances (`System.Embedded.1`), HPE uses numeric IDs (`1`). Updated the comment to note this and suggest discovering the actual resource via `/redfish/v1/Systems` rather than hard-coding.

## Review Notes
- The post uses `apt-key add`, which is deprecated in Ubuntu 22.04+ in favor of placing a dearmored key in `/etc/apt/keyrings/` and referencing it from `signed-by=` in the sources.list entry. Both Dell and HPE documentation still reference `apt-key`, so this was left as-is, but readers on Jammy or Noble should expect deprecation warnings.
- The Dell repository URL still points to `focal` (20.04). Newer Ubuntu releases (jammy, noble) are not yet directly published in the OMSA community repo at the time of writing; the focal packages generally still work via compatibility.
- OMSA has been declared End-of-Life by Dell (community support continues through 2027). For new deployments, the recommendation is increasingly to use Redfish directly rather than installing OMSA on the host.
- The Redfish power-reset example for iDRAC uses `ComputerSystem.Reset` without a trailing slash; both forms are accepted but the iLO example uses a trailing slash. Either works.
- The RIBCL XML, racadm `serveraction` verbs, and Redfish JSON payloads are all valid as written.
