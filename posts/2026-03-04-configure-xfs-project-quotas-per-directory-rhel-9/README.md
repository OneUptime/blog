# How to Configure XFS Project Quotas for Per-Directory Limits on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XFS, Project Quotas, Storage, Linux

Description: Learn how to configure XFS project quotas on RHEL to set per-directory storage limits, enabling fine-grained control over disk usage for specific directory trees.

---

XFS project quotas allow you to set storage limits on specific directory trees rather than on users or groups. This is useful for limiting storage consumption per application, per department, or per project directory. This guide covers configuring project quotas on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- An XFS filesystem where you want to enable project quotas
- The `xfsprogs` package installed

## Understanding Project Quotas

Unlike user and group quotas that limit storage based on file ownership, project quotas limit storage based on the directory where files reside. Every file within a project directory counts toward that project's quota, regardless of which user owns it.

Key concepts:
- Each project has a numeric ID and an optional name
- A directory tree is associated with a project ID
- All files in that directory tree count toward the project's quota
- Project quotas and group quotas cannot be used simultaneously on the same filesystem

## Step 1: Enable Project Quotas

Edit `/etc/fstab` to add the project quota mount option:

```
/dev/vg_data/lv_data /data xfs defaults,pquota 0 0
```

**Note**: You cannot use `gquota` and `pquota` together on the same XFS filesystem.

Remount the filesystem:

```bash
sudo umount /data
sudo mount /data
```

Verify:

```bash
mount | grep /data
sudo xfs_quota -x -c 'state' /data
```

## Step 2: Define Projects

Create the project name mapping file `/etc/projects`:

```bash
sudo tee /etc/projects << EOF
1:/data/project-alpha
2:/data/project-beta
3:/data/shared-libs
EOF
```

Each line maps a project ID to a directory path.

Create the project name file `/etc/projid`:

```bash
sudo tee /etc/projid << EOF
project-alpha:1
project-beta:2
shared-libs:3
EOF
```

This maps human-readable names to project IDs.

## Step 3: Create Project Directories

```bash
sudo mkdir -p /data/project-alpha /data/project-beta /data/shared-libs
```

## Step 4: Initialize Projects

Associate each directory with its project ID:

```bash
sudo xfs_quota -x -c 'project -s project-alpha' /data
sudo xfs_quota -x -c 'project -s project-beta' /data
sudo xfs_quota -x -c 'project -s shared-libs' /data
```

The `-s` flag sets up the project, recursively setting the project ID on all existing files in the directory.

Verify the project setup:

```bash
sudo xfs_quota -x -c 'project -c project-alpha' /data
```

The `-c` flag checks the project consistency.

## Step 5: Set Project Quota Limits

Set block (space) limits:

```bash
sudo xfs_quota -x -c 'limit -p bsoft=10g bhard=12g project-alpha' /data
sudo xfs_quota -x -c 'limit -p bsoft=20g bhard=25g project-beta' /data
sudo xfs_quota -x -c 'limit -p bsoft=5g bhard=5g shared-libs' /data
```

Set inode (file count) limits:

```bash
sudo xfs_quota -x -c 'limit -p isoft=50000 ihard=60000 project-alpha' /data
```

## Step 6: Monitor Project Quota Usage

View the project quota report:

```bash
sudo xfs_quota -x -c 'report -p -h' /data
```

Sample output:

```
Project quota on /data (/dev/mapper/vg_data-lv_data)
                        Blocks
Project ID   Used   Soft   Hard Warn/Grace
---------- ---------------------------------
project-alpha  3.5G    10G    12G  00 [------]
project-beta   18G    20G    25G  00 [------]
shared-libs   2.1G     5G     5G  00 [------]
```

Check a specific project:

```bash
sudo xfs_quota -x -c 'quota -p project-alpha' /data
```

## Step 7: Set the Grace Period

Configure how long a project can exceed its soft limit:

```bash
sudo xfs_quota -x -c 'timer -p 7d' /data
```

## Step 8: Test the Quota

Switch to a regular user and try to exceed the quota:

```bash
# As a regular user
cd /data/project-alpha
dd if=/dev/zero of=testfile bs=1M count=13000
```

If the quota is working, this should fail when the hard limit is reached:

```
dd: error writing 'testfile': No space left on device
```

## Step 9: Add New Projects

To add a new project directory:

```bash
# Add entries to /etc/projects and /etc/projid
echo '4:/data/project-gamma' | sudo tee -a /etc/projects
echo 'project-gamma:4' | sudo tee -a /etc/projid

# Create the directory
sudo mkdir -p /data/project-gamma

# Initialize and set quotas
sudo xfs_quota -x -c 'project -s project-gamma' /data
sudo xfs_quota -x -c 'limit -p bsoft=15g bhard=18g project-gamma' /data
```

## Step 10: Manage Nested Directories

Project quotas apply to the entire directory tree. If you move files into a project directory, you may need to update their project ID:

```bash
sudo xfs_quota -x -c 'project -s project-alpha' /data
```

This rescans and sets the project ID on any new files that may have been added without the correct project ID.

## Use Cases for Project Quotas

### Web Hosting

Limit each website to a specific amount of storage:

```bash
echo '10:/data/www/site1' | sudo tee -a /etc/projects
echo '11:/data/www/site2' | sudo tee -a /etc/projects
echo 'site1:10' | sudo tee -a /etc/projid
echo 'site2:11' | sudo tee -a /etc/projid
```

### Container Storage

Limit storage per container's data directory:

```bash
echo '100:/data/containers/app1' | sudo tee -a /etc/projects
echo 'container-app1:100' | sudo tee -a /etc/projid
```

### Build Directories

Limit CI/CD build artifact storage:

```bash
echo '200:/data/builds' | sudo tee -a /etc/projects
echo 'builds:200' | sudo tee -a /etc/projid
```

## Best Practices

- **Plan project IDs carefully**: Use a consistent numbering scheme that allows for growth.
- **Document project assignments**: Maintain records of which directories map to which project IDs.
- **Combine with permissions**: Project quotas limit space but not access. Use standard file permissions or ACLs for access control.
- **Monitor regularly**: Review project quota reports to identify projects approaching their limits.
- **Set both soft and hard limits**: Soft limits with grace periods give users time to clean up before hitting the hard limit.

## Conclusion

XFS project quotas on RHEL provide a powerful mechanism for controlling storage usage on a per-directory basis. Unlike user and group quotas, project quotas track space by directory tree, making them ideal for multi-tenant environments, web hosting, and any scenario where storage limits need to be applied to specific directory hierarchies rather than to individual users.
