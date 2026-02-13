# How to Enable EFS Encryption at Rest and in Transit

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Encryption, Security

Description: Learn how to enable and configure EFS encryption at rest using KMS and encryption in transit using TLS to protect your file system data end-to-end.

---

Encrypting your data isn't optional anymore. Compliance frameworks like SOC 2, HIPAA, and PCI-DSS require it. And even if you're not under regulatory pressure, encrypting data at rest and in transit is basic security hygiene. EFS makes it straightforward - encryption at rest is a checkbox when you create the file system, and encryption in transit is a mount option. But there are details worth understanding, especially around KMS key management and the performance implications.

Let's set up both types of encryption properly.

## Encryption at Rest

Encryption at rest means your data is encrypted when it's stored on EFS's underlying storage. EFS uses AES-256 encryption and integrates with AWS Key Management Service (KMS) for key management.

### Enabling Encryption at Rest

You can only enable encryption at rest when creating the file system. You can't encrypt an existing unencrypted file system (you'd need to create a new encrypted one and migrate the data).

Using the AWS-managed key:

```bash
# Create an encrypted file system with the AWS-managed key
aws efs create-file-system \
  --encrypted \
  --tags "Key=Name,Value=encrypted-storage"
```

Using a customer-managed KMS key (recommended for production):

```bash
# First, create a KMS key for EFS
KMS_KEY_ID=$(aws kms create-key \
  --description "EFS encryption key" \
  --query "KeyMetadata.KeyId" \
  --output text)

# Create an alias for easy reference
aws kms create-alias \
  --alias-name "alias/efs-encryption-key" \
  --target-key-id "$KMS_KEY_ID"

# Create the encrypted file system with your key
aws efs create-file-system \
  --encrypted \
  --kms-key-id "$KMS_KEY_ID" \
  --tags "Key=Name,Value=encrypted-storage"
```

### Why Use a Customer-Managed Key?

The AWS-managed key works fine, but a customer-managed key gives you:

- **Key rotation control** - You decide when and how keys are rotated
- **Cross-account access** - Share the file system with other accounts by sharing the key
- **Audit trail** - See exactly who and what is using the key in CloudTrail
- **Revocation ability** - Disable the key to make the data inaccessible (for compliance scenarios)

### KMS Key Policy

Your KMS key needs a policy that allows EFS to use it. Here's a minimal policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowKeyAdministration",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "AllowEFSToUseKey",
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:CreateGrant",
        "kms:DescribeKey"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "elasticfilesystem.us-east-1.amazonaws.com",
          "kms:CallerAccount": "123456789012"
        }
      }
    }
  ]
}
```

Apply the policy:

```bash
aws kms put-key-policy \
  --key-id "$KMS_KEY_ID" \
  --policy-name "default" \
  --policy file://kms-policy.json
```

## Encryption in Transit

Encryption in transit means data is encrypted as it travels between your compute resources and the EFS mount target over the network. EFS uses TLS 1.2 for this.

### Using the EFS Mount Helper

The simplest way to enable encryption in transit is with the EFS mount helper's `tls` option:

```bash
# Mount with encryption in transit
sudo mount -t efs -o tls fs-0abc123def456789:/ /mnt/efs
```

That's it. The mount helper sets up a local stunnel process that handles the TLS connection. All NFS traffic goes through this encrypted tunnel.

### What Happens Under the Hood

When you mount with the `tls` option, the mount helper:

1. Starts a `stunnel` process on the instance
2. The stunnel process listens on a local port
3. NFS traffic goes to the local stunnel port
4. Stunnel encrypts it with TLS and forwards it to the EFS mount target
5. The mount target decrypts and processes the NFS request

You can see the stunnel process running:

```bash
# Verify stunnel is running for your EFS mount
ps aux | grep stunnel
```

### Enforcing Encryption in Transit

You can (and should) enforce encryption in transit using an EFS file system policy. This rejects any mount attempt that doesn't use TLS:

```bash
# Set file system policy to enforce encryption in transit
aws efs put-file-system-policy \
  --file-system-id "fs-0abc123def456789" \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "EnforceEncryptionInTransit",
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

After setting this policy, any attempt to mount without TLS will fail:

```bash
# This will FAIL with the policy above
sudo mount -t efs fs-0abc123def456789:/ /mnt/efs

# This will SUCCEED
sudo mount -t efs -o tls fs-0abc123def456789:/ /mnt/efs
```

### Encryption in Transit Without the Mount Helper

If you can't use the mount helper (rare, but possible), you can set up stunnel manually:

```bash
# Install stunnel
sudo yum install -y stunnel

# Create stunnel configuration
sudo tee /etc/stunnel/efs.conf << 'EOF'
[efs]
client = yes
accept = 127.0.0.1:2049
connect = fs-0abc123def456789.efs.us-east-1.amazonaws.com:2049
TIMEOUTclose = 0
verify = 2
CAfile = /etc/pki/tls/certs/ca-bundle.crt
checkHost = fs-0abc123def456789.efs.us-east-1.amazonaws.com
EOF

# Start stunnel
sudo stunnel /etc/stunnel/efs.conf

# Mount using the local stunnel endpoint
sudo mount -t nfs4 \
  -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport \
  127.0.0.1:/ /mnt/efs
```

## Performance Impact of Encryption

A common question is whether encryption adds latency. Here's what to expect:

**Encryption at rest**: No measurable performance impact. The encryption/decryption happens at the storage layer and is handled by dedicated hardware. AWS has explicitly stated there's no performance penalty.

**Encryption in transit**: Small impact. The TLS encryption adds CPU overhead on your instances and a slight increase in latency (typically 1-5%). For most workloads, this is negligible. The stunnel process uses some CPU on your instance, so for very high-throughput workloads on small instances, factor in the extra CPU usage.

```bash
# Benchmark with and without TLS to compare
# Without TLS
time dd if=/dev/zero of=/mnt/efs-notls/testfile bs=1M count=1024

# With TLS
time dd if=/dev/zero of=/mnt/efs-tls/testfile bs=1M count=1024
```

## CloudFormation Template

Here's a complete template with both encryption types:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Encrypted EFS file system

Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>

Resources:
  EFSKmsKey:
    Type: AWS::KMS::Key
    Properties:
      Description: KMS key for EFS encryption at rest
      EnableKeyRotation: true
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: AllowAccountAdmin
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'
          - Sid: AllowEFS
            Effect: Allow
            Principal:
              AWS: '*'
            Action:
              - kms:Encrypt
              - kms:Decrypt
              - kms:ReEncrypt*
              - kms:GenerateDataKey*
              - kms:CreateGrant
              - kms:DescribeKey
            Resource: '*'
            Condition:
              StringEquals:
                kms:ViaService: !Sub 'elasticfilesystem.${AWS::Region}.amazonaws.com'
                kms:CallerAccount: !Ref AWS::AccountId

  EFSKeyAlias:
    Type: AWS::KMS::Alias
    Properties:
      AliasName: alias/efs-encryption
      TargetKeyId: !Ref EFSKmsKey

  FileSystem:
    Type: AWS::EFS::FileSystem
    Properties:
      Encrypted: true
      KmsKeyId: !GetAtt EFSKmsKey.Arn
      PerformanceMode: generalPurpose
      ThroughputMode: bursting
      FileSystemPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: EnforceEncryptionInTransit
            Effect: Deny
            Principal:
              AWS: '*'
            Action: '*'
            Resource: '*'
            Condition:
              Bool:
                aws:SecureTransport: 'false'
      FileSystemTags:
        - Key: Name
          Value: encrypted-efs

  MountTargetSG:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: EFS mount target SG - NFS only
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 2049
          ToPort: 2049
          CidrIp: 10.0.0.0/8

  MountTargetA:
    Type: AWS::EFS::MountTarget
    Properties:
      FileSystemId: !Ref FileSystem
      SubnetId: !Select [0, !Ref SubnetIds]
      SecurityGroups:
        - !Ref MountTargetSG

  MountTargetB:
    Type: AWS::EFS::MountTarget
    Properties:
      FileSystemId: !Ref FileSystem
      SubnetId: !Select [1, !Ref SubnetIds]
      SecurityGroups:
        - !Ref MountTargetSG

Outputs:
  FileSystemId:
    Value: !Ref FileSystem
  KmsKeyArn:
    Value: !GetAtt EFSKmsKey.Arn
```

## Verifying Encryption Status

Check whether your file system is encrypted at rest:

```bash
# Check encryption at rest status
aws efs describe-file-systems \
  --file-system-id "fs-0abc123def456789" \
  --query "FileSystems[0].{Encrypted:Encrypted,KmsKeyId:KmsKeyId}" \
  --output table
```

Check the file system policy for encryption in transit enforcement:

```bash
# Check if encryption in transit is enforced
aws efs describe-file-system-policy \
  --file-system-id "fs-0abc123def456789" \
  --output json
```

## Migrating Unencrypted File Systems

If you have an existing unencrypted file system, the only way to encrypt it is to create a new encrypted file system and copy the data:

```bash
# Create new encrypted FS
NEW_FS=$(aws efs create-file-system \
  --encrypted \
  --kms-key-id "alias/efs-encryption-key" \
  --tags "Key=Name,Value=encrypted-storage-v2" \
  --query "FileSystemId" \
  --output text)

# Use DataSync for efficient copy
# Create source location (old unencrypted FS)
# Create destination location (new encrypted FS)
# Create and run a DataSync task
```

For large migrations, AWS DataSync is significantly faster than rsync because it handles parallelism and incremental transfers automatically.

## Best Practices

1. **Always enable encryption at rest** when creating new file systems. There's no performance cost and no good reason not to.
2. **Use customer-managed KMS keys** for production workloads. The extra control is worth the minimal additional complexity.
3. **Enable automatic key rotation** on your KMS keys (yearly rotation is the default).
4. **Enforce encryption in transit** with a file system policy. Don't rely on people remembering the `-o tls` option.
5. **Audit KMS key usage** through CloudTrail to track who's accessing your encrypted data.
6. **Test failover scenarios** - make sure your key policy doesn't accidentally lock you out of your own data.

For setting up the complete EFS file system including encryption, see our guide on [creating an Amazon EFS file system](https://oneuptime.com/blog/post/2026-02-12-amazon-efs-file-system/view).

## Wrapping Up

EFS encryption is one of those things that's easy to do right from the start and painful to retrofit later. Enable encryption at rest on every file system you create. Enforce encryption in transit through file system policies. Use customer-managed KMS keys for the extra control. The performance impact is negligible, the security benefit is significant, and your compliance team will thank you.
