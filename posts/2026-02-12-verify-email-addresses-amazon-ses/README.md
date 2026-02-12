# How to Verify Email Addresses in Amazon SES

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SES, Email, Verification

Description: Learn how to verify individual email addresses in Amazon SES for testing, sandbox usage, and specific sender identity management with practical examples and automation.

---

While domain verification is the way to go for production, there are good reasons to verify individual email addresses in SES. Maybe you're testing in the sandbox and need to verify recipient addresses. Maybe you want to send from a personal email address on a domain you don't control. Or maybe you need to verify specific sender addresses for compliance tracking.

Whatever the reason, verifying email addresses in SES is quick and straightforward. Let's walk through it.

## When to Verify Emails vs. Domains

Here's a quick decision guide:

- **Verify the domain** if you own it and want to send from any address at that domain
- **Verify individual emails** if you're in the SES sandbox and need to verify recipients, or if you want to send from addresses on domains you don't own

Important note: when SES is in sandbox mode, you need to verify both the sender AND recipient addresses. This is a common gotcha that trips up newcomers.

## Step 1: Verify a Single Email Address

```bash
# Verify an email address
aws ses verify-email-identity \
  --email-address "sender@example.com" \
  --region us-east-1
```

SES sends a verification email to that address with a link. The person who owns the email address needs to click the link to complete verification.

```bash
# Check the verification status
aws ses get-identity-verification-attributes \
  --identities "sender@example.com" \
  --region us-east-1
```

The response shows either `Pending` (link not clicked yet) or `Success` (verified).

## Step 2: Verify Multiple Email Addresses

If you need to verify several addresses for testing, you can script it:

```bash
# Verify multiple email addresses
EMAILS=(
  "alice@example.com"
  "bob@example.com"
  "charlie@example.com"
  "support@example.com"
  "noreply@example.com"
)

for email in "${EMAILS[@]}"; do
  echo "Verifying: $email"
  aws ses verify-email-identity \
    --email-address "$email" \
    --region us-east-1
done

# Check all verification statuses
aws ses get-identity-verification-attributes \
  --identities "${EMAILS[@]}" \
  --region us-east-1 \
  --query 'VerificationAttributes' \
  --output table
```

## Step 3: Using SES v2 API

The newer SES v2 API provides a unified approach for both email and domain identities:

```bash
# Create an email identity using SES v2
aws sesv2 create-email-identity \
  --email-identity "marketing@example.com" \
  --region us-east-1

# Get identity details
aws sesv2 get-email-identity \
  --email-identity "marketing@example.com" \
  --region us-east-1

# List all email identities
aws sesv2 list-email-identities \
  --region us-east-1 \
  --query 'EmailIdentities[?IdentityType==`EMAIL_ADDRESS`].{
    Identity:IdentityName,
    Status:SendingEnabled
  }'
```

## Step 4: Verify Addresses for Sandbox Testing

In sandbox mode, you need verified recipients. Here's a common testing workflow:

```bash
# Verify your test recipient addresses
aws ses verify-email-identity \
  --email-address "test-recipient@gmail.com" \
  --region us-east-1

# Verify your sender address
aws ses verify-email-identity \
  --email-address "test-sender@example.com" \
  --region us-east-1

# Wait for both to be verified, then send a test
aws ses send-email \
  --from "test-sender@example.com" \
  --destination '{"ToAddresses": ["test-recipient@gmail.com"]}' \
  --message '{
    "Subject": {"Data": "SES Sandbox Test"},
    "Body": {
      "Text": {"Data": "If you received this, SES sandbox testing is working."}
    }
  }' \
  --region us-east-1
```

## Step 5: Automate Verification Status Checks

Build a script to check whether all your required addresses are verified:

```python
# check_verification.py
import boto3

def check_verification_status(email_addresses, region='us-east-1'):
    """Check verification status of email addresses in SES."""
    ses = boto3.client('ses', region_name=region)

    response = ses.get_identity_verification_attributes(
        Identities=email_addresses
    )

    results = response['VerificationAttributes']

    all_verified = True
    for email in email_addresses:
        status = results.get(email, {}).get('VerificationStatus', 'NotFound')
        verified = status == 'Success'
        if not verified:
            all_verified = False
        print(f"  {email}: {status}")

    return all_verified

# Check your required addresses
addresses = [
    'noreply@example.com',
    'support@example.com',
    'alerts@example.com'
]

print("Verification Status:")
if check_verification_status(addresses):
    print("\nAll addresses verified!")
else:
    print("\nSome addresses still need verification.")
```

## Step 6: Handle Verification in CI/CD

If you're using infrastructure as code, include email verification in your deployment:

Using CloudFormation:

```yaml
Resources:
  SenderEmailVerification:
    Type: AWS::SES::EmailIdentity
    Properties:
      EmailIdentity: noreply@example.com

  SupportEmailVerification:
    Type: AWS::SES::EmailIdentity
    Properties:
      EmailIdentity: support@example.com
```

Using Terraform:

```hcl
resource "aws_ses_email_identity" "sender" {
  email = "noreply@example.com"
}

resource "aws_ses_email_identity" "support" {
  email = "support@example.com"
}

output "sender_verification_status" {
  value = aws_ses_email_identity.sender.arn
}
```

Note that these resources only initiate verification - the email owner still needs to click the verification link.

## Step 7: List and Manage Verified Addresses

Keep track of what's verified in your account:

```bash
# List all verified identities (both domains and emails)
aws ses list-identities --region us-east-1

# List only email addresses
aws ses list-identities \
  --identity-type EmailAddress \
  --region us-east-1

# Get detailed status for all email identities
EMAILS=$(aws ses list-identities --identity-type EmailAddress --query 'Identities[]' --output text)
aws ses get-identity-verification-attributes \
  --identities $EMAILS \
  --region us-east-1

# Remove a verified email address
aws ses delete-identity \
  --identity "old-address@example.com" \
  --region us-east-1
```

## Common Issues and Solutions

**Verification email not received:**
- Check spam/junk folders
- Make sure the email address is correct and can receive mail
- SES sends from `no-reply-aws@amazon.com` - check if this is blocked
- Re-send the verification: just call `verify-email-identity` again

**Verification expired:**
Verification emails expire after 24 hours. If the link isn't clicked in time, request a new one:

```bash
# Re-send verification (just call the same command again)
aws ses verify-email-identity \
  --email-address "expired@example.com" \
  --region us-east-1
```

**Can't send to unverified addresses:**
You're in the sandbox. Either verify each recipient or [request production access](https://oneuptime.com/blog/post/move-amazon-ses-out-of-sandbox/view).

**"Email address is not verified" error when domain is verified:**
If both a domain and an email address at that domain are verified, SES uses the more specific identity (the email). If the email verification failed or expired, it can cause issues. Delete the email identity and rely on the domain verification instead:

```bash
# Remove the specific email identity and rely on domain verification
aws ses delete-identity --identity "user@example.com"
```

## Verification for Email Receiving

If you're using SES to receive emails, the domain must be verified but individual recipient addresses don't need separate verification. You do need MX records pointing to SES:

```bash
# Add MX record for email receiving
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "MX",
        "TTL": 3600,
        "ResourceRecords": [{
          "Value": "10 inbound-smtp.us-east-1.amazonaws.com"
        }]
      }
    }]
  }'
```

Email verification is the entry point to using SES. For production workloads, always prefer domain verification over individual email verification - it's more scalable and gives you more flexibility. But for testing, development, and quick proofs of concept, individual email verification gets the job done fast.
