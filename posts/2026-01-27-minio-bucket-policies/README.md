# How to Implement MinIO Bucket Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MinIO, S3, Object Storage, Security, Access Control, IAM, DevOps

Description: A comprehensive guide to implementing MinIO bucket policies for fine-grained access control, including policy syntax, user policies, conditions, and real-world examples.

---

> Bucket policies are the gatekeepers of your object storage. Get them right, and you have precise control over who accesses what. Get them wrong, and you either lock everyone out or expose sensitive data to the world.

MinIO implements AWS S3-compatible bucket policies, giving you the same powerful access control mechanisms used in cloud storage but on your own infrastructure. This guide walks through everything from basic policy syntax to advanced conditional access patterns.

## Understanding Policy Syntax

MinIO bucket policies follow the AWS IAM policy language. Every policy is a JSON document with a specific structure.
For MinIO bucket policies, the principal is typically `*` for anonymous access. For authenticated users and groups, create IAM policies without a `Principal` element and attach them with `mc admin policy attach`.

### Basic Policy Structure

```json
{
  "Version": "2012-10-17",

  "Statement": [
    {
      "Sid": "AllowReadAccess",

      "Effect": "Allow",

      "Principal": {
        "AWS": ["*"]
      },

      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],

      "Resource": [
        "arn:aws:s3:::my-bucket/*"
      ]
    }
  ]
}
```

### Common S3 Actions

Here are the most frequently used actions in bucket policies:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CommonActionsReference",
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": [
        "s3:ListBucket",
        "s3:ListBucketVersions",
        "s3:GetBucketLocation",
        "s3:GetBucketPolicy",
        "s3:PutBucketPolicy",
        "s3:DeleteBucketPolicy",

        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion",
        "s3:DeleteObjectVersion",

        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "arn:aws:s3:::example-bucket",
        "arn:aws:s3:::example-bucket/*"
      ]
    }
  ]
}
```

## Implementing Bucket Policies

Bucket policies attach directly to a bucket and control anonymous access. Use IAM policies for authenticated MinIO users, groups, and services.

### Read-Only Public Bucket

This policy allows anyone to read objects but prevents modifications.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadOnly",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::public-assets/*"
      ]
    },
    {
      "Sid": "PublicListBucket",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::public-assets"
      ]
    }
  ]
}
```

### Apply the Policy Using mc Client

```bash
# Save policy to a file

cat > public-read-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadOnly",
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::public-assets/*"]
    }
  ]
}
EOF

# Apply JSON anonymous policy to bucket
mc anonymous set-json public-read-policy.json myminio/public-assets

# Or use anonymous policy shorthand
mc anonymous set download myminio/public-assets
```

### Write-Only Upload Bucket

Allow unauthenticated uploads but prevent reading - useful for log collection or user submissions.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "WriteOnlyUploads",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": [
        "s3:PutObject",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "arn:aws:s3:::upload-inbox/*"
      ]
    },
    {
      "Sid": "DenyReadAccess",
      "Effect": "Deny",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::upload-inbox",
        "arn:aws:s3:::upload-inbox/*"
      ]
    }
  ]
}
```

## Implementing User Policies

User policies (also called IAM policies) attach to specific users or groups rather than buckets. They define what actions a user can perform across all buckets.

### Create a User with Limited Access

```bash
# Create a new user
mc admin user add myminio app-user app-secret-key

# Create a custom policy
cat > app-user-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AppUserAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::app-data",
        "arn:aws:s3:::app-data/*"
      ]
    }
  ]
}
EOF

# Create the policy in MinIO
mc admin policy create myminio app-user-policy app-user-policy.json

# Attach policy to user
mc admin policy attach myminio app-user-policy --user app-user
```

### Group-Based Access Control

```bash
# Create a group
mc admin group add myminio developers dev-user1 dev-user2

# Create developer policy with broad read access
cat > developer-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DeveloperReadAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:ListBucket",
        "s3:ListBucketVersions"
      ],
      "Resource": [
        "arn:aws:s3:::dev-*",
        "arn:aws:s3:::dev-*/*",
        "arn:aws:s3:::staging-*",
        "arn:aws:s3:::staging-*/*"
      ]
    },
    {
      "Sid": "DeveloperWriteAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::dev-*/*"
      ]
    }
  ]
}
EOF

# Create and attach to group
mc admin policy create myminio developer-policy developer-policy.json
mc admin policy attach myminio developer-policy --group developers
```

## Policy Conditions

Conditions add fine-grained control based on request context like IP address, time, headers, or object metadata.

### Condition Operators

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ConditionOperatorsExample",
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:ListBucket"],
      "Resource": ["arn:aws:s3:::example"],
      "Condition": {
        "StringEquals": {
          "s3:prefix": "public/"
        },
        "StringLike": {
          "s3:prefix": "reports/*"
        },
        "StringNotEquals": {
          "s3:prefix": "private/"
        },

        "IpAddress": {
          "aws:SourceIp": "192.168.1.0/24"
        },
        "NotIpAddress": {
          "aws:SourceIp": "10.0.0.0/8"
        },

        "DateGreaterThan": {
          "aws:CurrentTime": "2024-01-01T00:00:00Z"
        },
        "DateLessThan": {
          "aws:CurrentTime": "2025-12-31T23:59:59Z"
        },

        "NumericLessThanEquals": {
          "s3:max-keys": "100"
        }
      }
    }
  ]
}
```

### Available Condition Keys

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ConditionKeysReference",
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:ListBucket"],
      "Resource": ["arn:aws:s3:::example"],
      "Condition": {
        "StringLike": {
          "aws:username": "specific-user",
          "aws:userid": "user-id-value",
          "aws:UserAgent": "my-app/1.0",
          "s3:prefix": "folder/*",
          "s3:delimiter": "/"
        },
        "IpAddress": {
          "aws:SourceIp": "203.0.113.0/24"
        },
        "DateLessThan": {
          "aws:CurrentTime": "2024-06-15T12:00:00Z"
        },
        "Bool": {
          "aws:SecureTransport": "true"
        },
        "NumericLessThanEquals": {
          "s3:max-keys": "1000"
        }
      }
    }
  ]
}
```

## Configuring Public Access

Public access should be carefully controlled. Here are patterns for different public access scenarios.

### Static Website Hosting

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "StaticWebsiteAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::website-bucket/*"
      ]
    },
    {
      "Sid": "DenyConfigAccess",
      "Effect": "Deny",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::website-bucket/.env",
        "arn:aws:s3:::website-bucket/config/*",
        "arn:aws:s3:::website-bucket/.git/*"
      ]
    }
  ]
}
```

### CDN Origin Access

Allow a CDN to access objects but block direct public access.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CDNOriginAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::cdn-origin/*"
      ],
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": [
            "173.245.48.0/20",
            "103.21.244.0/22",
            "103.22.200.0/22",
            "103.31.4.0/22",
            "141.101.64.0/18",
            "108.162.192.0/18",
            "190.93.240.0/20",
            "188.114.96.0/20",
            "197.234.240.0/22",
            "198.41.128.0/17"
          ]
        }
      }
    },
    {
      "Sid": "DenyDirectAccess",
      "Effect": "Deny",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::cdn-origin/*"
      ],
      "Condition": {
        "NotIpAddress": {
          "aws:SourceIp": [
            "173.245.48.0/20",
            "103.21.244.0/22",
            "103.22.200.0/22"
          ]
        }
      }
    }
  ]
}
```

## Prefix-Based Access Control

Organize access by object key prefixes to create virtual directories with different permissions.

### Multi-Tenant Bucket

Attach this policy to users whose usernames match their tenant prefix.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TenantListAccess",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::multi-tenant-bucket"
      ],
      "Condition": {
        "StringLike": {
          "s3:prefix": ["${aws:username}/*"]
        }
      }
    },
    {
      "Sid": "TenantObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::multi-tenant-bucket/${aws:username}/*"
      ]
    }
  ]
}
```

### Environment-Based Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DevEnvironmentAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::app-data/dev/*"
      ],
      "Condition": {
        "StringEquals": {
          "aws:groups": "developers"
        }
      }
    },
    {
      "Sid": "StagingReadOnly",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::app-data/staging/*"
      ],
      "Condition": {
        "StringEquals": {
          "aws:groups": "developers"
        }
      }
    },
    {
      "Sid": "ProductionAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::app-data/prod/*"
      ],
      "Condition": {
        "StringEquals": {
          "aws:groups": "operations"
        }
      }
    },
    {
      "Sid": "DenyDevProduction",
      "Effect": "Deny",
      "Action": [
        "s3:*"
      ],
      "Resource": [
        "arn:aws:s3:::app-data/prod/*"
      ],
      "Condition": {
        "StringEquals": {
          "aws:groups": "developers"
        }
      }
    }
  ]
}
```

## Time-Based Access Control

Restrict access based on absolute time windows for compliance, maintenance, or temporary access grants.

### Project Window Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProjectWindowAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::project-files/*"
      ],
      "Condition": {
        "DateGreaterThan": {
          "aws:CurrentTime": "2024-01-01T09:00:00Z"
        },
        "DateLessThan": {
          "aws:CurrentTime": "2024-12-31T18:00:00Z"
        }
      }
    }
  ]
}
```

### Temporary Access Grant

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TemporaryAuditAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::financial-records",
        "arn:aws:s3:::financial-records/2023/*"
      ],
      "Condition": {
        "DateGreaterThan": {
          "aws:CurrentTime": "2024-01-15T00:00:00Z"
        },
        "DateLessThan": {
          "aws:CurrentTime": "2024-01-31T23:59:59Z"
        }
      }
    }
  ]
}
```

### One-Time Maintenance Window Lockdown

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MaintenanceWindowDeny",
      "Effect": "Deny",
      "Action": [
        "s3:*"
      ],
      "Resource": [
        "arn:aws:s3:::critical-data",
        "arn:aws:s3:::critical-data/*"
      ],
      "Condition": {
        "DateGreaterThan": {
          "aws:CurrentTime": "2024-01-01T02:00:00Z"
        },
        "DateLessThan": {
          "aws:CurrentTime": "2024-01-01T04:00:00Z"
        }
      }
    },
    {
      "Sid": "NormalAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::critical-data/*"
      ]
    }
  ]
}
```

## Best Practices Summary

**Policy Design**
- Start with deny-all, then add specific allows
- Use the principle of least privilege - grant only what is needed
- Prefer user/group policies over bucket policies for internal access control
- Use bucket policies for public and anonymous access rules

**Security**
- Never use wildcards in Principal for Allow statements on sensitive buckets
- Always require HTTPS using the `aws:SecureTransport` condition
- Regularly audit policies using `mc admin policy ls` and `mc admin user info`
- Use IP restrictions for administrative operations

**Organization**
- Name policies descriptively: `readonly-public-assets` not `policy1`
- Document the purpose of each statement using the Sid field
- Version control your policies alongside infrastructure code
- Test policies in a staging environment before production

**Maintenance**
- Review policies quarterly for unnecessary permissions
- Remove temporary access grants promptly after expiration
- Monitor access patterns to identify overly permissive policies
- Use MinIO audit logs to track policy violations

**Common Pitfalls to Avoid**
- Forgetting that Deny always overrides Allow
- Not including both bucket ARN and object ARN (`bucket` and `bucket/*`)
- Using `s3:*` when specific actions would suffice
- Ignoring policy evaluation precedence in complex setups

---

Bucket policies are powerful but unforgiving. A misconfigured policy can either expose your data to the world or lock out your own applications. Test thoroughly, start restrictive, and expand access only as needed.

For comprehensive monitoring of your MinIO infrastructure and alerting on policy violations, check out [OneUptime](https://oneuptime.com) - an open-source observability platform that helps you stay on top of your storage security.
