# Validation Summary: How to Conduct Network Penetration Testing on Ubuntu

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Ubuntu package management
- Nmap and Nmap Scripting Engine
- DNS reconnaissance with dig and dnsrecon
- Masscan
- SMB, SNMP, RPC, LDAP, and web enumeration tools
- Nikto and Gobuster
- sqlmap
- testssl.sh
- Metasploit Framework
- SearchSploit / Exploit Database
- Hydra credential testing
- Python virtual environments
- Bash reporting and cleanup commands

## Sources Consulted
- Nmap Reference Guide, Host Discovery: https://nmap.org/book/man-host-discovery.html
- Nmap NSE documentation for rdp-vuln-ms12-020: https://nmap.org/nsedoc/scripts/rdp-vuln-ms12-020.html
- Nmap NSE documentation for smb-vuln-ms17-010: https://nmap.org/nsedoc/scripts/smb-vuln-ms17-010.html
- Rapid7 Metasploit Framework installation documentation: https://help.rapid7.com/metasploit/Content/installation-and-updates/installing-msf.html
- Rapid7 Metasploit documentation for running modules and RHOSTS: https://docs.metasploit.com/docs/using-metasploit/basics/using-metasploit.html
- Gobuster official README: https://github.com/OJ/gobuster
- sqlmap official usage wiki: https://github.com/sqlmapproject/sqlmap/wiki/Usage
- testssl.sh official README: https://github.com/testssl/testssl.sh
- Python venv documentation: https://docs.python.org/3/library/venv.html
- Debian dnsrecon package file list: https://packages.debian.org/sid/all/dnsrecon/filelist
- Debian onesixtyone package file list: https://packages.debian.org/bookworm/arm64/onesixtyone/filelist
- Debian testssl.sh package file list: https://packages.debian.org/trixie-backports/all/testssl.sh/filelist
- Hydra tool documentation: https://www.kali.org/tools/hydra/
- OffSec SearchSploit documentation: https://www.exploit-db.com/documentation/Offsec-SearchSploit.pdf

## Issues Found
- The setup command used `sudo apt install metasploit-framework`, which is not available from the standard Ubuntu repositories checked in this environment. Replaced it with Rapid7's official Linux installer command.
- The Python virtual environment was created under `/opt/pentesting`, which normally fails for a non-root user. Changed it to `~/pentesting` and added `python3-venv` to the package installation list.
- The post later used `testssl` and SearchSploit without installing the required tooling. Added `testssl.sh` and `git` to the setup dependencies, and replaced the unavailable `sudo apt install exploitdb` command with the documented git-based SearchSploit installation flow.
- The `nmap -sL` comment said "no packets sent", but Nmap still performs reverse DNS queries by default. Clarified that no probes are sent to target hosts.
- The reconnaissance section described the DNS examples as passive and as not directly interacting with the network, but DNS queries, zone-transfer attempts, and DNS brute forcing are active interactions with DNS infrastructure. Reworded the section and DNS comment to avoid calling those steps passive.
- The dnsrecon brute-force example referenced `/usr/share/wordlists/subdomains.txt`, which is not the packaged dnsrecon wordlist path. Updated it to the packaged dnsrecon subdomain wordlist path.
- The Gobuster example used a dirb wordlist without installing the `dirb` package that provides it. Updated the install command to include `dirb`.
- The RDP vulnerability check was labeled as BlueKeep CVE-2019-0708, but `rdp-vuln-ms12-020` checks MS12-020 vulnerabilities. Corrected the label to MS12-020.
- Hydra examples referenced `/usr/share/wordlists/rockyou.txt`, which is not present on a default Ubuntu setup from the package list. Changed those examples to use the already referenced `/tmp/passwords.txt` test list.

## Review Notes
The commands are syntactically valid examples for an authorized lab or engagement, but several are intentionally intrusive or potentially disruptive, including vulnerability NSE scripts, password testing, exploitation, and post-exploitation enumeration. The post already includes authorization warnings; future revisions could add operational cautions about rate limits, account lockout policies, and production change windows.
