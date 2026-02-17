# How to Use Azure Storage Explorer to Manage Blobs, Files, Queues, and Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Storage Explorer, Blob Storage, Azure Files, Azure Queues, Azure Tables, GUI Tools

Description: A hands-on guide to using Azure Storage Explorer for managing all four Azure Storage services including blobs, files, queues, and tables.

---

Azure Storage Explorer is a free desktop application from Microsoft that gives you a visual interface for working with Azure Storage accounts. While the Azure CLI and SDKs are great for automation, there are plenty of situations where a GUI makes more sense - browsing through containers to find a specific file, quickly checking queue messages, or managing table entities without writing code. This guide covers the practical ways to use Storage Explorer for each of the four storage services.

## Installing and Connecting

Download Azure Storage Explorer from the official Microsoft site. It runs on Windows, macOS, and Linux. Once installed, the first thing you need to do is connect to your Azure account.

The simplest method is to sign in with your Azure AD account:

1. Open Storage Explorer
2. Click the plug icon in the left sidebar (Manage Accounts)
3. Click "Add an Azure Account"
4. Choose your Azure environment (public cloud, government, etc.)
5. Sign in with your credentials

After signing in, the left panel shows a tree view of all your subscriptions and storage accounts. You can expand each account to see its Blob Containers, File Shares, Queues, and Tables.

If you need to connect to a specific storage account without signing in to your full Azure account, you can use a connection string, SAS token, or storage account name and key. We will cover the SAS token approach in a separate post.

## Managing Blob Storage

Blob storage is where most people spend their time in Storage Explorer. Here is what you can do.

### Browsing and Downloading Blobs

Expand a storage account, then expand Blob Containers. Click on any container to see its contents. The interface shows blob names, sizes, content types, and last modified dates. You can navigate through virtual directories (folders) by double-clicking them.

To download a blob, select it and click Download in the toolbar, or right-click and choose Download. For multiple blobs, hold Ctrl or Shift to select several at once.

### Uploading Blobs

Click the Upload button in the toolbar. You have two options:

- **Upload Files**: Select one or more files from your local machine
- **Upload Folder**: Upload an entire folder structure, preserving the directory hierarchy as virtual directories in blob storage

In the upload dialog, you can set:
- **Blob type**: Block blob (default), Page blob, or Append blob
- **Access tier**: Hot, Cool, Cold, or Archive
- **Content type**: Auto-detected, but you can override it

### Managing Access Tiers

Right-click a blob and select "Change Access Tier" to move it between Hot, Cool, Cold, and Archive tiers. This is useful for ad-hoc tiering of individual blobs. For example, if you find old log files sitting in the Hot tier, you can quickly move them to Cool or Archive.

### Creating and Managing Containers

Right-click on "Blob Containers" in the tree and select "Create Blob Container." Name it (lowercase, hyphens, and numbers only), and set the public access level. For most workloads, keep the access level as Private.

### Generating SAS URLs

One of the most useful features is generating SAS (Shared Access Signature) URLs for individual blobs. Right-click a blob, choose "Get Shared Access Signature," set the permissions and expiry time, and click Create. You get a URL that provides temporary, scoped access to that specific blob.

## Managing Azure Files

Azure Files provides fully managed file shares that you can mount via SMB or NFS. In Storage Explorer, you manage them similarly to blobs.

### Browsing File Shares

Expand "File Shares" under your storage account. Click a share to see its directory structure. Unlike blob storage where directories are virtual, Azure Files has a real hierarchical directory structure.

### Upload and Download Operations

The upload and download experience is the same as for blobs - select files, use the toolbar buttons, and drag-and-drop works too. You can upload entire folder structures, and they preserve their hierarchy.

### Creating Directories

Right-click inside a file share and select "New Folder" to create directories. This is a real operation that creates an actual directory entry in the file share.

### Connecting to Snapshots

If you have file share snapshots, they appear as child nodes under the file share in the tree view. You can browse snapshots to find and restore specific files from a point in time.

## Managing Queues

Queue management in Storage Explorer is straightforward and saves you from writing code just to inspect or debug queue messages.

### Viewing Messages

Click on a queue to see its messages. The viewer shows the message text, insertion time, expiration time, and dequeue count. This is invaluable when debugging message processing issues - you can see exactly what messages are sitting in the queue and how many times they have been dequeued.

### Adding Messages

Click "Add Message" in the toolbar to put a new message on the queue. You can enter the message text, set an expiration time, and optionally base64-encode the content. This is great for testing - you can manually push test messages into a queue without writing any code.

### Dequeuing and Deleting Messages

You can dequeue the next message (which removes it from the queue after the visibility timeout) or delete specific messages. When troubleshooting a stuck queue processor, you might need to manually remove a poison message that keeps failing.

### Clearing Queues

Right-click a queue and select "Clear Queue" to remove all messages. Be careful with this one - it is irreversible and there is no undo.

## Managing Table Storage

Table Storage has a unique interface in Storage Explorer since it deals with structured entities rather than files.

### Querying Entities

When you click on a table, Storage Explorer shows the first page of entities. The default view shows all properties in a grid format, which can be wide if your entities have many properties.

To find specific entities, use the query builder. You can filter by PartitionKey, RowKey, or any other property. For example, to find all entities in a specific partition:

```
PartitionKey eq 'customer-123'
```

Or to combine conditions:

```
PartitionKey eq 'orders' and Timestamp gt datetime'2026-02-01T00:00:00Z'
```

### Adding and Editing Entities

Click "Add Entity" to create a new entity. You need to specify the PartitionKey and RowKey (both required), and then add any custom properties with their types (String, Int32, Int64, DateTime, Boolean, Binary, Double, Guid).

To edit an existing entity, double-click it or select it and click Edit. You can modify property values, add new properties, or remove optional properties.

### Importing and Exporting

Storage Explorer supports importing entities from CSV and JSON files, and exporting query results to these formats. This is incredibly useful for:

- Migrating data between tables
- Creating backups of table data
- Loading test data from a spreadsheet
- Sharing data with team members who do not have Azure access

### Deleting Entities

Select one or more entities and press Delete. You can also use a query to find entities and then delete the results.

## Useful Tips and Shortcuts

A few features that are easy to miss:

**Activity Log**: The bottom panel shows all operations in progress and their history. If an upload fails, you can see the error details here.

**Concurrent Transfers**: Storage Explorer handles multiple uploads and downloads concurrently. You can configure the number of concurrent transfers in Settings to speed up bulk operations.

**Resource URI Copy**: Right-click any resource and select "Copy URI" to get the full Azure Storage URI. This saves time when you need to reference a blob or container in code or scripts.

**Soft Delete Recovery**: If soft delete is enabled on your storage account, Storage Explorer shows deleted blobs with a strikethrough. You can right-click and undelete them.

**CORS Configuration**: Under the storage account node, you can view and edit CORS rules without going to the Azure Portal.

**Access Policies**: Right-click a container, file share, queue, or table to manage stored access policies. These are useful for creating SAS tokens that can be revoked by deleting the policy.

## When to Use Storage Explorer vs. CLI

Storage Explorer is best for:
- Exploratory work - browsing data, checking what is in a container
- One-off operations - uploading a single file, checking a queue message
- Debugging - inspecting table entities, viewing blob metadata
- Sharing data - generating quick SAS URLs for colleagues

The CLI (az storage) or SDKs are better for:
- Automation and scripting
- Operations on thousands of objects
- CI/CD pipeline integration
- Anything that needs to be reproducible

In practice, most teams use both. Storage Explorer lives on your desktop for quick tasks, and the CLI sits in your scripts for automated workflows. They complement each other well, and getting comfortable with both saves a lot of time over the long run.
