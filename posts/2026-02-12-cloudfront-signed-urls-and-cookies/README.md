# How to Set Up CloudFront Signed URLs and Cookies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFront, Security, Access Control

Description: Complete guide to implementing CloudFront signed URLs and signed cookies for restricting access to premium content, downloads, and private media.

---

When you need to restrict access to content served through CloudFront - think premium videos, paid downloads, or private documents - signed URLs and signed cookies are your tools. They let you control who can access what, and for how long, without changing anything in your origin. Let's walk through both approaches, when to use each, and how to implement them.

## Signed URLs vs Signed Cookies

**Signed URLs** include the signature in the URL itself. Each URL grants access to a single resource. Good for:
- Individual file downloads
- Links shared via email
- API responses that return file URLs

**Signed cookies** set cookies in the browser that grant access to multiple resources matching a pattern. Good for:
- Video streaming (HLS/DASH with many segment files)
- Subscription content with many pages
- Any scenario where users need access to multiple files

## Step 1: Create a Key Group

CloudFront uses key pairs to sign URLs and cookies. The modern approach uses key groups with public keys you manage, rather than the legacy CloudFront key pairs that required root account access.

First, generate an RSA key pair:

```bash
# Generate a 2048-bit RSA private key
openssl genrsa -out private_key.pem 2048

# Extract the public key
openssl rsa -pubout -in private_key.pem -out public_key.pem
```

Upload the public key to CloudFront:

```bash
# Upload the public key to CloudFront
aws cloudfront create-public-key \
  --public-key-config '{
    "CallerReference": "my-key-001",
    "Name": "content-signing-key",
    "EncodedKey": "'"$(cat public_key.pem)"'",
    "Comment": "Key for signing premium content URLs"
  }'
```

Note the public key ID from the output. Now create a key group:

```bash
# Create a key group with the public key
aws cloudfront create-key-group \
  --key-group-config '{
    "Name": "premium-content-signers",
    "Items": ["K2JCJMDQS1EIOO"],
    "Comment": "Key group for premium content access"
  }'
```

## Step 2: Configure the Distribution

Update your CloudFront distribution to require signed URLs or cookies for specific behaviors:

```json
{
  "PathPattern": "/premium/*",
  "TargetOriginId": "s3-premium-content",
  "ViewerProtocolPolicy": "https-only",
  "AllowedMethods": ["GET", "HEAD"],
  "CachedMethods": ["GET", "HEAD"],
  "TrustedKeyGroups": {
    "Enabled": true,
    "Quantity": 1,
    "Items": ["abc123-key-group-id"]
  },
  "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
}
```

The `TrustedKeyGroups` setting is what makes CloudFront require a valid signature. Without a signature, users get a 403 error.

```bash
# Update the distribution with the restricted behavior
aws cloudfront update-distribution \
  --id E1234567890 \
  --distribution-config file://restricted-config.json \
  --if-match ETAG_VALUE
```

## Step 3: Generate Signed URLs

Here's how to generate signed URLs in your application. The signature includes the resource URL, expiration time, and optionally an IP restriction.

Using Node.js:

```javascript
const crypto = require('crypto');
const fs = require('fs');

// Load the private key
const privateKey = fs.readFileSync('private_key.pem', 'utf8');

function createSignedUrl(url, keyPairId, expiresInSeconds) {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

  // Create the policy
  const policy = JSON.stringify({
    Statement: [{
      Resource: url,
      Condition: {
        DateLessThan: { 'AWS:EpochTime': expires }
      }
    }]
  });

  // Sign the policy
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(policy);
  const signature = signer.sign(privateKey, 'base64');

  // Make the signature URL-safe
  const urlSafeSignature = signature
    .replace(/\+/g, '-')
    .replace(/=/g, '_')
    .replace(/\//g, '~');

  const urlSafePolicy = Buffer.from(policy).toString('base64')
    .replace(/\+/g, '-')
    .replace(/=/g, '_')
    .replace(/\//g, '~');

  return `${url}?Policy=${urlSafePolicy}&Signature=${urlSafeSignature}&Key-Pair-Id=${keyPairId}`;
}

// Generate a signed URL that expires in 1 hour
const signedUrl = createSignedUrl(
  'https://d1234abcdef.cloudfront.net/premium/video.mp4',
  'K2JCJMDQS1EIOO',
  3600
);
console.log(signedUrl);
```

Using Python with boto3:

```python
from botocore.signers import CloudFrontSigner
from datetime import datetime, timedelta
import rsa

def rsa_signer(message):
    """Sign a message using the private key."""
    with open('private_key.pem', 'rb') as key_file:
        private_key = rsa.PrivateKey.load_pkcs1(key_file.read())
    return rsa.sign(message, private_key, 'SHA-1')

# Create a CloudFront signer
key_id = 'K2JCJMDQS1EIOO'
cf_signer = CloudFrontSigner(key_id, rsa_signer)

# Generate a signed URL expiring in 1 hour
url = 'https://d1234abcdef.cloudfront.net/premium/video.mp4'
expires = datetime.utcnow() + timedelta(hours=1)

signed_url = cf_signer.generate_presigned_url(
    url,
    date_less_than=expires
)
print(signed_url)
```

## Step 4: Generate Signed Cookies

For signed cookies, you generate three cookies that together grant access. Here's the Python approach:

```python
from botocore.signers import CloudFrontSigner
from datetime import datetime, timedelta
import json
import rsa

def rsa_signer(message):
    with open('private_key.pem', 'rb') as key_file:
        private_key = rsa.PrivateKey.load_pkcs1(key_file.read())
    return rsa.sign(message, private_key, 'SHA-1')

key_id = 'K2JCJMDQS1EIOO'

# Create a custom policy that grants access to all premium content
policy = json.dumps({
    "Statement": [{
        "Resource": "https://d1234abcdef.cloudfront.net/premium/*",
        "Condition": {
            "DateLessThan": {
                "AWS:EpochTime": int((datetime.utcnow() + timedelta(hours=24)).timestamp())
            }
        }
    }]
}).replace(" ", "")

# Sign the policy
cf_signer = CloudFrontSigner(key_id, rsa_signer)

# Get the signed cookie values
cookies = cf_signer.build_custom_policy(
    'https://d1234abcdef.cloudfront.net/premium/*',
    date_less_than=datetime.utcnow() + timedelta(hours=24)
)

# In your web framework, set these three cookies:
# CloudFront-Policy = base64_encoded_policy
# CloudFront-Signature = signature
# CloudFront-Key-Pair-Id = K2JCJMDQS1EIOO
```

In an Express.js application, setting the cookies:

```javascript
app.get('/login/premium', async (req, res) => {
  // Verify user has premium access (your auth logic here)
  if (!userHasPremiumAccess(req.user)) {
    return res.status(403).json({ error: 'Premium access required' });
  }

  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Generate the signed cookie values
  const cookieValues = generateSignedCookies(
    'https://d1234abcdef.cloudfront.net/premium/*',
    expires
  );

  // Set all three cookies
  const cookieOptions = {
    domain: '.example.com',
    path: '/',
    httpOnly: true,
    secure: true,
    expires: expires
  };

  res.cookie('CloudFront-Policy', cookieValues.policy, cookieOptions);
  res.cookie('CloudFront-Signature', cookieValues.signature, cookieOptions);
  res.cookie('CloudFront-Key-Pair-Id', cookieValues.keyPairId, cookieOptions);

  res.json({ message: 'Premium access granted' });
});
```

## Advanced: IP-Restricted Signed URLs

You can restrict signed URLs to specific IP addresses or ranges:

```python
# Custom policy with IP restriction
policy = {
    "Statement": [{
        "Resource": "https://d1234abcdef.cloudfront.net/premium/report.pdf",
        "Condition": {
            "DateLessThan": {
                "AWS:EpochTime": int((datetime.utcnow() + timedelta(hours=1)).timestamp())
            },
            "IpAddress": {
                "AWS:SourceIp": "203.0.113.0/24"
            }
        }
    }]
}
```

This is useful for corporate environments where you want to ensure the signed URL only works from the company's IP range.

## Canned vs Custom Policies

**Canned policies** are simpler - they only include the resource URL and expiration time. The policy isn't included in the URL, making the signed URL shorter.

**Custom policies** support wildcards in the resource URL, IP restrictions, and explicit start times (for content that shouldn't be accessible before a certain time). The policy is included in the URL.

Use canned policies for individual file access. Use custom policies when you need wildcards, IP restrictions, or time windowing.

## Key Rotation

Periodically rotate your signing keys:

1. Generate a new key pair
2. Upload the new public key to CloudFront
3. Add the new key to your key group
4. Update your application to sign with the new private key
5. Wait for existing signed URLs/cookies to expire
6. Remove the old key from the key group
7. Delete the old public key from CloudFront

```bash
# Add a new key to the existing key group
aws cloudfront update-key-group \
  --id abc123-key-group-id \
  --key-group-config '{
    "Name": "premium-content-signers",
    "Items": ["K2JCJMDQS1EIOO", "K3NEWKEY123ABC"],
    "Comment": "Key group with rotation in progress"
  }' \
  --if-match ETAG_VALUE
```

During rotation, both old and new keys are valid, so there's no downtime.

## Summary

CloudFront signed URLs and cookies provide fine-grained access control for premium or private content. Use signed URLs for individual file access and signed cookies for multiple-resource access patterns like video streaming. Key groups with managed public keys are the modern approach - avoid the legacy CloudFront key pairs. Always use HTTPS, set appropriate expiration times, and plan for key rotation from the start.
