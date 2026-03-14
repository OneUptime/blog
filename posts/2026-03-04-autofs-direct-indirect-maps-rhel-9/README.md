# How to Set Up Direct and Indirect autofs Maps on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Autofs, Direct Maps, Indirect Maps, NFS, Linux

Description: Understand and configure direct and indirect autofs maps on RHEL to control exactly where NFS shares and other file systems are mounted.

---

autofs supports two types of maps: indirect and direct. The difference is how mount points are structured. Understanding both is important for setting up automounts that match your directory layout requirements.

## Indirect Maps

Indirect maps mount file systems as subdirectories under a common parent directory. The master map specifies the parent, and the map file specifies the subdirectories.

### How Indirect Maps Work

Master map entry:

```bash
/nfs /etc/auto.nfs
```

Map file `/etc/auto.nfs`:

```bash
data    -rw  nfsserver:/export/data
logs    -ro  nfsserver:/export/logs
```

Result:
- `/nfs/data/` mounts `nfsserver:/export/data`
- `/nfs/logs/` mounts `nfsserver:/export/logs`

The parent directory `/nfs/` is managed by autofs. You cannot have permanent content in `/nfs/` alongside automounted subdirectories.

### Setting Up Indirect Maps

```bash
# Master map
sudo tee /etc/auto.master.d/indirect.autofs << 'EOF'
/shares /etc/auto.shares --timeout=600
EOF

sudo systemctl restart autofs
```
