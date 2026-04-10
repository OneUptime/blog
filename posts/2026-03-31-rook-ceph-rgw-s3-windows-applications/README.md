# How to Use Ceph RGW S3 from Windows Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, S3, Window, Object Storage, Kubernetes

Description: Learn how to access Ceph RGW S3-compatible object storage from Windows applications using the AWS SDK, AWS CLI, and native Windows tools.

---

## Ceph RGW as an S3-Compatible Store

Ceph's RADOS Gateway (RGW) provides an S3-compatible REST API that Windows applications can consume using standard AWS S3 SDKs and tools - no special Ceph client software required. Any application that can connect to AWS S3 can be pointed at RGW instead.

## Getting RGW Endpoint and Credentials

First, obtain the RGW endpoint from your Kubernetes cluster:

```bash
# Get the RGW service endpoint
kubectl -n rook-ceph get svc rook-ceph-rgw-my-store
```

Create S3 user credentials:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=windows-user \
  --display-name="Windows Application User" \
  --access-key=myaccesskey \
  --secret=mysecretkey
```

## Using AWS CLI on Windows

Install and configure AWS CLI for RGW:

```powershell
# Install AWS CLI
winget install Amazon.AWSCLI

# Configure credentials
aws configure set aws_access_key_id myaccesskey
aws configure set aws_secret_access_key mysecretkey
aws configure set default.region us-east-1

# Test connection to RGW
aws --endpoint-url http://192.168.1.100:80 s3 ls

# Create a bucket
aws --endpoint-url http://192.168.1.100:80 s3 mb s3://my-windows-bucket

# Upload a file
aws --endpoint-url http://192.168.1.100:80 s3 cp C:\myfile.txt s3://my-windows-bucket/

# List bucket contents
aws --endpoint-url http://192.168.1.100:80 s3 ls s3://my-windows-bucket/
```

## Using AWS SDK for .NET

```csharp
using Amazon.S3;
using Amazon.S3.Model;

// Configure client to use Ceph RGW endpoint
var config = new AmazonS3Config
{
    ServiceURL = "http://192.168.1.100:80",
    ForcePathStyle = true,   // Required for RGW
    UseHttp = true
};

var credentials = new Amazon.Runtime.BasicAWSCredentials("myaccesskey", "mysecretkey");
var s3Client = new AmazonS3Client(credentials, config);

// Upload a file
var putRequest = new PutObjectRequest
{
    BucketName = "my-windows-bucket",
    Key = "documents/report.pdf",
    FilePath = @"C:\Documents\report.pdf"
};
await s3Client.PutObjectAsync(putRequest);

// Download a file
var getRequest = new GetObjectRequest
{
    BucketName = "my-windows-bucket",
    Key = "documents/report.pdf"
};
using var response = await s3Client.GetObjectAsync(getRequest);
```

## Using PowerShell with AWS Tools

```powershell
# Install AWS Tools for PowerShell
Install-Module -Name AWS.Tools.S3

# Set up endpoint
$endpoint = "http://192.168.1.100:80"
Set-AWSCredential -AccessKey "myaccesskey" -SecretKey "mysecretkey"

# List buckets
Get-S3Bucket -EndpointUrl $endpoint

# Upload directory
Write-S3Object -BucketName "my-windows-bucket" `
  -Folder "C:\Backups" `
  -KeyPrefix "backups/" `
  -EndpointUrl $endpoint `
  -Force
```

## Configuring HTTPS with Self-Signed Certificates

For production use, configure TLS on RGW and handle the certificate in Windows:

```powershell
# Import the RGW self-signed cert to the Windows trust store
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("C:\ceph-rgw.crt")
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "LocalMachine")
$store.Open("ReadWrite")
$store.Add($cert)
$store.Close()

# Test HTTPS connection
aws --endpoint-url https://s3.example.com s3 ls
```

## Summary

Accessing Ceph RGW from Windows requires no special Ceph client software - any AWS S3-compatible tool or SDK works. Configure the endpoint URL to point to your RGW service, set `ForcePathStyle = true` in SDK configurations, and use RGW-created user credentials. The AWS CLI, AWS SDK for .NET, and PowerShell AWS Tools all work out of the box. For production, configure HTTPS and import the RGW certificate into the Windows trust store.
