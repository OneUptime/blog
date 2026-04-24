# How to Create CIFS/SMB Volumes in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, SMB, Storage

Description: Learn how to mount Windows CIFS/SMB network shares as Docker volumes in Portainer for cross-platform file sharing.

## Introduction

CIFS (Common Internet File System) / SMB (Server Message Block) is the protocol used by Windows file shares and Samba. Mounting SMB shares as Docker volumes allows containers to access files on Windows servers, NAS devices, or any Samba server. This is particularly useful in hybrid environments where Linux containers need to interact with Windows-based file storage.

## Prerequisites

- Portainer with a connected Docker environment (Linux host)
- An accessible CIFS/SMB share (Windows Server, Samba, NAS, etc.)
- `cifs-utils` installed on the Docker host

## Step 1: Install CIFS Utilities on Docker Host

```bash
# Ubuntu/Debian:

sudo apt-get install -y cifs-utils

# CentOS/RHEL:
sudo yum install -y cifs-utils

# Alpine:
apk add --no-cache cifs-utils
```

## Step 2: Test SMB Connectivity Manually

Before creating a Docker volume, test the SMB share manually:

```bash
# Create a mount point:
sudo mkdir /mnt/test-smb

# Manual mount test:
sudo mount -t cifs //smb-server.example.com/sharename /mnt/test-smb \
  -o username=myuser,password=mypassword,vers=3.0,uid=1000,gid=1000

# Verify access:
ls /mnt/test-smb

# Unmount:
sudo umount /mnt/test-smb

# Or use credentials file for security:
cat > /tmp/smb-creds << 'EOF'
username=myuser
password=mypassword
domain=MYDOMAIN
EOF
chmod 600 /tmp/smb-creds
sudo mount -t cifs //smb-server/share /mnt/test-smb -o credentials=/tmp/smb-creds
```

## Step 3: Create CIFS Volume via Portainer

1. Navigate to **Volumes** in Portainer.
2. Click **Add volume**.
3. Configure:

```text
Name:    smb-shared-files
Driver:  local
Use NFS volume:  Off
Use CIFS volume: On
```

4. Under **CIFS Settings**, enter:

```text
Address:       smb-server.example.com
Share:         sharename
CIFS Version:  3.0
Username:      myuser
Password:      mypassword
```

## Step 4: CIFS Volume via Docker CLI

```bash
# Basic CIFS volume:
docker volume create \
  --driver local \
  --opt type=cifs \
  --opt o=addr=192.168.1.20,username=docker,password=securepass,vers=3.0 \
  --opt device=//192.168.1.20/shared \
  cifs-shared

# With domain authentication:
docker volume create \
  --driver local \
  --opt type=cifs \
  --opt o=addr=192.168.1.20,username=docker,password=securepass,domain=CORP,vers=3.0,uid=1000,gid=1000 \
  --opt device=//192.168.1.20/shared \
  cifs-domain-shared

# Verify:
docker volume inspect cifs-shared
```

## Step 5: CIFS Volumes in Docker Compose

```yaml
# docker-compose.yml with CIFS/SMB volumes
services:
  app:
    image: myorg/myapp:latest
    restart: unless-stopped
    volumes:
      # Mount Windows file share for documents
      - smb_documents:/app/documents:rw
      # Mount Windows file share for backups (read-only)
      - smb_archive:/app/archive:ro

volumes:
  smb_documents:
    driver: local
    driver_opts:
      type: cifs
      # SMB server options
      o: "addr=nas.internal,username=docker_user,password=${SMB_PASSWORD},vers=3.0,uid=1000,gid=1000,dir_mode=0755,file_mode=0644"
      device: "//nas.internal/documents"

  smb_archive:
    driver: local
    driver_opts:
      type: cifs
      o: "addr=nas.internal,username=readonly_user,password=${SMB_READONLY_PASS},vers=3.0,ro"
      device: "//nas.internal/archive"
```

Note: Never hardcode passwords in compose files. Use environment variables or a credentials file on the Docker host.

## Step 6: Secure Credential Management

### Using Environment Variables

```yaml
# docker-compose.yml
volumes:
  smb_share:
    driver: local
    driver_opts:
      type: cifs
      # Use environment variables for credentials
      o: "addr=${SMB_SERVER},username=${SMB_USER},password=${SMB_PASS},vers=3.0"
      device: "//${SMB_SERVER}/${SMB_SHARE}"
```

```bash
# .env file (don't commit this):
SMB_SERVER=nas.internal
SMB_USER=docker_service
SMB_PASS=secret_password
SMB_SHARE=shared_files
```

### Using a Credentials File

```bash
# Create credentials file on the host:
cat > /etc/docker/smb-credentials << 'EOF'
username=docker_service
password=secret_password
domain=CORP
EOF
chmod 600 /etc/docker/smb-credentials
```

```bash
# Reference credentials file in Docker volume:
docker volume create \
  --driver local \
  --opt type=cifs \
  --opt o=addr=nas.internal,credentials=/etc/docker/smb-credentials,vers=3.0 \
  --opt device=//nas.internal/shared \
  smb_secure
```

## Step 7: SMB Version Compatibility

```text
SMB Version   | Use When
--------------|------------------------------------------
vers=1.0      | Legacy Windows XP, very old Samba (insecure)
vers=2.0      | Windows Vista/Server 2008
vers=2.1      | Windows 7/Server 2008 R2
vers=3.0      | Windows 8/Server 2012
vers=3.1.1    | Windows 10/Server 2016+ (preferred when supported)
```

```yaml
# Force SMB 3.0 for Windows Server 2012+:
o: "addr=winserver,username=user,password=pass,vers=3.0"

# For Windows Server 2016+ (better security):
o: "addr=winserver,username=user,password=pass,vers=3.1.1"
```

## Step 8: NAS Device Configuration

For NAS devices (Synology, QNAP, TrueNAS):

```yaml
# Synology NAS SMB volume:
volumes:
  synology_media:
    driver: local
    driver_opts:
      type: cifs
      o: "addr=synology.local,username=docker,password=${NAS_PASS},vers=3.0,uid=1000,gid=1000"
      device: "//synology.local/media"

# TrueNAS SMB volume:
volumes:
  truenas_data:
    driver: local
    driver_opts:
      type: cifs
      o: "addr=truenas.local,username=smbuser,password=${NAS_PASS},vers=3.0"
      device: "//truenas.local/pool/docker-data"
```

## Troubleshooting CIFS Issues

```bash
# Error: "mount error(13): Permission denied"
# → Check username/password
# → Check share permissions in Windows/Samba

# Error: "mount error(115): Operation now in progress"
# → SMB server unreachable, check network/firewall

# Error: "CIFS VFS: ... bad network name (NT Status: 0xc00000cc)"
# → Share name is wrong

# Error: "Protocol negotiation failed"
# → Try different SMB version: vers=2.0, vers=3.0

# Test SMB without Docker:
smbclient //smb-server/sharename -U username
# > ls   (list files)
```

## Conclusion

CIFS/SMB volumes in Portainer bridge Linux containers with Windows file shares and NAS devices. The key is ensuring `cifs-utils` is installed on the Docker host, testing connectivity manually before creating Docker volumes, and using SMB version 3.0 or newer for security. Always store SMB credentials in environment variables or credential files rather than hardcoding them in compose files.
