# How to Configure Bareos with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bareos, IPv6, Backup, Disaster Recovery, Linux, Open Source Backup

Description: Configure Bareos backup software to communicate between Director, Storage Daemon, and File Daemon over IPv6, enabling modern backup operations on IPv6 networks.

---

Bareos (Backup Archiving Recovery Open Sourced) is a fork of Bacula with modern improvements. It supports IPv6 natively and provides configuration options for binding each daemon to specific IPv6 addresses.

## Bareos Architecture Overview

```text
bareos-dir (Director)    bareos-sd (Storage)    bareos-fd (File Daemon)
Port 9101                Port 9103              Port 9102
Manages jobs             Stores backups         Runs on clients
```

## Installing Bareos

```bash
# Director/Storage server on RHEL/CentOS

sudo dnf install bareos bareos-database-postgresql -y

# Director/Storage server on Ubuntu/Debian
sudo apt install bareos bareos-database-postgresql -y

# Remote client machines
sudo dnf install bareos-filedaemon -y
sudo apt install bareos-filedaemon -y

# Debian/Ubuntu can initialize the catalog during package install via dbconfig-common.
# If the catalog was not created during install, initialize PostgreSQL manually:
su postgres -c /usr/lib/bareos/scripts/create_bareos_database
su postgres -c /usr/lib/bareos/scripts/make_bareos_tables
su postgres -c /usr/lib/bareos/scripts/grant_bareos_privileges
```

## Configuring Bareos Director for IPv6

```ini
# /etc/bareos/bareos-dir.conf or /etc/bareos/bareos-dir.d/director/bareos-dir.conf

Director {
  Name = bareos-dir
  # Bind to specific IPv6 address for console connections
  DirAddress = 2001:db8::1
  DIRPort = 9101
  QueryFile = "/usr/lib/bareos/scripts/query.sql"
  WorkingDirectory = /var/lib/bareos
  PidDirectory = /run/bareos
  Maximum Concurrent Jobs = 100
  Password = "DirectorPassword"  # Must match bconsole.conf or a Console resource
  Messages = Daemon
}

# /etc/bareos/bareos-dir.d/storage/File.conf
Storage {
  Name = File
  Address = 2001:db8::2
  Port = 9103
  Password = "StoragePassword"
  Device = FileStorage
  Media Type = File
}
```

## Configuring Storage Daemon for IPv6

```ini
# /etc/bareos/bareos-sd.d/storage/bareos-sd.conf

Storage {
  Name = bareos-sd
  # Listen on IPv6
  SDAddress = 2001:db8::2
  SDPort = 9103
  WorkingDirectory = /var/lib/bareos
  PidDirectory = /run/bareos
}

# /etc/bareos/bareos-sd.d/director/bareos-dir.conf
Director {
  Name = bareos-dir
  Password = "StoragePassword"
}

# /etc/bareos/bareos-sd.d/device/FileStorage.conf
Device {
  Name = FileStorage
  Device Type = File
  Media Type = File
  Archive Device = /var/lib/bareos/storage
  LabelMedia = yes
  Random Access = Yes
  AutomaticMount = yes
  RemovableMedia = no
  AlwaysOpen = no
}
```

## Configuring File Daemon (Client) for IPv6

```ini
# /etc/bareos/bareos-fd.conf (on client machines)

FileDaemon {
  Name = webserver-fd
  # Bind to the client's IPv6 address
  FDAddress = 2001:db8::10
  FDPort = 9102
  WorkingDirectory = /var/lib/bareos
  PidDirectory = /run/bareos
}

# Allow the Director to connect
Director {
  Name = bareos-dir
  Password = "FDPassword"
}
```

## Configuring Director-to-Client Connection

```ini
# /etc/bareos/bareos-dir.d/client/webserver-fd.conf

Client {
  Name = webserver-fd
  # IPv6 address of the client
  Address = 2001:db8::10
  FDPort = 9102
  Password = "FDPassword"
  # Retention periods
  File Retention = 60 Days
  Job Retention = 12 Months
  AutoPrune = yes
}
```

## Defining Jobs and FileSets

```ini
# /etc/bareos/bareos-dir.d/job/webserver-backup.conf

Job {
  Name = "WebServerBackup"
  Type = Backup
  Level = Incremental
  Client = webserver-fd
  FileSet = "LinuxAll"
  Schedule = "WeeklyCycle"
  Storage = File
  Pool = Incremental
  Messages = Standard
  Priority = 10
  Write Bootstrap = /var/lib/bareos/webserver-fd.bsr
}

# /etc/bareos/bareos-dir.d/fileset/linux-all.conf
FileSet {
  Name = "LinuxAll"
  Include {
    Options {
      Signature = MD5
      Compression = LZO
    }
    File = /
    File = /var/www
  }
  Exclude {
    File = /proc
    File = /sys
    File = /tmp
  }
}
```

## Starting Bareos Services

```bash
# Debian/Ubuntu: Director and Storage host
sudo systemctl enable --now bareos-director
sudo systemctl enable --now bareos-storage

# Debian/Ubuntu: each client
sudo systemctl enable --now bareos-filedaemon

# RPM-based distributions: Director and Storage host
sudo systemctl enable --now bareos-dir
sudo systemctl enable --now bareos-sd

# RPM-based distributions: each client
sudo systemctl enable --now bareos-fd

# Check the listening IPv6 sockets on each host
sudo ss -tlpn6 | grep -E ':9101|:9102|:9103'

# Verify director can communicate with storage and client
echo "status dir" | sudo bconsole
echo "status storage=File" | sudo bconsole
echo "status client=webserver-fd" | sudo bconsole
```

## Running a Test Backup over IPv6

```bash
# Start the Bareos console
sudo bconsole

# In bconsole:
# run job=WebServerBackup level=Full
# yes
# messages

# Monitor the job
# status dir
# list jobs
```

## Firewall Rules for Bareos IPv6

```bash
# On Director server
sudo ip6tables -A INPUT -p tcp --dport 9101 -j ACCEPT

# On Storage Daemon server
sudo ip6tables -A INPUT -p tcp --dport 9103 -j ACCEPT

# On each client
sudo ip6tables -A INPUT -p tcp --dport 9102 -j ACCEPT

# Persist on Debian/Ubuntu systems using iptables-persistent
sudo ip6tables-save > /etc/ip6tables/rules.v6
```

Bareos's per-daemon address binding configuration makes it straightforward to deploy backup infrastructure over IPv6, with each component independently configurable for specific IPv6 addresses or all-interface listening.
