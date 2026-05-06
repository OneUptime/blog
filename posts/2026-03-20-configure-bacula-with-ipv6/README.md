# How to Configure Bacula with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bacula, IPv6, Backup, Disaster Recovery, Linux, Enterprise Backup

Description: Configure Bacula backup system to use IPv6 for backup director, storage daemon, and file daemon communications across IPv6 networks.

---

Bacula's backup workflow uses three main daemons: the Director (DIR), Storage Daemon (SD), and File Daemon (FD). All three can be configured to communicate over IPv6.

## Bacula IPv6 Architecture

```text
Director (bacula-dir)         Storage Daemon (bacula-sd)
2001:db8::1                  [2001:db8::2]:9103
     │                                ▲
     ├──────────── controls ──────────┘
     └──────────── controls ───────► [2001:db8::10]:9102
                                      File Daemon (bacula-fd)

bconsole ───────────────────────────► [2001:db8::1]:9101
Backup data path: File Daemon at 2001:db8::10 ───────► [2001:db8::2]:9103
```

## Configuring the Bacula Director for IPv6

```bash
# Relevant IPv6-related excerpts from /etc/bacula/bacula-dir.conf

Director {
  Name = backup-dir
  # Listen for console connections on the Director's IPv6 address
  DirAddresses = {
    ipv6 = { addr = 2001:db8::1; port = 9101; }
  }
  QueryFile = "/etc/bacula/scripts/query.sql"
  WorkingDirectory = /var/spool/bacula
  PidDirectory = /var/run/bacula
  Maximum Concurrent Jobs = 20
  Password = "DirectorPassword"
}

# Storage daemon connection

Storage {
  Name = backup-sd
  # Storage daemon IPv6 address
  Address = 2001:db8::2
  SDPort = 9103
  Password = "StoragePassword"
  Device = FileStorage
  Media Type = File
}

# Client (file daemon) connection
Client {
  Name = webserver-fd
  # File daemon IPv6 address
  Address = 2001:db8::10
  FDPort = 9102
  Catalog = MyCatalog
  Password = "ClientPassword"
  File Retention = 60 days
  Job Retention = 6 months
}
```

## Configuring the Bacula Storage Daemon for IPv6

```bash
# Relevant IPv6-related excerpts from /etc/bacula/bacula-sd.conf

Storage {
  Name = backup-sd
  # Listen for Director and File Daemon connections on IPv6
  SDAddresses {
    ipv6 = { addr = 2001:db8::2; port = 9103; }
    # Also listen on IPv4 if needed:
    # ipv4 = { addr = 192.168.1.2; port = 9103; }
  }
  WorkingDirectory = /var/spool/bacula
  PidDirectory = /var/run/bacula
  Maximum Concurrent Jobs = 20
}

Director {
  Name = backup-dir
  Password = "StoragePassword"
}

Device {
  Name = FileStorage
  Device Type = File
  Media Type = File
  Archive Device = /backup/bacula
  LabelMedia = yes
  Random Access = Yes
  AutomaticMount = yes
  RemovableMedia = no
  AlwaysOpen = no
}
```

## Configuring the Bacula File Daemon (Client) for IPv6

```bash
# Relevant IPv6-related excerpts from /etc/bacula/bacula-fd.conf (on each client)

FileDaemon {
  Name = webserver-fd
  # Listen on the client's IPv6 address
  FDAddresses {
    ipv6 = { addr = 2001:db8::10; port = 9102; }
  }
  WorkingDirectory = /var/spool/bacula
  PidDirectory = /var/run/bacula
}

# Allow the Director to connect
Director {
  Name = backup-dir
  Password = "ClientPassword"
}
```

## Defining Jobs for IPv6 Clients

```bash
# /etc/bacula/bacula-dir.conf (job section)

JobDefs {
  Name = "DefaultIPv6Job"
  Type = Backup
  Level = Incremental
  FileSet = "FullSet"
  Schedule = "WeeklyCycle"
  Storage = backup-sd
  Messages = Standard
  SpoolAttributes = yes
  Priority = 10
  Write Bootstrap = "/var/spool/bacula/%c.bsr"
}

Job {
  Name = "WebServerBackup"
  JobDefs = "DefaultIPv6Job"
  # The Client resource above points to the File Daemon's IPv6 address
  Client = webserver-fd
  Pool = Weekly
}
```

## Firewall Rules for Bacula over IPv6

```bash
# Open Bacula ports for IPv6 on the appropriate hosts
# Director host, if bconsole connects remotely
sudo ip6tables -A INPUT -p tcp --dport 9101 -j ACCEPT

# File Daemon host (on clients)
sudo ip6tables -A INPUT -p tcp --dport 9102 -j ACCEPT

# Storage Daemon host
sudo ip6tables -A INPUT -p tcp --dport 9103 -j ACCEPT

# Save rules on systems that use iptables-persistent
sudo ip6tables-save > /etc/ip6tables/rules.v6
```

## Testing Bacula IPv6 Connectivity

```bash
# Test Storage Daemon configuration syntax
sudo bacula-sd -t -c /etc/bacula/bacula-sd.conf

# Test Director configuration syntax
sudo bacula-dir -t -c /etc/bacula/bacula-dir.conf

# From bconsole, query the File Daemon over IPv6
echo "status client=webserver-fd" | bconsole

# Run a test backup
# Add "yes" to skip the interactive confirmation prompt
echo "run job=WebServerBackup level=Full yes" | bconsole

# View pending console messages
echo "messages" | bconsole
```

Bacula's configurable address binding in each daemon component enables full IPv6 communication between the Director, Storage Daemon, and File Daemons for enterprise backup operations on IPv6 networks.
