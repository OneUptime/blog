# How to Configure DNSSEC with AWS Route 53

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, AWS, Route 53, DNS, Security, Cloud

Description: A comprehensive guide to enabling DNSSEC on AWS Route 53, covering console and CLI configuration, KMS key management, chain of trust establishment, and troubleshooting common issues.

---

DNS is the phonebook of the internet, but unlike a locked filing cabinet, traditional DNS responses travel in plain text with no way to verify their authenticity. An attacker positioned between you and your DNS resolver can swap legitimate IP addresses for malicious ones, redirecting your users to phishing sites, intercepting API calls, or hijacking email delivery. This class of attack, known as DNS spoofing or cache poisoning, has been exploited in the wild for decades. DNSSEC (Domain Name System Security Extensions) solves this by cryptographically signing DNS records so resolvers can verify responses have not been tampered with.

AWS Route 53 added DNSSEC signing support in late 2020, and since then the feature has matured considerably. This guide walks through every step required to enable DNSSEC on your Route 53 hosted zones, from creating the KMS key that protects your signing keys to establishing the chain of trust with your domain registrar and validating that everything works.

---

## What DNSSEC Actually Protects

Before diving into configuration, it helps to understand what DNSSEC does and does not do.

**DNSSEC provides:**

- **Data integrity**: Resolvers can cryptographically verify that DNS responses have not been modified in transit.
- **Authentication of denial**: DNSSEC can prove that a domain or record does not exist, preventing attackers from injecting fake "no such domain" responses.
- **Chain of trust**: Each level of the DNS hierarchy signs the next, creating an unbroken chain from the root zone down to your domain.

**DNSSEC does not provide:**

- **Confidentiality**: DNS queries and responses are still visible to anyone on the network. DNSSEC signs data but does not encrypt it.
- **Protection against compromised authoritative servers**: If an attacker gains control of your Route 53 hosted zone, DNSSEC will happily sign their malicious records.
- **DDoS mitigation**: DNSSEC adds larger response sizes, which can actually amplify reflection attacks if not managed carefully.

With expectations set, let's configure it.

---

## Prerequisites

Before enabling DNSSEC, ensure you have:

1. **A public hosted zone in Route 53**: DNSSEC signing is only available for public hosted zones, not private ones.
2. **IAM permissions**: You need permissions for Route 53, KMS, and optionally CloudWatch Logs.
3. **AWS CLI v2 installed**: For command-line configuration steps.
4. **Access to your domain registrar**: You will need to add a DS (Delegation Signer) record at the registrar level to complete the chain of trust.

---

## Architecture Overview

Route 53 DNSSEC uses a two-tier key hierarchy:

```
                    +-----------------------+
                    |      Root Zone        |
                    |   (ICANN managed)     |
                    +-----------------------+
                              |
                              | DS Record
                              v
                    +-----------------------+
                    |    TLD Zone (.com)    |
                    | (Registry managed)    |
                    +-----------------------+
                              |
                              | DS Record (you add this)
                              v
                    +-----------------------+
                    |   Your Hosted Zone    |
                    |    (Route 53)         |
                    +-----------------------+
                              |
                              | DNSKEY, RRSIG records
                              v
                    +-----------------------+
                    | Key Signing Key (KSK) |
                    |   (KMS protected)     |
                    +-----------------------+
                              |
                              | Signs ZSK
                              v
                    +-----------------------+
                    | Zone Signing Key(ZSK) |
                    |  (Route 53 managed)   |
                    +-----------------------+
```

- **Key Signing Key (KSK)**: A long-lived key stored in AWS KMS that signs the Zone Signing Key. You create and manage the KMS key.
- **Zone Signing Key (ZSK)**: A shorter-lived key that Route 53 automatically manages and rotates. It signs your actual DNS records.
- **DS Record**: A hash of your KSK's public key that you publish at your registrar to establish the chain of trust.

---

## Step 1: Create a KMS Key for DNSSEC

Route 53 DNSSEC requires a customer-managed KMS key in the **us-east-1** region. This is a hard requirement because Route 53 is a global service with its control plane in us-east-1.

### Using the AWS Console

1. Navigate to the **KMS Console** at https://console.aws.amazon.com/kms/home?region=us-east-1
2. Click **Create key**
3. Configure the key:
   - **Key type**: Asymmetric
   - **Key usage**: Sign and verify
   - **Key spec**: ECC_NIST_P256 (required for DNSSEC)
4. Click **Next**
5. Add a key alias: `alias/dnssec-example-com` (use your domain name)
6. Add a description: "KSK for example.com DNSSEC signing"
7. Click **Next**
8. Define key administrative permissions (select IAM users/roles who can manage this key)
9. Click **Next**
10. Define key usage permissions. You must add the Route 53 service principal. Add this policy statement:

```json
{
    "Sid": "Allow Route 53 DNSSEC Service",
    "Effect": "Allow",
    "Principal": {
        "Service": "dnssec-route53.amazonaws.com"
    },
    "Action": [
        "kms:DescribeKey",
        "kms:GetPublicKey",
        "kms:Sign"
    ],
    "Resource": "*",
    "Condition": {
        "StringEquals": {
            "aws:SourceAccount": "YOUR_ACCOUNT_ID"
        },
        "ArnLike": {
            "aws:SourceArn": "arn:aws:route53:::hostedzone/*"
        }
    }
}
```

11. Review and click **Create key**

### Using the AWS CLI

First, create a key policy file:

```bash
cat > /tmp/dnssec-key-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Id": "dnssec-key-policy",
    "Statement": [
        {
            "Sid": "Enable IAM User Permissions",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:root"
            },
            "Action": "kms:*",
            "Resource": "*"
        },
        {
            "Sid": "Allow Route 53 DNSSEC Service",
            "Effect": "Allow",
            "Principal": {
                "Service": "dnssec-route53.amazonaws.com"
            },
            "Action": [
                "kms:DescribeKey",
                "kms:GetPublicKey",
                "kms:Sign"
            ],
            "Resource": "*",
            "Condition": {
                "StringEquals": {
                    "aws:SourceAccount": "YOUR_ACCOUNT_ID"
                },
                "ArnLike": {
                    "aws:SourceArn": "arn:aws:route53:::hostedzone/*"
                }
            }
        }
    ]
}
EOF
```

Replace `YOUR_ACCOUNT_ID` with your actual AWS account ID:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
sed -i '' "s/YOUR_ACCOUNT_ID/$ACCOUNT_ID/g" /tmp/dnssec-key-policy.json
```

Create the KMS key:

```bash
aws kms create-key \
    --region us-east-1 \
    --key-spec ECC_NIST_P256 \
    --key-usage SIGN_VERIFY \
    --description "KSK for example.com DNSSEC signing" \
    --policy file:///tmp/dnssec-key-policy.json
```

Note the `KeyId` from the output. Create an alias for easier reference:

```bash
aws kms create-alias \
    --region us-east-1 \
    --alias-name alias/dnssec-example-com \
    --target-key-id YOUR_KEY_ID
```

---

## Step 2: Enable DNSSEC Signing on Your Hosted Zone

With the KMS key in place, you can now enable DNSSEC signing on your Route 53 hosted zone.

### Using the AWS Console

1. Navigate to the **Route 53 Console** at https://console.aws.amazon.com/route53/
2. Click **Hosted zones** in the left navigation
3. Select your hosted zone (e.g., `example.com`)
4. Click the **DNSSEC signing** tab
5. Click **Enable DNSSEC signing**
6. In the dialog:
   - **Key Signing Key (KSK) name**: Enter a descriptive name like `ksk-example-com-2026`
   - **Customer managed CMK**: Select the KMS key you created (`alias/dnssec-example-com`)
7. Click **Enable DNSSEC signing**

Route 53 will now:
- Create a Key Signing Key (KSK) using your KMS key
- Generate a Zone Signing Key (ZSK)
- Sign all existing records in your hosted zone
- Add DNSKEY and RRSIG records

This process typically takes 1-2 minutes.

### Using the AWS CLI

First, get your hosted zone ID:

```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='example.com.'].Id" --output text
```

The output will look like `/hostedzone/Z1234567890ABC`. Extract just the ID portion.

Create the Key Signing Key:

```bash
HOSTED_ZONE_ID="Z1234567890ABC"
KMS_KEY_ARN="arn:aws:kms:us-east-1:YOUR_ACCOUNT_ID:key/YOUR_KEY_ID"

aws route53 create-key-signing-key \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --key-management-service-arn $KMS_KEY_ARN \
    --name "ksk-example-com-2026" \
    --status ACTIVE
```

Enable DNSSEC signing for the hosted zone:

```bash
aws route53 enable-hosted-zone-dnssec \
    --hosted-zone-id $HOSTED_ZONE_ID
```

Check the status:

```bash
aws route53 get-dnssec \
    --hosted-zone-id $HOSTED_ZONE_ID
```

You should see output indicating signing is active with both KSK and ZSK present.

---

## Step 3: Retrieve the DS Record

The DS (Delegation Signer) record contains a hash of your KSK's public key. You must add this record at your domain registrar to establish the chain of trust.

### Using the AWS Console

1. In the Route 53 console, select your hosted zone
2. Click the **DNSSEC signing** tab
3. Under **Key signing keys (KSKs)**, click on your KSK name
4. Scroll down to **Establish chain of trust**
5. You will see the DS record information:
   - **Key tag**: A numeric identifier
   - **Algorithm**: 13 (ECDSAP256SHA256)
   - **Digest type**: 2 (SHA-256)
   - **Digest**: The hash value

Copy these values for the next step.

### Using the AWS CLI

```bash
aws route53 get-dnssec \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --query 'KeySigningKeys[?Status==`ACTIVE`].{Name:Name,KeyTag:KeyTag,DigestAlgorithmType:DigestAlgorithmType,DigestValue:DigestValue,PublicKey:PublicKey}' \
    --output table
```

Alternatively, get the DS record in BIND format:

```bash
aws route53 get-dnssec \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --query 'KeySigningKeys[0].DSRecord' \
    --output text
```

This outputs something like:

```
12345 13 2 1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF
```

Where:
- `12345` is the key tag
- `13` is the algorithm (ECDSAP256SHA256)
- `2` is the digest type (SHA-256)
- The hex string is the digest

---

## Step 4: Add the DS Record at Your Registrar

This step varies depending on your domain registrar. Here are instructions for common registrars:

### AWS Route 53 Registrar

If Route 53 is also your registrar (you registered the domain through AWS):

1. Navigate to **Route 53 > Registered domains**
2. Select your domain
3. Click **Manage keys** in the DNSSEC section
4. Click **Add key**
5. Enter the values from the DS record:
   - **Key type**: KSK
   - **Algorithm**: 13 - ECDSAP256SHA256
   - **Public key**: Paste the public key from Route 53

Using the CLI:

```bash
aws route53domains associate-delegation-signer-to-domain \
    --domain-name example.com \
    --signing-attributes "{\"Algorithm\":13,\"Flags\":257,\"PublicKey\":\"YOUR_PUBLIC_KEY\"}"
```

### GoDaddy

1. Log in to your GoDaddy account
2. Navigate to **My Products > DNS**
3. Select your domain
4. Scroll to **DNSSEC**
5. Click **Add**
6. Enter the DS record values:
   - Key Tag
   - Algorithm: 13
   - Digest Type: 2 (SHA-256)
   - Digest

### Cloudflare Registrar

1. Log in to Cloudflare
2. Select your domain
3. Navigate to **DNS > Settings**
4. Under DNSSEC, click **Enable DNSSEC** (Cloudflare handles this automatically if you use their DNS)
5. For external DNS (Route 53), add the DS record manually

### Namecheap

1. Log in to Namecheap
2. Navigate to **Domain List**
3. Click **Manage** next to your domain
4. Go to **Advanced DNS**
5. Scroll to **DNSSEC**
6. Click **ADD NEW DS RECORD**
7. Enter the values and save

### Google Domains

1. Log in to Google Domains
2. Select your domain
3. Navigate to **DNS**
4. Scroll to **DNSSEC**
5. Click **Manage DS records**
6. Add a custom DS record with your values

---

## Step 5: Verify DNSSEC Configuration

After adding the DS record at your registrar, DNS propagation can take anywhere from a few minutes to 48 hours. Here's how to verify everything is working.

### Using dig

Check for DNSKEY records:

```bash
dig +dnssec DNSKEY example.com
```

You should see output containing DNSKEY records with the `ad` (authenticated data) flag set:

```
;; flags: qr rd ra ad; QUERY: 1, ANSWER: 4, AUTHORITY: 0, ADDITIONAL: 1
```

Verify a signed A record:

```bash
dig +dnssec A example.com
```

Look for RRSIG records in the response:

```
example.com.        300     IN      A       93.184.216.34
example.com.        300     IN      RRSIG   A 13 2 300 20260215000000 20260115000000 12345 example.com. abc123...
```

### Using delv (DNSSEC Lookup and Validation)

The `delv` tool performs full DNSSEC validation:

```bash
delv @8.8.8.8 example.com A +rtrace
```

Successful output shows:

```
; fully validated
example.com.        300     IN      A       93.184.216.34
```

### Using Online Tools

Several online tools can verify your DNSSEC configuration:

1. **DNSViz**: https://dnsviz.net/
   - Enter your domain and click Analyze
   - Look for a green chain from root to your domain

2. **Verisign DNSSEC Debugger**: https://dnssec-debugger.verisignlabs.com/
   - Shows each step in the chain of trust
   - Highlights any broken links

3. **ICANN DNSSEC Analyzer**: https://dnssec-analyzer.verisignlabs.com/
   - Comprehensive analysis of your DNSSEC setup

4. **Google Public DNS**: https://dns.google/
   - Query your domain and check if the response shows AD (Authenticated Data) flag

### Using the AWS CLI

Check DNSSEC status:

```bash
aws route53 get-dnssec \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --query 'Status.ServeSignature' \
    --output text
```

Should return `SIGNING` when active.

---

## Step 6: Configure CloudWatch Monitoring (Recommended)

Route 53 can send DNSSEC-related events to CloudWatch Logs for monitoring and alerting.

### Enable DNSSEC Query Logging

Using the Console:

1. Navigate to your hosted zone in Route 53
2. Click **Configure query logging** under the **Query logging** tab
3. Create a new log group or select an existing one
4. Ensure the log group has the correct resource policy for Route 53

Using the CLI:

First, create a log group:

```bash
aws logs create-log-group \
    --log-group-name /aws/route53/example.com \
    --region us-east-1
```

Create a resource policy to allow Route 53 to write logs:

```bash
cat > /tmp/log-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Route53LogsToCloudWatchLogs",
            "Effect": "Allow",
            "Principal": {
                "Service": "route53.amazonaws.com"
            },
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:us-east-1:YOUR_ACCOUNT_ID:log-group:/aws/route53/*",
            "Condition": {
                "StringEquals": {
                    "aws:SourceAccount": "YOUR_ACCOUNT_ID"
                },
                "ArnLike": {
                    "aws:SourceArn": "arn:aws:route53:::hostedzone/*"
                }
            }
        }
    ]
}
EOF
```

Apply the policy:

```bash
aws logs put-resource-policy \
    --region us-east-1 \
    --policy-name Route53QueryLogging \
    --policy-document file:///tmp/log-policy.json
```

Enable query logging:

```bash
aws route53 create-query-logging-config \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --cloud-watch-logs-log-group-arn "arn:aws:logs:us-east-1:YOUR_ACCOUNT_ID:log-group:/aws/route53/example.com"
```

### Create CloudWatch Alarms

Create an alarm for DNSSEC validation failures:

```bash
aws cloudwatch put-metric-alarm \
    --alarm-name "DNSSEC-Validation-Failures" \
    --alarm-description "Alert when DNSSEC validation failures exceed threshold" \
    --metric-name DNSSECValidationFailures \
    --namespace AWS/Route53 \
    --statistic Sum \
    --period 300 \
    --threshold 10 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --dimensions Name=HostedZoneId,Value=$HOSTED_ZONE_ID \
    --alarm-actions arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:your-alerts-topic
```

---

## Key Management and Rotation

### Automatic ZSK Rotation

Route 53 automatically rotates the Zone Signing Key (ZSK) approximately every 7 days. This is transparent and requires no action from you. The process uses a pre-publish key rollover method:

1. A new ZSK is generated and published
2. Both old and new ZSKs are active during the transition
3. Records are re-signed with the new ZSK
4. The old ZSK is removed after TTL expiration

### Manual KSK Rotation

The Key Signing Key (KSK) does not automatically rotate. AWS recommends rotating your KSK annually or when:

- You suspect the key may be compromised
- Compliance requirements mandate rotation
- You're migrating to a new KMS key

To rotate the KSK:

**Step 1: Create a new KSK**

```bash
aws route53 create-key-signing-key \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --key-management-service-arn $NEW_KMS_KEY_ARN \
    --name "ksk-example-com-2027" \
    --status ACTIVE
```

**Step 2: Add the new DS record at your registrar**

Follow the same process as Step 4, adding the new DS record alongside the old one.

**Step 3: Wait for propagation**

Allow 24-48 hours for the new DS record to propagate through the DNS hierarchy.

**Step 4: Deactivate the old KSK**

```bash
aws route53 deactivate-key-signing-key \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --name "ksk-example-com-2026"
```

**Step 5: Remove the old DS record from your registrar**

Wait another 24-48 hours, then remove the old DS record.

**Step 6: Delete the old KSK**

```bash
aws route53 delete-key-signing-key \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --name "ksk-example-com-2026"
```

---

## Disabling DNSSEC

If you need to disable DNSSEC (for troubleshooting, migration, or other reasons), follow this careful process to avoid breaking DNS resolution:

**Step 1: Remove the DS record from your registrar**

This is critical. Removing the DS record first tells resolvers to stop expecting signed responses.

**Step 2: Wait for TTL expiration**

Check the TTL on your DS record at the parent zone:

```bash
dig DS example.com +trace
```

Wait at least 2x the TTL value (typically 24-48 hours) to ensure all resolvers have cleared the old DS record.

**Step 3: Disable DNSSEC signing**

Using the Console:
1. Navigate to your hosted zone
2. Click the **DNSSEC signing** tab
3. Click **Disable DNSSEC signing**
4. Confirm the action

Using the CLI:

```bash
aws route53 disable-hosted-zone-dnssec \
    --hosted-zone-id $HOSTED_ZONE_ID
```

**Step 4: Delete the KSK**

```bash
aws route53 delete-key-signing-key \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --name "ksk-example-com-2026"
```

**Warning**: Disabling DNSSEC in the wrong order (signing before DS removal) will cause DNSSEC-validating resolvers to return SERVFAIL for your domain, effectively taking your site offline for those users.

---

## Troubleshooting Common Issues

### Problem: DNSSEC validation fails after enabling

**Symptoms**:
- `dig +dnssec` returns SERVFAIL
- Online validators show broken chain of trust

**Solutions**:
1. Verify the DS record at your registrar matches the values from Route 53
2. Check that you're using digest type 2 (SHA-256), not type 1 (SHA-1)
3. Ensure the DS record has propagated: `dig DS example.com +trace`
4. Wait for TTL expiration on cached negative responses

### Problem: KMS key access denied

**Symptoms**:
- Error creating KSK: "Access Denied"
- Route 53 cannot sign records

**Solutions**:
1. Verify the KMS key is in us-east-1
2. Check the key policy includes the `dnssec-route53.amazonaws.com` service principal
3. Ensure the condition block references your account ID correctly
4. Verify the key is enabled, not pending deletion

### Problem: DS record not accepted by registrar

**Symptoms**:
- Registrar returns "invalid algorithm" or "invalid digest"

**Solutions**:
1. Ensure you're using the correct format for your registrar
2. Verify algorithm is 13 (ECDSAP256SHA256)
3. Verify digest type is 2 (SHA-256)
4. Some registrars want the public key instead of DS record - use the DNSKEY record in that case

### Problem: Intermittent resolution failures

**Symptoms**:
- Some resolvers return answers, others fail
- Inconsistent behavior across different networks

**Solutions**:
1. Check for stale cached signatures: `dig +dnssec +cd example.com`
2. Verify signature expiration dates in RRSIG records
3. Check Route 53 DNSSEC status: ensure signing is active
4. Test with multiple resolvers (8.8.8.8, 1.1.1.1, 9.9.9.9)

### Problem: Subdomains not resolving

**Symptoms**:
- Root domain works, subdomains fail DNSSEC validation

**Solutions**:
1. Ensure all record types are signed (check for RRSIG records)
2. Verify NSEC/NSEC3 records exist for authenticated denial
3. Check for delegation issues if subdomains use different name servers

---

## Cost Considerations

DNSSEC with Route 53 incurs the following costs:

| Component | Cost |
|-----------|------|
| Route 53 DNSSEC Signing | $1.00/month per hosted zone |
| KMS Key | $1.00/month per key |
| KMS Sign Operations | $0.03 per 10,000 requests |
| Route 53 Queries | Existing query pricing applies |
| CloudWatch Logs | Standard CloudWatch Logs pricing |

For a typical domain with moderate traffic, expect approximately $2-5/month additional cost for DNSSEC.

---

## Summary Reference Table

| Task | Console Steps | CLI Command |
|------|---------------|-------------|
| Create KMS Key | KMS > Create Key > Asymmetric > ECC_NIST_P256 | `aws kms create-key --key-spec ECC_NIST_P256 --key-usage SIGN_VERIFY` |
| Enable DNSSEC | Route 53 > Hosted Zone > DNSSEC > Enable | `aws route53 enable-hosted-zone-dnssec --hosted-zone-id ZONE_ID` |
| Create KSK | Route 53 > DNSSEC > Create KSK | `aws route53 create-key-signing-key --hosted-zone-id ZONE_ID --key-management-service-arn KMS_ARN --name NAME --status ACTIVE` |
| Get DS Record | Route 53 > DNSSEC > View KSK Details | `aws route53 get-dnssec --hosted-zone-id ZONE_ID` |
| Check Status | Route 53 > DNSSEC tab | `aws route53 get-dnssec --hosted-zone-id ZONE_ID` |
| Deactivate KSK | Route 53 > DNSSEC > Deactivate | `aws route53 deactivate-key-signing-key --hosted-zone-id ZONE_ID --name NAME` |
| Delete KSK | Route 53 > DNSSEC > Delete | `aws route53 delete-key-signing-key --hosted-zone-id ZONE_ID --name NAME` |
| Disable DNSSEC | Route 53 > DNSSEC > Disable | `aws route53 disable-hosted-zone-dnssec --hosted-zone-id ZONE_ID` |

---

## Best Practices Checklist

Before going live with DNSSEC:

- [ ] Create a dedicated KMS key in us-east-1 with appropriate key policy
- [ ] Enable DNSSEC signing on a test domain first
- [ ] Document the DS record values before adding to registrar
- [ ] Test validation with multiple tools (dig, delv, DNSViz)
- [ ] Set up CloudWatch monitoring for DNSSEC events
- [ ] Create runbooks for KSK rotation and emergency rollback
- [ ] Verify your registrar supports DNSSEC and the required algorithms
- [ ] Plan for 24-48 hour propagation windows during changes
- [ ] Keep the old KMS key available until new KSK is fully propagated
- [ ] Test from DNSSEC-validating resolvers (8.8.8.8, 1.1.1.1)

---

## Conclusion

DNSSEC adds a critical layer of security to your DNS infrastructure by ensuring the authenticity and integrity of DNS responses. While the configuration involves multiple steps across Route 53, KMS, and your domain registrar, the protection against DNS spoofing attacks is well worth the effort.

The key takeaways:

1. **Start with KMS**: Create an asymmetric ECC_NIST_P256 key in us-east-1 with the correct service permissions.
2. **Enable signing carefully**: Route 53 handles ZSK management automatically, but you control the KSK lifecycle.
3. **Complete the chain**: The DS record at your registrar is what makes DNSSEC actually work. Without it, you have signed records that no one validates.
4. **Monitor and maintain**: Set up CloudWatch alerts and plan for annual KSK rotation.
5. **Order matters**: When disabling, always remove the DS record first and wait for propagation before disabling signing.

DNSSEC is not a silver bullet, but it closes a significant attack vector that has plagued the internet since DNS was invented. Combined with HTTPS, certificate transparency, and secure credential management, it forms part of a defense-in-depth strategy for protecting your users and your infrastructure.

---

**Related Reading:**

- [Why diversify away from AWS us-east-1](https://oneuptime.com/blog/post/2025-10-21-aws-us-east-1-region-of-last-resort/view)
- [The Five Stages of SRE Maturity: From Chaos to Operational Excellence](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view)
- [SRE Best Practices: Building Reliable Systems at Scale](https://oneuptime.com/blog/post/2025-11-28-sre-best-practices/view)
