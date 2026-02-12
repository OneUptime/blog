# How to Set Up EFS Access Points for Application-Specific Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Access Points, Security, Storage

Description: Learn how to create and use EFS access points to provide application-specific entry points into your file system with enforced user identity and root directories.

---

When multiple applications share a single EFS file system, things can get messy. Without proper isolation, one application might accidentally (or intentionally) read or modify another application's files. Running containers as root means they have unrestricted access to the entire file system. And tracking which application wrote what file becomes a headache when everything runs as the same user.

EFS access points solve these problems by providing application-specific entry points into the file system. Each access point can enforce a POSIX user/group identity and a root directory, effectively giving each application its own isolated view of the file system.

## What Access Points Do

An access point is a named entry into an EFS file system that:

1. **Enforces a POSIX user/group identity**: Regardless of what user the connecting client runs as, all file operations go through the access point's configured UID/GID
2. **Restricts the root directory**: The application sees only a specific subdirectory as its root, not the entire file system
3. **Creates the root directory automatically**: If the specified path doesn't exist, EFS creates it with the permissions you specify
4. **Integrates with IAM**: You can create IAM policies that grant access to specific access points

## Creating an Access Point

Let's create access points for two applications: a web app and a data processor.

Web application access point:

```bash
# Create access point for the web application
WEB_AP=$(aws efs create-access-point \
  --file-system-id "fs-0abc123def456789" \
  --posix-user "Uid=1001,Gid=1001" \
  --root-directory "Path=/webapp,CreationInfo={OwnerUid=1001,OwnerGid=1001,Permissions=755}" \
  --tags "Key=Name,Value=webapp-access-point" "Key=Application,Value=webapp" \
  --query "AccessPointId" \
  --output text)

echo "Web app access point: $WEB_AP"
```

Data processor access point:

```bash
# Create access point for the data processor
DATA_AP=$(aws efs create-access-point \
  --file-system-id "fs-0abc123def456789" \
  --posix-user "Uid=1002,Gid=1002" \
  --root-directory "Path=/dataprocessor,CreationInfo={OwnerUid=1002,OwnerGid=1002,Permissions=750}" \
  --tags "Key=Name,Value=data-processor-ap" "Key=Application,Value=data-processor" \
  --query "AccessPointId" \
  --output text)

echo "Data processor access point: $DATA_AP"
```

Notice the differences:
- Different UIDs/GIDs for isolation
- Different root directories so they can't see each other's files
- Different permissions (755 vs 750) based on security needs

## Understanding POSIX User Enforcement

When a client connects through an access point, the UID and GID specified in the access point override whatever identity the client process is using. This is powerful for several reasons:

- A container running as root (UID 0) will still have its file operations performed as the access point's configured UID
- You don't need to manage user accounts inside containers
- File ownership is consistent regardless of how the application is deployed

Here's what happens at the file system level:

```bash
# Without access point: container running as root creates files owned by root
ls -la /mnt/efs/
-rw-r--r--  1 root root  1024 Feb 12 10:00 config.json

# With access point (UID=1001): same container creates files owned by 1001
ls -la /mnt/efs/
-rw-r--r--  1 1001 1001  1024 Feb 12 10:00 config.json
```

## Mounting with Access Points

On EC2 instances, use the access point ID with the mount helper:

```bash
# Mount using the access point
sudo mount -t efs -o tls,accesspoint=fsap-0abc123def456 \
  fs-0abc123def456789:/ /mnt/webapp
```

The mounted path shows the access point's root directory as `/`. The application sees `/mnt/webapp` as a clean root, unaware that it's actually a subdirectory of the larger file system.

## Using Access Points with ECS Fargate

In your ECS task definition, specify the access point in the EFS volume configuration:

```json
{
  "family": "multi-app-task",
  "volumes": [
    {
      "name": "webapp-data",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-0abc123def456789",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "accessPointId": "fsap-0webapp123",
          "iam": "ENABLED"
        }
      }
    },
    {
      "name": "processor-data",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-0abc123def456789",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "accessPointId": "fsap-0processor456",
          "iam": "ENABLED"
        }
      }
    }
  ],
  "containerDefinitions": [
    {
      "name": "webapp",
      "image": "webapp:latest",
      "mountPoints": [
        {
          "sourceVolume": "webapp-data",
          "containerPath": "/app/data",
          "readOnly": false
        }
      ]
    },
    {
      "name": "processor",
      "image": "processor:latest",
      "mountPoints": [
        {
          "sourceVolume": "processor-data",
          "containerPath": "/data",
          "readOnly": false
        }
      ]
    }
  ]
}
```

For the full ECS Fargate setup with EFS, see [mounting EFS on ECS Fargate tasks](https://oneuptime.com/blog/post/mount-efs-ecs-fargate-tasks/view).

## Using Access Points with Lambda

Lambda requires an access point - you can't mount EFS on Lambda without one:

```bash
# Configure Lambda with an EFS access point
aws lambda update-function-configuration \
  --function-name "my-function" \
  --file-system-configs '[{
    "Arn": "arn:aws:elasticfilesystem:us-east-1:123456789012:access-point/fsap-0abc123",
    "LocalMountPath": "/mnt/data"
  }]'
```

For the complete Lambda + EFS setup, see [mounting EFS on Lambda functions](https://oneuptime.com/blog/post/mount-efs-lambda-functions/view).

## IAM Policies for Access Point Restriction

The real security comes from combining access points with IAM policies. You can create policies that only allow specific roles to use specific access points.

Here's a policy for the web application's task role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:ClientMount",
        "elasticfilesystem:ClientWrite"
      ],
      "Resource": "arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-0abc123def456789",
      "Condition": {
        "StringEquals": {
          "elasticfilesystem:AccessPointArn": "arn:aws:elasticfilesystem:us-east-1:123456789012:access-point/fsap-0webapp123"
        }
      }
    }
  ]
}
```

And for the data processor (with read-only access):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:ClientMount"
      ],
      "Resource": "arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-0abc123def456789",
      "Condition": {
        "StringEquals": {
          "elasticfilesystem:AccessPointArn": "arn:aws:elasticfilesystem:us-east-1:123456789012:access-point/fsap-0processor456"
        }
      }
    }
  ]
}
```

Notice the data processor only has `ClientMount` - no `ClientWrite`. Combined with the access point restriction, this role can only read from the data processor's directory.

## File System Policy with Access Points

You can also enforce that all access must go through an access point at the file system level:

```bash
# Enforce access point usage on the file system
aws efs put-file-system-policy \
  --file-system-id "fs-0abc123def456789" \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "RequireAccessPoint",
        "Effect": "Deny",
        "Principal": {"AWS": "*"},
        "Action": [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:ClientRootAccess"
        ],
        "Resource": "*",
        "Condition": {
          "StringEquals": {
            "elasticfilesystem:AccessPointArn": ""
          }
        }
      },
      {
        "Sid": "EnforceEncryption",
        "Effect": "Deny",
        "Principal": {"AWS": "*"},
        "Action": "*",
        "Resource": "*",
        "Condition": {
          "Bool": {
            "aws:SecureTransport": "false"
          }
        }
      }
    ]
  }'
```

This policy blocks any mount attempt that doesn't go through an access point and doesn't use TLS.

## Shared Data Between Applications

Sometimes applications need to share data. You can set this up using group permissions. Give both access points the same secondary GID:

```bash
# Web app writes shared data
aws efs create-access-point \
  --file-system-id "fs-0abc123def456789" \
  --posix-user "Uid=1001,Gid=1001,SecondaryGids=2000" \
  --root-directory "Path=/shared,CreationInfo={OwnerUid=0,OwnerGid=2000,Permissions=775}"

# Data processor reads shared data
aws efs create-access-point \
  --file-system-id "fs-0abc123def456789" \
  --posix-user "Uid=1002,Gid=1002,SecondaryGids=2000" \
  --root-directory "Path=/shared,CreationInfo={OwnerUid=0,OwnerGid=2000,Permissions=775}"
```

Both applications can access the `/shared` directory because they both belong to group 2000.

## Terraform Configuration

Here's a complete Terraform setup with multiple access points:

```hcl
resource "aws_efs_file_system" "main" {
  encrypted = true
  tags = {
    Name = "multi-app-storage"
  }
}

# Access point for web application
resource "aws_efs_access_point" "webapp" {
  file_system_id = aws_efs_file_system.main.id

  posix_user {
    uid = 1001
    gid = 1001
  }

  root_directory {
    path = "/webapp"
    creation_info {
      owner_uid   = 1001
      owner_gid   = 1001
      permissions = "755"
    }
  }

  tags = {
    Name        = "webapp-ap"
    Application = "webapp"
  }
}

# Access point for data processor
resource "aws_efs_access_point" "processor" {
  file_system_id = aws_efs_file_system.main.id

  posix_user {
    uid = 1002
    gid = 1002
  }

  root_directory {
    path = "/processor"
    creation_info {
      owner_uid   = 1002
      owner_gid   = 1002
      permissions = "750"
    }
  }

  tags = {
    Name        = "processor-ap"
    Application = "data-processor"
  }
}

# Access point for shared data
resource "aws_efs_access_point" "shared" {
  file_system_id = aws_efs_file_system.main.id

  posix_user {
    uid            = 1001
    gid            = 2000
    secondary_gids = [2000]
  }

  root_directory {
    path = "/shared"
    creation_info {
      owner_uid   = 0
      owner_gid   = 2000
      permissions = "775"
    }
  }

  tags = {
    Name = "shared-data-ap"
  }
}
```

## Listing and Managing Access Points

```bash
# List all access points for a file system
aws efs describe-access-points \
  --file-system-id "fs-0abc123def456789" \
  --query "AccessPoints[].{Id:AccessPointId,Name:Tags[?Key=='Name']|[0].Value,Path:RootDirectory.Path,Uid:PosixUser.Uid}" \
  --output table

# Delete an access point
aws efs delete-access-point \
  --access-point-id "fsap-0old123"
```

## Best Practices

1. **One access point per application** - Don't share access points between different applications.
2. **Use unique UIDs/GIDs** per application to ensure file ownership isolation.
3. **Combine with IAM policies** - Access points alone don't prevent someone from mounting without one. Use IAM to enforce it.
4. **Set restrictive permissions** - Use 750 instead of 755 when group access isn't needed.
5. **Use secondary GIDs for shared data** rather than making everything world-readable.
6. **Document your UID/GID assignments** - Maintain a registry so you don't accidentally reuse numbers.

## Wrapping Up

Access points are the key to safely sharing an EFS file system across multiple applications. They provide identity enforcement, directory isolation, and when combined with IAM policies, complete access control. Instead of managing complex POSIX permissions and hoping nobody runs as root, you declare the identity and scope for each application, and EFS enforces it. That's a much better security model for modern containerized and serverless architectures.
