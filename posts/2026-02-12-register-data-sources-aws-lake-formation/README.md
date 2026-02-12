# How to Register Data Sources in AWS Lake Formation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lake Formation, Data Lake, S3

Description: Step-by-step instructions for registering S3 locations and other data sources in AWS Lake Formation so you can manage permissions through the Lake Formation model.

---

AWS Lake Formation sits on top of your data lake and controls who can access what. But before it can do anything, you need to register your data sources with it. Registration tells Lake Formation "this S3 location contains data you should manage" and from that point on, Lake Formation handles the permissions instead of raw IAM and S3 bucket policies.

This is a critical step that's easy to get wrong. If you skip it or misconfigure it, your Glue tables will still use IAM-based access instead of Lake Formation permissions, which defeats the whole purpose.

## What Registration Actually Does

When you register an S3 location with Lake Formation, you're telling it to manage access to data stored at that path. Lake Formation uses a service-linked role (or a custom role you specify) to vend temporary credentials to services like Athena and Glue when they need to read data from that location.

Without registration, access to your data is controlled entirely by IAM policies and S3 bucket policies. With registration, Lake Formation intercepts data access requests and checks its own permission model first.

## Prerequisites

Before registering data sources, make sure you've done these things:

1. Set up a Lake Formation administrator
2. Changed the default permission model to use Lake Formation (instead of IAM-only)
3. Created or identified the IAM role that Lake Formation will use to access S3

Here's how to set yourself as a Lake Formation admin:

```bash
# Register yourself as a Lake Formation administrator
aws lakeformation put-data-lake-settings \
    --data-lake-settings '{
        "DataLakeAdmins": [
            {"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:user/admin-user"}
        ],
        "CreateDatabaseDefaultPermissions": [],
        "CreateTableDefaultPermissions": []
    }'
```

Notice that `CreateDatabaseDefaultPermissions` and `CreateTableDefaultPermissions` are set to empty arrays. This is important - it removes the default "IAMAllowedPrincipals" grants that would bypass Lake Formation permissions entirely.

## Creating the Data Access Role

Lake Formation needs an IAM role to access your S3 data on behalf of users. This role must trust the Lake Formation service:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lakeformation.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```

And it needs permissions to read (and optionally write) your S3 data:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::my-data-lake-bucket",
                "arn:aws:s3:::my-data-lake-bucket/*"
            ]
        }
    ]
}
```

## Registering an S3 Location

Now you can register the S3 path:

```bash
# Register an S3 location with Lake Formation
# This tells Lake Formation to manage access to data at this path
aws lakeformation register-resource \
    --resource-arn "arn:aws:s3:::my-data-lake-bucket/data/" \
    --role-arn "arn:aws:iam::123456789012:role/LakeFormationDataAccessRole" \
    --use-service-linked-role false
```

If you want to use the Lake Formation service-linked role instead of a custom role:

```bash
# Register using the service-linked role
# Simpler setup but less control over the IAM permissions
aws lakeformation register-resource \
    --resource-arn "arn:aws:s3:::my-data-lake-bucket/data/" \
    --use-service-linked-role true
```

The service-linked role approach is simpler, but the custom role gives you more control over exactly which S3 paths the role can access.

## Registering Multiple Paths

You'll often want to register different S3 paths with different roles. For example, sensitive data might use a more restrictive role:

```bash
# Register general analytics data
aws lakeformation register-resource \
    --resource-arn "arn:aws:s3:::data-lake-bucket/analytics/" \
    --role-arn "arn:aws:iam::123456789012:role/LF-GeneralDataAccess"

# Register sensitive PII data with a more restrictive role
aws lakeformation register-resource \
    --resource-arn "arn:aws:s3:::data-lake-bucket/pii/" \
    --role-arn "arn:aws:iam::123456789012:role/LF-SensitiveDataAccess"

# Register raw ingestion zone
aws lakeformation register-resource \
    --resource-arn "arn:aws:s3:::data-lake-bucket/raw/" \
    --role-arn "arn:aws:iam::123456789012:role/LF-RawDataAccess"
```

## Verifying Registration

After registering, confirm it worked:

```bash
# List all registered resources
aws lakeformation list-resources

# Check a specific resource's registration status
aws lakeformation describe-resource \
    --resource-arn "arn:aws:s3:::my-data-lake-bucket/data/"
```

The output shows the resource ARN, the role being used, and whether the resource is active.

## Creating a Database Over Registered Data

With the S3 location registered, you can create a Glue database that points to it. Lake Formation will manage the permissions for any tables in this database:

```bash
# Create a Glue database pointing to the registered S3 location
aws glue create-database \
    --database-input '{
        "Name": "sales_analytics",
        "Description": "Sales analytics data lake tables",
        "LocationUri": "s3://my-data-lake-bucket/data/sales/"
    }'
```

Now grant permissions on this database through Lake Formation:

```bash
# Grant the data engineering team full access to the database
aws lakeformation grant-permissions \
    --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/DataEngineeringRole"}' \
    --resource '{"Database": {"Name": "sales_analytics"}}' \
    --permissions '["CREATE_TABLE", "DESCRIBE", "ALTER", "DROP"]'

# Grant the analytics team read-only access
aws lakeformation grant-permissions \
    --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/AnalyticsRole"}' \
    --resource '{"Database": {"Name": "sales_analytics"}}' \
    --permissions '["DESCRIBE"]'
```

## Handling Existing Tables

If you already have Glue tables pointing to S3 data that you're now registering with Lake Formation, you need to revoke the legacy IAM-based permissions:

```bash
# Remove the legacy IAMAllowedPrincipals grant from an existing database
aws lakeformation revoke-permissions \
    --principal '{"DataLakePrincipalIdentifier": "IAM_ALLOWED_PRINCIPALS"}' \
    --resource '{"Database": {"Name": "existing_database"}}' \
    --permissions '["ALL"]'

# Remove legacy grants from existing tables too
aws lakeformation revoke-permissions \
    --principal '{"DataLakePrincipalIdentifier": "IAM_ALLOWED_PRINCIPALS"}' \
    --resource '{
        "Table": {
            "DatabaseName": "existing_database",
            "TableWildcard": {}
        }
    }' \
    --permissions '["ALL"]'
```

This is the step most people forget, and it's why their Lake Formation permissions don't seem to work. If `IAM_ALLOWED_PRINCIPALS` still has grants, anyone with IAM permissions can bypass Lake Formation entirely.

## Registering Data Sources with CloudFormation

For infrastructure-as-code setups, here's a CloudFormation snippet:

```yaml
# CloudFormation template for registering S3 with Lake Formation
Resources:
  DataLakeResource:
    Type: AWS::LakeFormation::Resource
    Properties:
      ResourceArn: !Sub "arn:aws:s3:::${DataLakeBucket}/data/"
      RoleArn: !GetAtt LakeFormationDataAccessRole.Arn
      UseServiceLinkedRole: false

  LakeFormationDataAccessRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: LakeFormationDataAccessRole
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service: lakeformation.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: S3DataAccess
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:PutObject
                  - s3:DeleteObject
                  - s3:ListBucket
                Resource:
                  - !Sub "arn:aws:s3:::${DataLakeBucket}"
                  - !Sub "arn:aws:s3:::${DataLakeBucket}/*"
```

## Troubleshooting Common Issues

**"Access Denied" even after granting permissions** - Almost always caused by not revoking `IAM_ALLOWED_PRINCIPALS` grants or not registering the S3 location.

**Tables show up in Glue but not in Lake Formation** - The S3 location for those tables isn't registered. Register the parent path and the tables will appear in the Lake Formation permission model.

**Cross-account access doesn't work** - You need to register the S3 location in the account that owns the data, then share the tables through Lake Formation's cross-account sharing. The consumer account doesn't register the S3 location.

**Role trust issues** - Make sure the IAM role trusts `lakeformation.amazonaws.com` as a principal. Without this, Lake Formation can't assume the role to access your data.

Getting data source registration right is the foundation for everything else in Lake Formation. Once this is solid, you can move on to [tag-based access control](https://oneuptime.com/blog/post/aws-lake-formation-tag-based-access-control/view) for scalable permission management.
