# How to Set Up OSSEC HIDS on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, OSSEC, HIDS, Intrusion Detection, Security, Tutorial

Description: Complete guide to installing and configuring OSSEC Host-based Intrusion Detection System on Ubuntu.

---

## Introduction

Security is paramount in today's interconnected world, and detecting intrusions early can mean the difference between a minor incident and a catastrophic breach. OSSEC (Open Source Security Event Correlator) is a powerful, open-source Host-based Intrusion Detection System (HIDS) that provides comprehensive monitoring, log analysis, file integrity checking, and active response capabilities.

In this comprehensive guide, we will walk through the complete process of setting up OSSEC HIDS on Ubuntu, from understanding the core concepts to advanced configuration options.

## Understanding OSSEC and HIDS Concepts

### What is HIDS?

A Host-based Intrusion Detection System (HIDS) monitors and analyzes the internals of a computing system rather than network traffic. Unlike Network-based Intrusion Detection Systems (NIDS), HIDS operates on individual hosts and can detect:

- File modifications and integrity violations
- Suspicious log entries
- Rootkit presence
- Policy violations
- Unauthorized access attempts

### What is OSSEC?

OSSEC is a scalable, multi-platform, open-source HIDS that combines several security functions:

1. **Log Analysis**: Real-time analysis of system logs for suspicious patterns
2. **File Integrity Monitoring**: Detection of unauthorized file changes
3. **Rootkit Detection**: Scanning for known rootkits and system anomalies
4. **Active Response**: Automated responses to detected threats
5. **Alerting**: Notification system for security events

### Key Benefits of OSSEC

- **Open Source**: Free to use with active community support
- **Cross-Platform**: Supports Linux, Windows, macOS, and more
- **Scalable**: Suitable for single hosts to thousands of endpoints
- **Real-time**: Immediate detection and response capabilities
- **Compliance**: Helps meet PCI-DSS, HIPAA, and other compliance requirements

## OSSEC Components and Architecture

OSSEC can be deployed in three different modes, each suited for different use cases:

### 1. Server (Manager)

The central component that:
- Receives and analyzes data from agents
- Stores rules, decoders, and configuration
- Generates alerts and notifications
- Manages active responses

### 2. Agent

Lightweight component installed on monitored systems that:
- Collects logs and system information
- Monitors file integrity
- Reports to the server
- Executes active responses

### 3. Local (Standalone)

A single installation that:
- Monitors only the local system
- Does not communicate with other OSSEC installations
- Ideal for single-server deployments

### 4. Hybrid

Combines server and agent functionality:
- Acts as an agent to another server
- Can also manage its own agents
- Useful for distributed architectures

## Prerequisites

Before installing OSSEC, ensure your Ubuntu system meets these requirements:

```bash
# Update your system
sudo apt update && sudo apt upgrade -y

# Install required dependencies
sudo apt install -y build-essential gcc make unzip wget \
    libpcre2-dev zlib1g-dev libssl-dev libevent-dev \
    libsystemd-dev

# For email notifications (optional)
sudo apt install -y sendmail
```

## Installing OSSEC Server

### Step 1: Download OSSEC

```bash
# Create a directory for OSSEC installation files
mkdir -p ~/ossec-install && cd ~/ossec-install

# Download the latest OSSEC release (check for newest version)
wget https://github.com/ossec/ossec-hids/archive/refs/tags/3.7.0.tar.gz

# Extract the archive
tar -xzf 3.7.0.tar.gz

# Navigate to the extracted directory
cd ossec-hids-3.7.0
```

### Step 2: Run the Installation Script

```bash
# Start the installation
sudo ./install.sh
```

During installation, you will be prompted with several questions. Here is a typical server installation:

```
** Para instalacao em Portugues, escolha [br].
** For installation in English, choose [en].
(en/br/cn/de/el/es/fr/hu/it/jp/nl/pl/ru/sr/tr) [en]: en

OSSEC HIDS v3.7.0 Installation Script

What kind of installation do you want (server, agent, local, hybrid or help)? server

Choose where to install the OSSEC HIDS [/var/ossec]: /var/ossec

Do you want e-mail notification? (y/n) [y]: y
  - What's your e-mail address? admin@example.com
  - What's your SMTP server ip/host? localhost

Do you want to run the integrity check daemon? (y/n) [y]: y

Do you want to run the rootkit detection engine? (y/n) [y]: y

Do you want to enable active response? (y/n) [y]: y

Do you want to enable the firewall-drop response? (y/n) [y]: y

Do you want to add more IPs to the white list? (y/n)? [n]: y
  - IPs (space separated): 192.168.1.0/24 10.0.0.0/8

Do you want to enable remote syslog (port 514 udp)? (y/n) [y]: y
```

### Step 3: Start OSSEC

```bash
# Start the OSSEC service
sudo /var/ossec/bin/ossec-control start

# Verify all processes are running
sudo /var/ossec/bin/ossec-control status
```

Expected output:
```
ossec-monitord is running...
ossec-logcollector is running...
ossec-remoted is running...
ossec-syscheckd is running...
ossec-analysisd is running...
ossec-maild is running...
ossec-execd is running...
```

### Step 4: Enable OSSEC at Boot

```bash
# Create systemd service file
sudo tee /etc/systemd/system/ossec.service << 'EOF'
[Unit]
Description=OSSEC Host-based Intrusion Detection System
After=network.target

[Service]
Type=forking
ExecStart=/var/ossec/bin/ossec-control start
ExecStop=/var/ossec/bin/ossec-control stop
ExecReload=/var/ossec/bin/ossec-control reload
PIDFile=/var/ossec/var/run/ossec-analysisd.pid
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl daemon-reload
sudo systemctl enable ossec
```

## Installing OSSEC Agents

Agents are installed on systems you want to monitor. They report to the OSSEC server.

### On the Agent System

```bash
# Download and extract OSSEC (same as server)
mkdir -p ~/ossec-install && cd ~/ossec-install
wget https://github.com/ossec/ossec-hids/archive/refs/tags/3.7.0.tar.gz
tar -xzf 3.7.0.tar.gz
cd ossec-hids-3.7.0

# Install dependencies
sudo apt install -y build-essential gcc make libpcre2-dev zlib1g-dev libssl-dev

# Run installation
sudo ./install.sh
```

Choose `agent` when prompted:

```
What kind of installation do you want (server, agent, local, hybrid or help)? agent

What's the IP Address or hostname of the OSSEC HIDS server?: 192.168.1.100

Do you want to run the integrity check daemon? (y/n) [y]: y

Do you want to run the rootkit detection engine? (y/n) [y]: y

Do you want to enable active response? (y/n) [y]: y
```

### Registering Agents with the Server

#### Method 1: Using manage_agents (Manual)

On the **server**:

```bash
# Run the agent management tool
sudo /var/ossec/bin/manage_agents

# Choose (A) to add an agent
# Enter agent name, IP, and ID
```

Example session:
```
****************************************
* OSSEC HIDS v3.7.0 Agent manager.     *
****************************************

(A)dd an agent (A).
(E)xtract key for an agent (E).
(L)ist already added agents (L).
(R)emove an agent (R).
(Q)uit.

Choose your action: A,E,L,R or Q: A

- Adding a new agent (use '\q' to return to the main menu).
  Please provide the following:
   * A name for the new agent: webserver01
   * The IP Address of the new agent: 192.168.1.50
   * An ID for the new agent[001]: 001

Agent information:
   ID:001
   Name:webserver01
   IP Address:192.168.1.50

Confirm adding it?(y/n): y
Agent added.
```

Extract the key:
```
Choose your action: A,E,L,R or Q: E

Available agents:
   ID: 001, Name: webserver01, IP: 192.168.1.50
Provide the ID of the agent to extract the key (or '\q' to quit): 001

Agent key information for '001' is:
MDAxIHdlYnNlcnZlcjAxIDE5Mi4xNjguMS41MCAyYzM0ZTU2Nzg5...
```

On the **agent**:

```bash
# Import the key
sudo /var/ossec/bin/manage_agents

# Choose (I) to import key
# Paste the key from the server
```

#### Method 2: Using ossec-authd (Automatic)

On the **server**:

```bash
# Generate SSL certificates for authentication
sudo /var/ossec/bin/ossec-authd -p 1515 &
```

On the **agent**:

```bash
# Register with the server
sudo /var/ossec/bin/agent-auth -m 192.168.1.100 -p 1515
```

### Start the Agent

```bash
# Start OSSEC agent
sudo /var/ossec/bin/ossec-control start

# Verify connection (check server logs)
sudo tail -f /var/ossec/logs/ossec.log
```

## ossec.conf Configuration

The main configuration file is located at `/var/ossec/etc/ossec.conf`. Here is a comprehensive, well-commented configuration:

```xml
<!-- /var/ossec/etc/ossec.conf - OSSEC Server Configuration -->
<ossec_config>

  <!--
    Global Settings
    ===============
    Configure general OSSEC behavior including email notifications
    and alert levels.
  -->
  <global>
    <!-- Email notification settings -->
    <email_notification>yes</email_notification>

    <!-- Primary email recipient for all alerts -->
    <email_to>security@example.com</email_to>

    <!-- SMTP server for sending emails -->
    <smtp_server>localhost</smtp_server>

    <!-- Sender email address -->
    <email_from>ossec@example.com</email_from>

    <!-- Maximum emails per hour (prevents flooding) -->
    <email_maxperhour>12</email_maxperhour>

    <!--
      Alert level for email notifications
      Levels: 0-16 (higher = more severe)
      Recommended: 7+ for email to reduce noise
    -->
    <email_alert_level>7</email_alert_level>

    <!-- White list trusted IP addresses -->
    <white_list>127.0.0.1</white_list>
    <white_list>192.168.1.0/24</white_list>
    <white_list>10.0.0.0/8</white_list>

    <!-- Log alert level (minimum level to log) -->
    <logall>no</logall>
    <logall_json>no</logall_json>

    <!--
      Memory size for event correlation
      Increase for high-volume environments
    -->
    <memory_size>8192</memory_size>

    <!--
      Host information cache
      Number of hosts to cache for correlation
    -->
    <host_information>8192</host_information>

    <!-- Statistics interval in seconds -->
    <stats>0</stats>

    <!-- Integrity checking alerts level -->
    <integrity>8</integrity>

    <!-- Rootcheck alerts level -->
    <rootcheck>8</rootcheck>
  </global>

  <!--
    Alert Configuration
    ===================
    Define how alerts are generated and stored.
  -->
  <alerts>
    <!-- Minimum alert level to log (0-16) -->
    <log_alert_level>1</log_alert_level>

    <!-- Minimum alert level for email notifications -->
    <email_alert_level>7</email_alert_level>
  </alerts>

  <!--
    Remote Syslog Configuration
    ===========================
    Accept logs from remote systems via syslog.
  -->
  <remote>
    <!-- Connection type: secure (for agents) or syslog -->
    <connection>secure</connection>

    <!-- Port for agent connections -->
    <port>1514</port>

    <!-- Protocol: tcp or udp -->
    <protocol>tcp</protocol>

    <!--
      Allowed IP addresses (CIDR notation supported)
      Restrict which IPs can send logs
    -->
    <allowed-ips>192.168.1.0/24</allowed-ips>
    <allowed-ips>10.0.0.0/8</allowed-ips>

    <!-- Local IP to bind to (optional) -->
    <!-- <local_ip>192.168.1.100</local_ip> -->
  </remote>

  <!--
    Syslog Output
    =============
    Forward OSSEC alerts to external syslog servers (SIEM integration).
  -->
  <syslog_output>
    <server>192.168.1.200</server>
    <port>514</port>
    <level>7</level>
    <format>default</format>
  </syslog_output>

  <!--
    Rules Configuration
    ===================
    Include rule files for log analysis.
  -->
  <rules>
    <!-- Base rules (always include) -->
    <include>rules_config.xml</include>
    <include>pam_rules.xml</include>
    <include>sshd_rules.xml</include>
    <include>syslog_rules.xml</include>
    <include>arpwatch_rules.xml</include>
    <include>symantec-av_rules.xml</include>
    <include>symantec-ws_rules.xml</include>
    <include>pix_rules.xml</include>
    <include>named_rules.xml</include>
    <include>smbd_rules.xml</include>
    <include>vsftpd_rules.xml</include>
    <include>pure-ftpd_rules.xml</include>
    <include>proftpd_rules.xml</include>
    <include>ms_ftpd_rules.xml</include>
    <include>ftpd_rules.xml</include>
    <include>hordeimp_rules.xml</include>
    <include>roundcube_rules.xml</include>
    <include>wordpress_rules.xml</include>
    <include>cimserver_rules.xml</include>
    <include>vpopmail_rules.xml</include>
    <include>vmpop3d_rules.xml</include>
    <include>courier_rules.xml</include>
    <include>web_rules.xml</include>
    <include>web_appsec_rules.xml</include>
    <include>apache_rules.xml</include>
    <include>nginx_rules.xml</include>
    <include>php_rules.xml</include>
    <include>mysql_rules.xml</include>
    <include>postgresql_rules.xml</include>
    <include>ids_rules.xml</include>
    <include>squid_rules.xml</include>
    <include>firewall_rules.xml</include>
    <include>apparmor_rules.xml</include>
    <include>cisco-ios_rules.xml</include>
    <include>netscreenfw_rules.xml</include>
    <include>sonicwall_rules.xml</include>
    <include>postfix_rules.xml</include>
    <include>sendmail_rules.xml</include>
    <include>imapd_rules.xml</include>
    <include>mailscanner_rules.xml</include>
    <include>dovecot_rules.xml</include>
    <include>ms-exchange_rules.xml</include>
    <include>racoon_rules.xml</include>
    <include>vpn_concentrator_rules.xml</include>
    <include>spamd_rules.xml</include>
    <include>msauth_rules.xml</include>
    <include>mcafee_av_rules.xml</include>
    <include>trend-osce_rules.xml</include>
    <include>ossec_rules.xml</include>
    <include>attack_rules.xml</include>
    <include>openbsd_rules.xml</include>
    <include>clam_av_rules.xml</include>
    <include>dropbear_rules.xml</include>
    <include>sysmon_rules.xml</include>
    <include>auditd_rules.xml</include>
    <include>sudo_rules.xml</include>

    <!-- Local custom rules (always include last) -->
    <include>local_rules.xml</include>
  </rules>

  <!--
    File Integrity Monitoring (Syscheck)
    ====================================
    Monitor files and directories for unauthorized changes.
  -->
  <syscheck>
    <!--
      Frequency of integrity checks in seconds
      86400 = daily (recommended for most environments)
      3600 = hourly (for high-security environments)
    -->
    <frequency>86400</frequency>

    <!--
      Skip check on OSSEC start
      Set to 'yes' to avoid alerts during service restart
    -->
    <skip_nfs>yes</skip_nfs>
    <scan_on_start>yes</scan_on_start>

    <!--
      Alert on new files
      Detect when new files are created in monitored directories
    -->
    <alert_new_files>yes</alert_new_files>

    <!--
      Auto ignore files that change frequently
      Reduces noise from legitimate frequent changes
    -->
    <auto_ignore frequency="10" timeframe="3600">yes</auto_ignore>

    <!--
      Directories to monitor
      =====================
      Options:
        check_all: Enable all checks (default)
        check_sum: Check file checksums
        check_sha1sum: Use SHA1 for checksums
        check_sha256sum: Use SHA256 for checksums (recommended)
        check_size: Check file size changes
        check_owner: Check file ownership
        check_group: Check file group
        check_perm: Check file permissions
        check_mtime: Check modification time
        check_inode: Check inode changes
        realtime: Enable real-time monitoring (Linux only)
        report_changes: Report actual content changes
        restrict: Restrict to specific file patterns
    -->

    <!-- Critical system binaries -->
    <directories check_all="yes" realtime="yes">/bin,/sbin</directories>
    <directories check_all="yes" realtime="yes">/usr/bin,/usr/sbin</directories>
    <directories check_all="yes">/usr/local/bin,/usr/local/sbin</directories>

    <!-- System configuration files -->
    <directories check_all="yes" realtime="yes" report_changes="yes">/etc</directories>

    <!-- Boot files -->
    <directories check_all="yes">/boot</directories>

    <!-- Library directories -->
    <directories check_all="yes">/lib,/lib64</directories>
    <directories check_all="yes">/usr/lib</directories>

    <!-- Root user directory -->
    <directories check_all="yes" realtime="yes">/root</directories>

    <!-- Web server directories (adjust paths as needed) -->
    <directories check_all="yes" realtime="yes" report_changes="yes">/var/www</directories>

    <!-- Monitor specific sensitive files -->
    <directories check_all="yes" realtime="yes">/etc/passwd</directories>
    <directories check_all="yes" realtime="yes">/etc/shadow</directories>
    <directories check_all="yes" realtime="yes">/etc/group</directories>
    <directories check_all="yes" realtime="yes">/etc/sudoers</directories>
    <directories check_all="yes" realtime="yes">/etc/ssh/sshd_config</directories>

    <!--
      Files and directories to ignore
      ==============================
      Exclude frequently changing files to reduce noise
    -->
    <ignore>/etc/mtab</ignore>
    <ignore>/etc/hosts.deny</ignore>
    <ignore>/etc/mail/statistics</ignore>
    <ignore>/etc/random-seed</ignore>
    <ignore>/etc/random.seed</ignore>
    <ignore>/etc/adjtime</ignore>
    <ignore>/etc/prelink.cache</ignore>
    <ignore>/etc/dnf</ignore>
    <ignore>/etc/cups/certs</ignore>
    <ignore>/etc/cups/subscriptions.conf</ignore>
    <ignore>/etc/resolv.conf</ignore>

    <!-- Ignore log files and temp directories -->
    <ignore>/var/log</ignore>
    <ignore>/tmp</ignore>
    <ignore>/var/tmp</ignore>
    <ignore>/var/cache</ignore>

    <!-- Ignore package manager databases -->
    <ignore>/var/lib/apt</ignore>
    <ignore>/var/lib/dpkg</ignore>
    <ignore>/var/lib/rpm</ignore>

    <!-- Ignore proc and sys filesystems -->
    <ignore>/proc</ignore>
    <ignore>/sys</ignore>
    <ignore>/dev</ignore>

    <!--
      Ignore files matching regex patterns
    -->
    <ignore type="sregex">.log$</ignore>
    <ignore type="sregex">.swp$</ignore>
    <ignore type="sregex">.bak$</ignore>
    <ignore type="sregex">~$</ignore>

    <!--
      nodiff - Files to not show content differences
      Useful for files with sensitive content
    -->
    <nodiff>/etc/ssl/private</nodiff>
    <nodiff>/etc/shadow</nodiff>
  </syscheck>

  <!--
    Rootcheck Configuration
    =======================
    Detect rootkits and system anomalies.
  -->
  <rootcheck>
    <!-- Enable rootcheck -->
    <disabled>no</disabled>

    <!-- Check for rootkits using signature database -->
    <rootkit_files>/var/ossec/etc/shared/rootkit_files.txt</rootkit_files>
    <rootkit_trojans>/var/ossec/etc/shared/rootkit_trojans.txt</rootkit_trojans>

    <!-- Check for known Windows malware (useful for agents) -->
    <windows_malware>/var/ossec/etc/shared/win_malware_rcl.txt</windows_malware>
    <windows_audit>/var/ossec/etc/shared/win_audit_rcl.txt</windows_audit>
    <windows_apps>/var/ossec/etc/shared/win_applications_rcl.txt</windows_apps>

    <!-- System audit policies -->
    <system_audit>/var/ossec/etc/shared/system_audit_rcl.txt</system_audit>
    <system_audit>/var/ossec/etc/shared/cis_debian_linux_rcl.txt</system_audit>
    <system_audit>/var/ossec/etc/shared/cis_rhel_linux_rcl.txt</system_audit>
    <system_audit>/var/ossec/etc/shared/cis_ubuntu_linux_rcl.txt</system_audit>

    <!-- Frequency of rootcheck scans (in seconds) -->
    <frequency>36000</frequency>

    <!-- Skip check on start -->
    <skip_nfs>yes</skip_nfs>
  </rootcheck>

  <!--
    Log Collection (Localfile)
    =========================
    Define which log files to monitor and analyze.
  -->

  <!-- System logs -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/syslog</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/auth.log</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/dpkg.log</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/kern.log</location>
  </localfile>

  <!-- Apache logs -->
  <localfile>
    <log_format>apache</log_format>
    <location>/var/log/apache2/access.log</location>
  </localfile>

  <localfile>
    <log_format>apache</log_format>
    <location>/var/log/apache2/error.log</location>
  </localfile>

  <!-- Nginx logs -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/nginx/access.log</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/nginx/error.log</location>
  </localfile>

  <!-- MySQL logs -->
  <localfile>
    <log_format>mysql_log</log_format>
    <location>/var/log/mysql/error.log</location>
  </localfile>

  <!-- PostgreSQL logs -->
  <localfile>
    <log_format>postgresql_log</log_format>
    <location>/var/log/postgresql/postgresql-*-main.log</location>
  </localfile>

  <!-- Audit daemon logs -->
  <localfile>
    <log_format>audit</log_format>
    <location>/var/log/audit/audit.log</location>
  </localfile>

  <!-- Command monitoring -->
  <localfile>
    <log_format>command</log_format>
    <command>df -P</command>
    <frequency>360</frequency>
  </localfile>

  <localfile>
    <log_format>full_command</log_format>
    <command>netstat -tulpn | sed 's/\s\+/ /g' | sort</command>
    <frequency>360</frequency>
  </localfile>

  <localfile>
    <log_format>full_command</log_format>
    <command>last -n 20</command>
    <frequency>360</frequency>
  </localfile>

  <!--
    Active Response Configuration
    =============================
    Define automated responses to detected threats.
  -->

  <!--
    Define available response commands
  -->
  <command>
    <name>host-deny</name>
    <executable>host-deny.sh</executable>
    <expect>srcip</expect>
    <timeout_allowed>yes</timeout_allowed>
  </command>

  <command>
    <name>firewall-drop</name>
    <executable>firewall-drop.sh</executable>
    <expect>srcip</expect>
    <timeout_allowed>yes</timeout_allowed>
  </command>

  <command>
    <name>disable-account</name>
    <executable>disable-account.sh</executable>
    <expect>user</expect>
    <timeout_allowed>yes</timeout_allowed>
  </command>

  <command>
    <name>restart-ossec</name>
    <executable>restart-ossec.sh</executable>
    <expect></expect>
  </command>

  <command>
    <name>route-null</name>
    <executable>route-null.sh</executable>
    <expect>srcip</expect>
    <timeout_allowed>yes</timeout_allowed>
  </command>

  <!--
    Active Response Rules
    ====================
    Define when to execute response commands.
  -->

  <!--
    Block brute force SSH attacks
    Rule 5712 = SSH brute force detected
  -->
  <active-response>
    <command>firewall-drop</command>
    <location>local</location>
    <rules_id>5712</rules_id>
    <timeout>600</timeout>
  </active-response>

  <!--
    Block hosts with multiple authentication failures
    Rule 100100 = Authentication failures
  -->
  <active-response>
    <command>host-deny</command>
    <location>local</location>
    <level>7</level>
    <timeout>600</timeout>
    <repeated_offenders>30,60,120</repeated_offenders>
  </active-response>

  <!--
    Drop traffic from IPs attempting SQL injection
    Rule 31103-31110 = SQL injection attempts
  -->
  <active-response>
    <command>firewall-drop</command>
    <location>local</location>
    <rules_group>sql_injection</rules_group>
    <timeout>3600</timeout>
  </active-response>

  <!--
    Disable accounts with suspicious activity
    Custom rule for brute force with valid username
  -->
  <active-response>
    <disabled>yes</disabled>
    <command>disable-account</command>
    <location>local</location>
    <rules_id>120100</rules_id>
    <timeout>86400</timeout>
  </active-response>

</ossec_config>
```

## Log Analysis and Decoders

OSSEC uses decoders to parse log messages and extract relevant information. Decoders are defined in XML files located in `/var/ossec/etc/decoders/`.

### Understanding Decoders

Decoders work in a hierarchical manner:
1. **Parent decoder**: Identifies the log source
2. **Child decoder**: Extracts specific fields

### Creating Custom Decoders

Create custom decoders in `/var/ossec/etc/decoders/local_decoder.xml`:

```xml
<!-- /var/ossec/etc/decoders/local_decoder.xml -->

<!--
  Custom decoder for application logs
  Format: [TIMESTAMP] LEVEL: MESSAGE - USER: username IP: ip_address
-->
<decoder name="myapp">
  <program_name>myapp</program_name>
</decoder>

<decoder name="myapp-auth">
  <parent>myapp</parent>
  <prematch>AUTH:</prematch>
  <regex>AUTH: (\S+) from (\S+)</regex>
  <order>user, srcip</order>
</decoder>

<decoder name="myapp-error">
  <parent>myapp</parent>
  <prematch>ERROR:</prematch>
  <regex>ERROR: (.+)</regex>
  <order>message</order>
</decoder>

<!--
  Decoder for custom web application
  Format: ACCESS - IP=192.168.1.1 USER=admin ACTION=login STATUS=success
-->
<decoder name="webapp">
  <program_name>webapp</program_name>
</decoder>

<decoder name="webapp-access">
  <parent>webapp</parent>
  <prematch>ACCESS -</prematch>
  <regex>IP=(\S+) USER=(\S+) ACTION=(\S+) STATUS=(\S+)</regex>
  <order>srcip, user, action, status</order>
</decoder>

<!--
  Decoder for JSON formatted logs
-->
<decoder name="json-app">
  <program_name>json-app</program_name>
  <prematch>^{</prematch>
</decoder>

<decoder name="json-app-child">
  <parent>json-app</parent>
  <plugin_decoder>JSON_Decoder</plugin_decoder>
</decoder>
```

### Testing Decoders

Use `ossec-logtest` to test your decoders:

```bash
sudo /var/ossec/bin/ossec-logtest
```

Enter a sample log line:
```
Jan 15 10:30:00 myserver myapp: AUTH: admin from 192.168.1.50
```

Expected output:
```
**Phase 1: Completed pre-decoding.
       full event: 'Jan 15 10:30:00 myserver myapp: AUTH: admin from 192.168.1.50'
       hostname: 'myserver'
       program_name: 'myapp'

**Phase 2: Completed decoding.
       decoder: 'myapp-auth'
       user: 'admin'
       srcip: '192.168.1.50'
```

## Alert Levels and Rules

OSSEC rules determine what generates alerts and at what severity level. Rules are stored in `/var/ossec/rules/`.

### Alert Levels

| Level | Description | Example |
|-------|-------------|---------|
| 0 | Ignored | System noise |
| 1 | None | |
| 2 | System low priority | Normal activity |
| 3 | Successful/Authorized | Successful login |
| 4 | System low priority | Error messages |
| 5 | User generated | Invalid login |
| 6 | Low relevance | Disk space warnings |
| 7 | "Bad word" match | Error keyword found |
| 8 | First time seen | New process/user |
| 9 | Error from invalid source | Attack attempt |
| 10 | Multiple user errors | Multiple failed logins |
| 11 | Integrity checking | File changed |
| 12 | High importance | System state changed |
| 13 | Unusual error | Unusual behavior |
| 14 | High importance security | Multiple attacks |
| 15 | Severe attack | Successful attack |
| 16 | Maximum severity | Critical security breach |

### Creating Custom Rules

Create custom rules in `/var/ossec/rules/local_rules.xml`:

```xml
<!-- /var/ossec/rules/local_rules.xml -->

<group name="local,custom,">

  <!--
    Custom rule: Detect admin user login
    Triggered when admin user successfully logs in
    Level 10 ensures email notification
  -->
  <rule id="100001" level="10">
    <if_sid>5501</if_sid>
    <user>admin|root</user>
    <description>Admin user login detected</description>
    <group>authentication,admin,</group>
  </rule>

  <!--
    Custom rule: Detect after-hours login
    Time-based detection (outside business hours)
  -->
  <rule id="100002" level="12">
    <if_sid>5501</if_sid>
    <time>6 pm - 6 am</time>
    <description>Login detected outside business hours</description>
    <group>authentication,after_hours,</group>
  </rule>

  <!--
    Custom rule: Multiple failed sudo attempts
    Correlates multiple failed sudo attempts from same user
  -->
  <rule id="100003" level="13" frequency="5" timeframe="120">
    <if_matched_sid>5401</if_matched_sid>
    <same_user />
    <description>Multiple failed sudo attempts by same user</description>
    <group>authentication,sudo,</group>
  </rule>

  <!--
    Custom rule: Web application attacks
    Detect SQL injection attempts
  -->
  <rule id="100010" level="12">
    <if_sid>31101</if_sid>
    <url>admin|login|user</url>
    <description>SQL injection attempt on sensitive URL</description>
    <group>attack,sql_injection,web,</group>
  </rule>

  <!--
    Custom rule: Detect large file downloads
    Monitor for data exfiltration
  -->
  <rule id="100020" level="8">
    <if_sid>31100</if_sid>
    <regex>GET.*\.zip|GET.*\.tar|GET.*\.sql</regex>
    <description>Large file download detected</description>
    <group>web,download,</group>
  </rule>

  <!--
    Custom rule: Configuration file modification
    High-priority alert for critical config changes
  -->
  <rule id="100030" level="14">
    <if_sid>550</if_sid>
    <match>/etc/passwd|/etc/shadow|/etc/sudoers|/etc/ssh/sshd_config</match>
    <description>Critical system configuration file modified</description>
    <group>syscheck,config,critical,</group>
  </rule>

  <!--
    Custom rule: New user created
    Detect unauthorized user creation
  -->
  <rule id="100040" level="10">
    <if_sid>5902</if_sid>
    <description>New user account created</description>
    <group>authentication,account_change,</group>
  </rule>

  <!--
    Custom rule: Service stopped
    Alert when critical services stop
  -->
  <rule id="100050" level="12">
    <match>Stopped|stopped|STOPPED</match>
    <match>apache2|nginx|mysql|postgresql|sshd</match>
    <description>Critical service stopped</description>
    <group>service,availability,</group>
  </rule>

  <!--
    Composite rule: Potential breach
    Multiple high-severity events in short timeframe
  -->
  <rule id="100100" level="15" frequency="3" timeframe="300">
    <if_matched_group>attack</if_matched_group>
    <same_source_ip />
    <description>Potential security breach - Multiple attack patterns from same source</description>
    <group>attack,breach,critical,</group>
  </rule>

</group>
```

### Verifying Rules

Test rules with `ossec-logtest`:

```bash
sudo /var/ossec/bin/ossec-logtest

# Enter log line:
Jan 15 22:30:00 server sshd[12345]: Accepted password for admin from 192.168.1.50 port 22 ssh2
```

## Email Notifications

Configure email notifications for timely alert delivery.

### Basic Email Configuration

Ensure the global settings in `ossec.conf` are correct:

```xml
<global>
  <email_notification>yes</email_notification>
  <email_to>security@example.com</email_to>
  <smtp_server>smtp.example.com</smtp_server>
  <email_from>ossec@example.com</email_from>
  <email_maxperhour>12</email_maxperhour>
</global>
```

### Granular Email Alerts

Create specific email alerts for different scenarios:

```xml
<!-- Send critical alerts to security team -->
<email_alerts>
  <email_to>security-critical@example.com</email_to>
  <level>12</level>
  <do_not_delay />
  <do_not_group />
</email_alerts>

<!-- Send web attack alerts to web team -->
<email_alerts>
  <email_to>webteam@example.com</email_to>
  <rule_id>31100,31101,31102,31103</rule_id>
  <group>web,attack,</group>
</email_alerts>

<!-- Send authentication alerts to sysadmin -->
<email_alerts>
  <email_to>sysadmin@example.com</email_to>
  <group>authentication,</group>
  <level>7</level>
</email_alerts>

<!-- Daily summary to management -->
<email_alerts>
  <email_to>management@example.com</email_to>
  <format>sms</format>
  <level>10</level>
</email_alerts>
```

### Testing Email

```bash
# Test email configuration
sudo /var/ossec/bin/ossec-maild -t

# Check mail queue
sudo /var/ossec/bin/ossec-logtest

# View mail logs
sudo tail -f /var/ossec/logs/ossec.log | grep mail
```

## Web UI Setup (Optional)

OSSEC provides an optional web interface for viewing alerts and managing the system.

### Installing OSSEC Web UI

```bash
# Install web server and dependencies
sudo apt install -y apache2 php php-cli libapache2-mod-php

# Download OSSEC WUI
cd /var/www/html
sudo git clone https://github.com/ossec/ossec-wui.git ossec

# Set permissions
sudo /var/www/html/ossec/setup.sh
```

During setup:
```
Setting up ossec ui...

Username: admin
Password: ********
Confirm Password: ********

Enter your OSSEC install directory path (e.g., /var/ossec): /var/ossec

Setup completed successfully.
```

### Configure Apache

```bash
# Create Apache configuration
sudo tee /etc/apache2/sites-available/ossec.conf << 'EOF'
<VirtualHost *:80>
    ServerName ossec.example.com
    DocumentRoot /var/www/html/ossec

    <Directory /var/www/html/ossec>
        Options FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Enable authentication
    <Location />
        AuthType Basic
        AuthName "OSSEC Web UI"
        AuthUserFile /etc/apache2/.ossec_htpasswd
        Require valid-user
    </Location>

    ErrorLog ${APACHE_LOG_DIR}/ossec_error.log
    CustomLog ${APACHE_LOG_DIR}/ossec_access.log combined
</VirtualHost>
EOF

# Create password file
sudo htpasswd -c /etc/apache2/.ossec_htpasswd admin

# Enable site and modules
sudo a2ensite ossec.conf
sudo a2enmod rewrite

# Add www-data to ossec group
sudo usermod -aG ossec www-data

# Restart Apache
sudo systemctl restart apache2
```

### Secure the Web UI with HTTPS

```bash
# Enable SSL
sudo a2enmod ssl
sudo a2ensite default-ssl

# Or use Let's Encrypt
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d ossec.example.com
```

## Agent Management

Managing agents effectively is crucial for a scalable OSSEC deployment.

### Adding Agents

```bash
# On the server
sudo /var/ossec/bin/manage_agents

# Interactive menu:
# (A)dd, (E)xtract key, (L)ist, (R)emove, (Q)uit
```

### Bulk Agent Management Script

```bash
#!/bin/bash
# /var/ossec/scripts/add_agents.sh
# Bulk add agents from a CSV file

CSV_FILE="$1"
MANAGE_AGENTS="/var/ossec/bin/manage_agents"

if [ -z "$CSV_FILE" ]; then
    echo "Usage: $0 agents.csv"
    echo "CSV format: name,ip_address,id"
    exit 1
fi

while IFS=',' read -r name ip id; do
    # Skip header or empty lines
    [[ "$name" == "name" ]] && continue
    [[ -z "$name" ]] && continue

    echo "Adding agent: $name ($ip) with ID $id"

    # Add the agent
    echo -e "A\n$name\n$ip\n$id\ny\n" | sudo $MANAGE_AGENTS > /dev/null

    # Extract and save the key
    key=$(echo -e "E\n$id\n" | sudo $MANAGE_AGENTS | grep "Agent key information" -A1 | tail -1)
    echo "$id,$name,$ip,$key" >> /var/ossec/etc/agent_keys_export.csv

done < "$CSV_FILE"

echo "Agent addition complete. Keys exported to /var/ossec/etc/agent_keys_export.csv"

# Restart OSSEC to apply changes
sudo /var/ossec/bin/ossec-control restart
```

### Monitoring Agent Status

```bash
# List all agents and their status
sudo /var/ossec/bin/agent_control -l

# Get detailed info for specific agent
sudo /var/ossec/bin/agent_control -i 001

# Check active agents
sudo /var/ossec/bin/agent_control -lc

# Check disconnected agents
sudo /var/ossec/bin/agent_control -ln
```

### Agent Status Monitoring Script

```bash
#!/bin/bash
# /var/ossec/scripts/check_agents.sh
# Monitor agent connectivity and alert on disconnections

AGENT_CONTROL="/var/ossec/bin/agent_control"
ALERT_EMAIL="admin@example.com"
LOG_FILE="/var/ossec/logs/agent_monitor.log"

# Get disconnected agents
disconnected=$($AGENT_CONTROL -ln 2>/dev/null)

if [ -n "$disconnected" ]; then
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Log the event
    echo "[$timestamp] Disconnected agents detected:" >> $LOG_FILE
    echo "$disconnected" >> $LOG_FILE

    # Send alert email
    echo "The following OSSEC agents are currently disconnected:

$disconnected

Please investigate the connectivity issues.

Server: $(hostname)
Time: $timestamp" | mail -s "OSSEC Alert: Disconnected Agents" $ALERT_EMAIL

    # Output for cron logging
    echo "[$timestamp] Alert sent for disconnected agents"
fi
```

Add to crontab:
```bash
# Check agent status every 5 minutes
*/5 * * * * /var/ossec/scripts/check_agents.sh
```

### Remote Agent Configuration

Push configuration to agents using `agent.conf`:

```xml
<!-- /var/ossec/etc/shared/agent.conf -->
<agent_config>
  <!-- Configuration for all agents -->

  <!-- Additional log files to monitor -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/application.log</location>
  </localfile>

  <!-- Syscheck configuration -->
  <syscheck>
    <frequency>43200</frequency>
    <directories check_all="yes">/opt/application</directories>
  </syscheck>
</agent_config>

<agent_config os="Linux" name="webserver">
  <!-- Configuration specific to webserver agents -->
  <localfile>
    <log_format>apache</log_format>
    <location>/var/log/httpd/access_log</location>
  </localfile>
</agent_config>

<agent_config os="Linux" profile="database">
  <!-- Configuration for database servers -->
  <localfile>
    <log_format>mysql_log</log_format>
    <location>/var/log/mysql/mysql.log</location>
  </localfile>
</agent_config>
```

## Troubleshooting

### Common Issues and Solutions

#### 1. OSSEC Won't Start

```bash
# Check for configuration errors
sudo /var/ossec/bin/ossec-logtest -t

# View detailed error messages
sudo cat /var/ossec/logs/ossec.log

# Check permissions
sudo ls -la /var/ossec/

# Verify all files exist
sudo /var/ossec/bin/ossec-control status
```

#### 2. Agents Not Connecting

```bash
# On the server - check remoted is running
sudo /var/ossec/bin/ossec-control status | grep remoted

# Check firewall rules
sudo iptables -L -n | grep 1514
sudo ufw status | grep 1514

# Verify agent key exists
sudo cat /var/ossec/etc/client.keys

# Check agent logs
sudo tail -f /var/ossec/logs/ossec.log

# Test connectivity from agent
nc -zv server_ip 1514
```

#### 3. No Alerts Being Generated

```bash
# Test log analysis
sudo /var/ossec/bin/ossec-logtest

# Check if analysisd is processing
sudo tail -f /var/ossec/logs/ossec.log | grep analysisd

# Verify rules are loaded
sudo /var/ossec/bin/ossec-logtest -t

# Check alert files
sudo ls -la /var/ossec/logs/alerts/
sudo tail -f /var/ossec/logs/alerts/alerts.log
```

#### 4. Email Notifications Not Working

```bash
# Test sendmail
echo "Test email from OSSEC" | mail -s "Test" admin@example.com

# Check mail queue
sudo mailq

# Verify OSSEC mail configuration
sudo grep -A 10 "<global>" /var/ossec/etc/ossec.conf

# Check maild process
sudo /var/ossec/bin/ossec-control status | grep maild

# View mail logs
sudo tail -f /var/log/mail.log
```

#### 5. High CPU Usage

```bash
# Check which process is consuming resources
sudo top -p $(pgrep -d',' -f ossec)

# Reduce syscheck frequency
# Edit ossec.conf: <frequency>86400</frequency>

# Disable realtime monitoring for large directories
# Remove realtime="yes" from high-volume directories

# Increase auto_ignore threshold
# <auto_ignore frequency="10" timeframe="3600">yes</auto_ignore>
```

#### 6. Disk Space Issues

```bash
# Check OSSEC disk usage
sudo du -sh /var/ossec/*

# Clean old alerts (keep last 30 days)
sudo find /var/ossec/logs/alerts -type f -mtime +30 -delete

# Rotate logs
sudo /var/ossec/bin/ossec-control rotate

# Configure log rotation
sudo tee /etc/logrotate.d/ossec << 'EOF'
/var/ossec/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 660 root ossec
    postrotate
        /var/ossec/bin/ossec-control reload
    endscript
}
EOF
```

### Diagnostic Commands

```bash
# Full system diagnostic
sudo /var/ossec/bin/ossec-control debug

# Check database integrity
sudo /var/ossec/bin/syscheck_control -u

# List all rules
sudo /var/ossec/bin/ossec-logtest -t 2>&1 | grep "rule"

# View decoded events
sudo /var/ossec/bin/ossec-logtest -a

# Check active responses
sudo /var/ossec/bin/ossec-control status
sudo cat /var/ossec/active-response/active-responses.log
```

### Log Files Reference

| Log File | Description |
|----------|-------------|
| `/var/ossec/logs/ossec.log` | Main OSSEC log |
| `/var/ossec/logs/alerts/alerts.log` | Alert log |
| `/var/ossec/logs/alerts/alerts.json` | JSON formatted alerts |
| `/var/ossec/logs/active-responses.log` | Active response log |
| `/var/ossec/logs/firewall/firewall.log` | Firewall events |
| `/var/ossec/queue/ossec/queue` | Event queue |
| `/var/ossec/queue/alerts/` | Alert queue |

## Best Practices

### Security Recommendations

1. **Limit Server Access**: Restrict SSH and web UI access to specific IPs
2. **Use Strong Authentication**: Implement key-based SSH and strong passwords
3. **Regular Updates**: Keep OSSEC and system packages updated
4. **Backup Configuration**: Regularly backup `/var/ossec/etc/`
5. **Monitor the Monitor**: Set up external monitoring for OSSEC itself
6. **Test Active Responses**: Verify active responses work correctly in test environment
7. **Review Rules Regularly**: Tune rules to reduce false positives

### Performance Optimization

1. **Adjust Syscheck Frequency**: Balance security needs with system resources
2. **Use Ignore Lists**: Exclude frequently changing files from monitoring
3. **Limit Real-time Monitoring**: Only use for critical directories
4. **Optimize Log Collection**: Only monitor necessary log files
5. **Use Agent Groups**: Apply specific configurations to agent groups

### Maintenance Tasks

```bash
# Weekly maintenance script
#!/bin/bash
# /var/ossec/scripts/weekly_maintenance.sh

# Rotate logs
/var/ossec/bin/ossec-control rotate

# Update rulesets
cd /var/ossec/
./update_ruleset.sh

# Check for disconnected agents
/var/ossec/bin/agent_control -ln

# Verify syscheck database
/var/ossec/bin/syscheck_control -u

# Clear temporary files
find /var/ossec/tmp -type f -mtime +7 -delete

# Generate weekly report
/var/ossec/bin/ossec-reportd -f weekly
```

## Integrating with OneUptime

While OSSEC provides excellent host-based intrusion detection, comprehensive infrastructure monitoring requires a unified platform. **OneUptime** complements OSSEC by providing:

- **Unified Dashboard**: Aggregate OSSEC alerts alongside application performance metrics, uptime monitoring, and infrastructure health in a single pane of glass
- **Advanced Alerting**: Intelligent alert routing with escalation policies, on-call schedules, and multi-channel notifications (Slack, PagerDuty, email, SMS)
- **Incident Management**: Correlate OSSEC security events with system incidents for faster root cause analysis
- **Status Pages**: Communicate security incidents to stakeholders through integrated status pages
- **SLA Monitoring**: Track security response times and compliance metrics

To integrate OSSEC with OneUptime:

1. Configure OSSEC to forward alerts via syslog to OneUptime's log ingestion endpoint
2. Create custom monitors in OneUptime to track OSSEC agent connectivity
3. Set up alert rules to escalate critical security events

Visit [OneUptime](https://oneuptime.com) to learn more about unified monitoring and incident management for your infrastructure.

## Conclusion

OSSEC HIDS provides a robust foundation for host-based security monitoring on Ubuntu systems. By following this guide, you have learned to:

- Install and configure OSSEC server and agents
- Set up comprehensive file integrity monitoring
- Create custom rules and decoders for your environment
- Configure active responses for automated threat mitigation
- Manage agents at scale
- Troubleshoot common issues

Remember that security is an ongoing process. Regularly review your OSSEC configuration, update rules, and monitor for new threats to maintain a strong security posture.

## Additional Resources

- [OSSEC Official Documentation](https://www.ossec.net/docs/)
- [OSSEC GitHub Repository](https://github.com/ossec/ossec-hids)
- [OSSEC Rules Database](https://www.ossec.net/docs/manual/rules-decoders/index.html)
- [Ubuntu Security Guide](https://ubuntu.com/security)
- [OneUptime Documentation](https://oneuptime.com/docs)
