# How to Implement MinIO Bucket Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MinIO, S3, Object Storage, Security, Access Control, IAM, DevOps

Description: A comprehensive guide to implementing MinIO bucket policies for fine-grained access control, including policy syntax, user policies, conditions, and real-world examples.

---

> Bucket policies are the gatekeepers of your object storage. Get them right, and you have precise control over who accesses what. Get them wrong, and you either lock everyone out or expose sensitive data to the world.

MinIO implements AWS S3-compatible bucket policies, giving you the same powerful access control mechanisms used in cloud storage but on your own infrastructure. This guide walks through everything from basic policy syntax to advanced conditional access patterns.

## Understanding Policy Syntax

MinIO bucket policies follow the AWS IAM policy language. Every policy is a JSON document with a specific structure.

### Basic Policy Structure

```json
{
  // Version must always be "2012-10-17" for compatibility
  "Version": "2012-10-17",

  // Statement array contains one or more access rules
  "Statement": [
    {
      // Unique identifier for this statement (optional but recommended)
      "Sid": "AllowReadAccess",

      // Effect: either "Allow" or "Deny"
      "Effect": "Allow",

      // Principal: who this policy applies to
      // Use "*" for anonymous access or specify users/groups
      "Principal": {
        "AWS": ["*"]
      },

      // Action: what operations are permitted or denied
      // Use "s3:*" for all actions or specify individual ones
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],

      // Resource: which buckets/objects this applies to
      // Format: arn:aws:s3:::bucket-name/optional-prefix/*
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
        // Bucket-level actions
        "s3:ListBucket",           // List objects in bucket
        "s3:ListBucketVersions",   // List object versions
        "s3:GetBucketLocation",    // Get bucket region
        "s3:GetBucketPolicy",      // Read bucket policy
        "s3:PutBucketPolicy",      // Write bucket policy
        "s3:DeleteBucketPolicy",   // Remove bucket policy

        // Object-level actions
        "s3:GetObject",            // Download objects
        "s3:PutObject",            // Upload objects
        "s3:DeleteObject",         // Remove objects
        "s3:GetObjectVersion",     // Get specific version
        "s3:DeleteObjectVersion",  // Delete specific version

        // Multipart upload actions
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

Bucket policies attach directly to a bucket and control access for all principals (users, services, anonymous requests).

### Read-Only Public Bucket

This policy allows anyone to read objects but prevents modifications.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      // Allow public read access to all objects
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
      // Allow listing bucket contents publicly
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

# Apply policy to bucket
mc admin policy attach myminio public-read-policy.json --bucket public-assets

# Or use anonymous policy shorthand
mc anonymous set download myminio/public-assets
```

### Write-Only Upload Bucket

Allow uploads but prevent reading - useful for log collection or user submissions.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      // Allow uploads from any authenticated user
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
      // Explicitly deny read operations
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
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::example/*"],
      "Condition": {
        // String conditions
        "StringEquals": {
          "s3:prefix": "public/"
        },
        "StringLike": {
          "s3:prefix": "reports/*"
        },
        "StringNotEquals": {
          "s3:prefix": "private/"
        },

        // IP address conditions
        "IpAddress": {
          "aws:SourceIp": "192.168.1.0/24"
        },
        "NotIpAddress": {
          "aws:SourceIp": "10.0.0.0/8"
        },

        // Date/time conditions
        "DateGreaterThan": {
          "aws:CurrentTime": "2024-01-01T00:00:00Z"
        },
        "DateLessThan": {
          "aws:CurrentTime": "2025-12-31T23:59:59Z"
        },

        // Numeric conditions
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
      "Action": ["s3:*"],
      "Resource": ["arn:aws:s3:::example/*"],
      "Condition": {
        // AWS global condition keys
        "StringEquals": {
          "aws:username": "specific-user",      // Username making request
          "aws:userid": "user-id-value",        // User ID
          "aws:SourceIp": "203.0.113.0/24",     // Client IP address
          "aws:CurrentTime": "2024-06-15T12:00:00Z", // Request timestamp
          "aws:SecureTransport": "true",        // HTTPS required
          "aws:UserAgent": "my-app/1.0"         // Client user agent
        },

        // S3-specific condition keys
        "StringLike": {
          "s3:prefix": "folder/*",              // Object key prefix
          "s3:delimiter": "/",                  // Listing delimiter
          "s3:x-amz-content-sha256": "*"        // Content hash
        },
        "NumericLessThanEquals": {
          "s3:max-keys": "1000"                 // Max listing results
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
      // Allow public access to website files
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
      // Block access to configuration files
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
      // Allow access only from CDN IP ranges
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
        // Cloudflare IP ranges (example)
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
      // Deny all other public access
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

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      // Tenant A can only access their prefix
      "Sid": "TenantAAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::account:user/tenant-a"]
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::multi-tenant-bucket"
      ],
      "Condition": {
        // Restrict listing to their prefix only
        "StringLike": {
          "s3:prefix": ["tenant-a/*"]
        }
      }
    },
    {
      "Sid": "TenantAObjectAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::account:user/tenant-a"]
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::multi-tenant-bucket/tenant-a/*"
      ]
    },
    {
      // Tenant B can only access their prefix
      "Sid": "TenantBAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::account:user/tenant-b"]
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::multi-tenant-bucket"
      ],
      "Condition": {
        "StringLike": {
          "s3:prefix": ["tenant-b/*"]
        }
      }
    },
    {
      "Sid": "TenantBObjectAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::account:user/tenant-b"]
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::multi-tenant-bucket/tenant-b/*"
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
      // Developers can read/write to dev prefix
      "Sid": "DevEnvironmentAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::account:group/developers"]
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::app-data/dev/*"
      ]
    },
    {
      // Developers can only read staging
      "Sid": "StagingReadOnly",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::account:group/developers"]
      },
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::app-data/staging/*"
      ]
    },
    {
      // Only ops team can access production
      "Sid": "ProductionAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::account:group/operations"]
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::app-data/prod/*"
      ]
    },
    {
      // Explicitly deny developers from production
      "Sid": "DenyDevProduction",
      "Effect": "Deny",
      "Principal": {
        "AWS": ["arn:aws:iam::account:group/developers"]
      },
      "Action": [
        "s3:*"
      ],
      "Resource": [
        "arn:aws:s3:::app-data/prod/*"
      ]
    }
  ]
}
```

## Time-Based Access Control

Restrict access based on time windows for compliance, maintenance, or temporary access grants.

### Business Hours Only Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      // Allow access only during business hours (UTC)
      "Sid": "BusinessHoursAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::account:user/contractor"]
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::project-files/*"
      ],
      "Condition": {
        // Access allowed Monday-Friday, 9 AM - 6 PM UTC
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
      // Grant temporary access for a specific time window
      "Sid": "TemporaryAuditAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::account:user/external-auditor"]
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::financial-records",
        "arn:aws:s3:::financial-records/2023/*"
      ],
      "Condition": {
        // Valid from January 15 to January 31, 2024
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

### Maintenance Window Lockdown

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      // Deny all access during maintenance window
      "Sid": "MaintenanceWindowDeny",
      "Effect": "Deny",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": [
        "s3:*"
      ],
      "Resource": [
        "arn:aws:s3:::critical-data",
        "arn:aws:s3:::critical-data/*"
      ],
      "Condition": {
        // Maintenance window: Sundays 2-4 AM UTC
        "DateGreaterThan": {
          "aws:CurrentTime": "2024-01-01T02:00:00Z"
        },
        "DateLessThan": {
          "aws:CurrentTime": "2024-01-01T04:00:00Z"
        }
      }
    },
    {
      // Allow normal access outside maintenance window
      "Sid": "NormalAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::account:group/app-services"]
      },
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
- Use bucket policies for cross-account access and public access rules

**Security**
- Never use wildcards in Principal for Allow statements on sensitive buckets
- Always require HTTPS using the `aws:SecureTransport` condition
- Regularly audit policies using `mc admin policy list` and `mc admin user info`
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
- Ignoring the order of policy evaluation in complex setups

---

Bucket policies are powerful but unforgiving. A misconfigured policy can either expose your data to the world or lock out your own applications. Test thoroughly, start restrictive, and expand access only as needed.

For comprehensive monitoring of your MinIO infrastructure and alerting on policy violations, check out [OneUptime](https://oneuptime.com) - an open-source observability platform that helps you stay on top of your storage security.
