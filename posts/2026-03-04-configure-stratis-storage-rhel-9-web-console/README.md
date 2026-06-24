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

Log in with your system credentials. Ensure you log in as a user with administrative privileges, or click **Limited access** and authenticate to gain administrative access.

## Step 4: Navigate to Storage

Click on **Storage** in the left navigation menu. This shows an overview of all storage devices, filesystems, and storage services on the system.

You should see:
- Disk drives listed at the top
- Filesystems and mount points
- NFS mounts (if any)
- Storage logs at the bottom

## Step 5: Create a Stratis Pool

1. In the **Storage** table, click the menu button and select **Create Stratis pool**.
2. In the dialog:
   - **Name**: Enter a pool name (for example, `datapool`)
   - **Block devices**: Select the disks to include in the pool by checking their checkboxes
   - **Encryption**: Optionally select an encryption type, such as a passphrase, a Tang keyserver, or both
3. Click **Create** to create the pool.

The pool appears in the storage overview.

## Step 6: Create a Stratis Filesystem

1. Click on the pool name to expand its details.
2. Click **Create filesystem**.
3. In the dialog:
   - **Name**: Enter a filesystem name (for example, `documents`)
   - **Mount point**: Enter the desired mount point (for example, `/documents`)
   - **Mount options**: Configure mount options:
     - Check "Mount at boot" for persistent mounting
     - The Web Console writes the appropriate persistent mount configuration when you choose an at-boot option
4. Click **Create and mount**.

The filesystem is created, formatted, and mounted in one step.

## Step 7: Create a Snapshot

The RHEL 9 documentation describes Stratis snapshot creation from the CLI. You can run the command from the Web Console's **Terminal** page or from an SSH session:

```bash
sudo stratis fs snapshot datapool documents documents-snapshot
```

The snapshot is a regular Stratis filesystem and appears in the filesystem list.

## Step 8: Mount a Snapshot

Mount the snapshot as a regular Stratis filesystem:

```bash
sudo mount /dev/stratis/datapool/documents-snapshot /mnt/documents-snapshot
```

## Step 9: Add Devices to a Pool

1. Click on the pool name.
2. Click **Add block devices**.
3. Select the tier where you want to add the device, such as **data** or **cache**.
4. If the pool is encrypted with a passphrase, enter the passphrase.
5. Select the devices to add.
6. Click **Add**.

If you add devices to the data tier, the pool capacity increases immediately.

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

When creating a pool, select an encryption type:

1. Click **Create Stratis pool**.
2. Select the block devices.
3. Select an encryption type, such as a passphrase, a Tang keyserver, or both.
4. Enter and confirm the required encryption information.
5. Click **Create**.

### Unlock an Encrypted Pool

After reboot, encrypted pools may need to be unlocked. Pools configured with Tang can unlock automatically, but passphrase-based pools might need keyring-based unlocking from the CLI before the Web Console shows them:

```bash
sudo stratis key set --capture-key key-description
```

After the key is available and the pool is unlocked, refresh the Web Console and the pool and its filesystems become available.

## Advantages of the Web Console for Stratis

- **Visual overview**: See all pools, filesystems, and usage at a glance
- **Guided workflows**: Dialog-based creation prevents common errors
- **Remote management**: Manage storage from any browser without SSH
- **Integrated monitoring**: Usage graphs and alerts in one interface
- **fstab management**: Automatic fstab configuration when mounting

## Limitations

- **Some advanced features**: Not all Stratis CLI options are available in the Web Console (for example, snapshot revert scheduling)
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

The RHEL Web Console provides an intuitive graphical interface for managing Stratis storage, making it accessible to administrators who prefer visual tools or need to manage remote systems quickly. While the CLI remains necessary for some operations such as snapshot creation and revert scheduling, the Web Console covers common Stratis tasks including pool creation, filesystem management, encryption, and monitoring. It is an excellent complement to command-line management.
