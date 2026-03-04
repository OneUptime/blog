# How to Configure Stratis Storage Using the RHEL Web Console

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Stratis, Web Console, Cockpit, Storage, Linux

Description: Learn how to manage Stratis storage pools and filesystems using the RHEL Web Console (Cockpit), providing a graphical interface for creating pools, filesystems, and snapshots.

---

The RHEL Web Console (Cockpit) provides a browser-based graphical interface for managing Stratis storage. This is especially useful for administrators who prefer a visual approach or need to manage storage on remote systems without SSH. This guide covers how to use the Web Console for Stratis management.

## Prerequisites

- A RHEL system with root or sudo access
- Stratis packages installed
- Web Console (Cockpit) installed and running
- Unused block devices for creating pools

## Step 1: Install and Enable the Web Console

Install Cockpit if not already present:

```bash
sudo dnf install cockpit cockpit-storaged -y
```

The `cockpit-storaged` package adds storage management features including Stratis support.

Enable and start the Web Console:

```bash
sudo systemctl enable --now cockpit.socket
```

Open the firewall for Cockpit:

```bash
sudo firewall-cmd --permanent --add-service=cockpit
sudo firewall-cmd --reload
```

## Step 2: Install Stratis Components

Ensure Stratis is installed and running:

```bash
sudo dnf install stratisd stratis-cli -y
sudo systemctl enable --now stratisd
```

## Step 3: Access the Web Console

Open a web browser and navigate to:

```bash
https://your-server-ip:9090
```

Log in with your system credentials. Ensure you log in as a user with administrative privileges, or check the "Reuse my password for privileged tasks" option.

## Step 4: Navigate to Storage

Click on **Storage** in the left navigation menu. This shows an overview of all storage devices, filesystems, and storage services on the system.

You should see:
- Disk drives listed at the top
- Filesystems and mount points
- NFS mounts (if any)
- Storage logs at the bottom

## Step 5: Create a Stratis Pool

1. Scroll down to the **Devices** section or look for the **Create Stratis pool** button.
2. Click **Create Stratis pool**.
3. In the dialog:
   - **Name**: Enter a pool name (for example, `datapool`)
   - **Block devices**: Select the disks to include in the pool by checking their checkboxes
   - **Encryption**: Optionally enable encryption by toggling the encryption switch and providing a passphrase
4. Click **Create** to create the pool.

The pool appears in the storage overview.

## Step 6: Create a Stratis Filesystem

1. Click on the pool name to expand its details.
2. Click **Create filesystem**.
3. In the dialog:
   - **Name**: Enter a filesystem name (for example, `documents`)
   - **Mount point**: Enter the desired mount point (for example, `/documents`)
   - **Mount options**: Configure mount options:
     - Check "Mount at boot" for persistent mounting
     - The Web Console automatically adds the `x-systemd.requires=stratisd.service` option
4. Click **Create and mount**.

The filesystem is created, formatted, and mounted in one step.

## Step 7: Create a Snapshot

1. Navigate to the pool details.
2. Find the filesystem you want to snapshot.
3. Click the three-dot menu next to the filesystem.
4. Select **Create snapshot**.
5. Enter a name for the snapshot.
6. Click **Create**.

The snapshot appears in the filesystem list.

## Step 8: Mount a Snapshot

1. Find the snapshot in the filesystem list.
2. Click on it to expand details.
3. Click **Mount** and specify a mount point.
4. Click **Mount**.

## Step 9: Add Devices to a Pool

1. Click on the pool name.
2. Click **Add block devices**.
3. Select the devices to add.
4. Click **Add**.

The pool capacity increases immediately.

## Step 10: Monitor Pool Usage

The pool detail view shows:
- Total pool capacity
- Used space
- Free space
- A visual usage bar

Each filesystem displays its individual usage statistics.

## Step 11: Delete Stratis Resources

### Delete a Filesystem

1. Navigate to the pool details.
2. Click the three-dot menu next to the filesystem.
3. Select **Delete**.
4. Confirm the deletion.

The filesystem is unmounted and destroyed.

### Delete a Pool

1. First delete all filesystems in the pool (including snapshots).
2. Click the three-dot menu next to the pool name.
3. Select **Delete pool**.
4. Confirm.

## Managing Encryption

### Create an Encrypted Pool

When creating a pool, toggle the encryption option:

1. Click **Create Stratis pool**.
2. Enable the **Encryption** toggle.
3. Enter a passphrase.
4. Select the block devices.
5. Click **Create**.

### Unlock an Encrypted Pool

After reboot, encrypted pools may need to be unlocked:

1. The Web Console shows locked pools with an unlock button.
2. Click **Unlock**.
3. Enter the passphrase.
4. The pool and its filesystems become available.

## Advantages of the Web Console for Stratis

- **Visual overview**: See all pools, filesystems, and usage at a glance
- **Guided workflows**: Dialog-based creation prevents common errors
- **Remote management**: Manage storage from any browser without SSH
- **Integrated monitoring**: Usage graphs and alerts in one interface
- **fstab management**: Automatic fstab configuration when mounting

## Limitations

- **Some advanced features**: Not all Stratis CLI options are available in the Web Console (for example, cache tier management)
- **Bulk operations**: The Web Console handles one operation at a time
- **Scripting**: For automated or repeated operations, the CLI is more efficient

## Troubleshooting

### Stratis Not Appearing in Storage

Ensure the packages are installed:

```bash
sudo dnf install cockpit-storaged stratisd stratis-cli -y
sudo systemctl restart cockpit.socket
sudo systemctl restart stratisd
```

### Permission Denied

Ensure you are logged in as an administrative user or have clicked the "Administrative access" button in the Web Console.

### Disk Not Showing as Available

Disks with existing partitions or signatures may not appear as available. Clean them from the CLI:

```bash
sudo wipefs -a /dev/sdb
```

Then refresh the Web Console page.

## Conclusion

The RHEL Web Console provides an intuitive graphical interface for managing Stratis storage, making it accessible to administrators who prefer visual tools or need to manage remote systems quickly. While the CLI remains necessary for some advanced operations, the Web Console covers the most common Stratis tasks including pool creation, filesystem management, snapshots, encryption, and monitoring. It is an excellent complement to command-line management.
