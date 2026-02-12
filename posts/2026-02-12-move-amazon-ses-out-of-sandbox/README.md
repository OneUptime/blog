# How to Move Amazon SES Out of the Sandbox

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SES, Email, Production

Description: Guide to requesting production access for Amazon SES, including what to include in your request, common rejection reasons, and best practices for maintaining your sending reputation.

---

Every new AWS account starts with SES in sandbox mode. In the sandbox, you can only send emails to verified addresses, and you're limited to 200 emails per day with a maximum send rate of 1 email per second. That's fine for testing, but completely useless for production workloads.

Getting out of the sandbox requires submitting a request to AWS. They review it manually, and approvals typically take about 24 hours. But if your request is vague or missing key details, it'll get rejected - and then you're waiting even longer.

Here's how to get approved on the first try.

## What the Sandbox Restricts

Before we get into the request process, let's be clear about what sandbox mode limits:

- **Recipients must be verified**: You can only send to email addresses or domains you've verified in SES
- **Daily send limit**: 200 emails per 24 hours
- **Send rate**: 1 email per second
- **No bulk sending**: Can't send marketing emails or newsletters

Once you're in production:
- Send to any valid email address
- Starting quota of 50,000 emails per day (automatically scales up)
- Send rate of 14 emails per second (also scales)
- Full access to all SES features

## Step 1: Complete Prerequisites

Before requesting production access, make sure you have these in place. AWS reviewers check for them:

```bash
# Verify your domain (not just an email address)
aws sesv2 create-email-identity \
  --email-identity "example.com" \
  --region us-east-1

# Confirm DKIM is set up and verified
aws sesv2 get-email-identity \
  --email-identity "example.com" \
  --query 'DkimAttributes.Status' \
  --region us-east-1

# Set up a configuration set for bounce/complaint tracking
aws sesv2 create-configuration-set \
  --configuration-set-name "production-tracking" \
  --reputation-options '{"ReputationMetricsEnabled": true}' \
  --sending-options '{"SendingEnabled": true}'

# Enable account-level suppression list
aws sesv2 put-account-suppression-attributes \
  --suppressed-reasons BOUNCE COMPLAINT

# Verify bounce handling is configured
aws sesv2 create-configuration-set-event-destination \
  --configuration-set-name "production-tracking" \
  --event-destination-name "bounces-and-complaints" \
  --event-destination '{
    "Enabled": true,
    "MatchingEventTypes": ["BOUNCE", "COMPLAINT"],
    "SnsDestination": {
      "TopicArn": "arn:aws:sns:us-east-1:123456789012:ses-bounces"
    }
  }'
```

## Step 2: Submit the Production Access Request

You can submit the request through the AWS Console or the CLI:

```bash
# Request production access using SES v2
aws sesv2 put-account-details \
  --mail-type TRANSACTIONAL \
  --website-url "https://www.example.com" \
  --use-case-description "We are a SaaS platform that needs to send transactional emails to our customers. These include: account verification emails, password reset notifications, order confirmations, and system alerts. We expect to send approximately 5,000-10,000 emails per day initially. We have implemented bounce and complaint handling via SNS notifications, maintain a suppression list, and process unsubscribe requests within 24 hours. Our emails are sent only to users who have registered on our platform and explicitly opted in to receive communications." \
  --additional-contact-email-addresses "devops@example.com" \
  --production-access-enabled \
  --region us-east-1
```

The key field here is `use-case-description`. Let's break down what makes a good one.

## What to Include in Your Request

AWS reviewers look for specific details. Include all of these:

**1. Type of emails you'll send:**
- Transactional (password resets, confirmations, receipts)
- Marketing (newsletters, promotions) - be honest about this
- Both

**2. How recipients get on your list:**
- User registration on your website
- Explicit opt-in forms
- Purchase confirmations
- Never bought lists or scraped addresses

**3. Volume estimates:**
- Current expected volume
- Projected growth
- Peak sending times

**4. Bounce and complaint handling:**
- How you process bounces (SNS, SQS, Lambda)
- How you handle complaints (immediate suppression)
- Your suppression list strategy

**5. Unsubscribe mechanism:**
- One-click unsubscribe in email headers
- Unsubscribe link in email body
- How quickly you process requests

Here's an example of a strong request:

```text
We operate an e-commerce platform (www.example.com) serving 50,000+
active customers. We need SES production access for:

1. Transactional emails: Order confirmations, shipping notifications,
   password resets, and account verification emails.

2. Marketing emails: Weekly newsletter sent to customers who explicitly
   opted in during registration. All marketing emails include a
   one-click unsubscribe link.

Volume: ~5,000 emails/day currently, expecting 15,000/day within
6 months based on growth projections.

Bounce/Complaint Handling: We have SNS topics configured for bounces
and complaints. Our Lambda function processes these in real-time and
adds addresses to our suppression list. Hard bounces are permanently
suppressed. Complaints trigger immediate removal from all mailing
lists.

We have DKIM, SPF, and DMARC configured for our domain. We use
double opt-in for marketing emails and provide clear unsubscribe
mechanisms in every email.
```

## Step 3: Check Your Request Status

```bash
# Check account sending status
aws sesv2 get-account \
  --region us-east-1 \
  --query '{
    ProductionAccess: ProductionAccessEnabled,
    SendingEnabled: SendingEnabled,
    SendQuota: SendQuota
  }'
```

You'll also receive an email from AWS when your request is processed. Most requests are handled within 24 hours.

## Common Rejection Reasons

If your request gets rejected, it's usually for one of these reasons:

**1. Vague use case description**
"We need to send emails" is not enough. Be specific about what emails you send and to whom.

**2. No bounce/complaint handling**
If you haven't set up SNS notifications for bounces and complaints, your request will likely be denied.

**3. Missing authentication**
Set up DKIM before submitting. It shows you're serious about email best practices.

**4. Suspicious sending patterns**
If you mention anything that sounds like spam (buying lists, scraping addresses, unsolicited bulk email), you'll be rejected.

**5. No website URL**
Include a legitimate website URL where reviewers can verify your business.

## Step 4: Re-Submit if Rejected

If rejected, address the feedback and re-submit:

```bash
# Update your account details and re-request
aws sesv2 put-account-details \
  --mail-type TRANSACTIONAL \
  --website-url "https://www.example.com" \
  --use-case-description "Updated description addressing reviewer feedback..." \
  --additional-contact-email-addresses "devops@example.com" \
  --production-access-enabled \
  --region us-east-1
```

## Step 5: Post-Approval Setup

Once approved, configure your account for production:

```bash
# Check your new sending limits
aws sesv2 get-account \
  --region us-east-1 \
  --query 'SendQuota'

# Set up sending authorization for additional senders
aws sesv2 create-email-identity-policy \
  --email-identity "example.com" \
  --policy-name "AllowInternalSenders" \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "AllowAppSending",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/AppSendingRole"
      },
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "arn:aws:ses:us-east-1:123456789012:identity/example.com"
    }]
  }'
```

## Step 6: Monitor Your Reputation

After going to production, keeping a clean reputation is critical. If your bounce or complaint rates get too high, AWS can put you back in the sandbox:

```bash
# Check your sending statistics
aws ses get-send-statistics --region us-east-1

# Get account reputation metrics
aws sesv2 get-account \
  --region us-east-1 \
  --query '{
    ReputationDashboard: ReputationOptions.ReputationMetricsEnabled,
    EnforcementStatus: EnforcementStatus
  }'
```

Key thresholds to stay under:
- **Bounce rate**: Keep below 5% (ideally under 2%)
- **Complaint rate**: Keep below 0.1% (this is the critical one)

```bash
# Set up CloudWatch alarms for reputation metrics
aws cloudwatch put-metric-alarm \
  --alarm-name "SES-BounceRate-High" \
  --namespace "AWS/SES" \
  --metric-name "Reputation.BounceRate" \
  --statistic Average \
  --period 3600 \
  --threshold 0.05 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ses-alerts

aws cloudwatch put-metric-alarm \
  --alarm-name "SES-ComplaintRate-High" \
  --namespace "AWS/SES" \
  --metric-name "Reputation.ComplaintRate" \
  --statistic Average \
  --period 3600 \
  --threshold 0.001 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ses-alerts
```

## Automatic Quota Increases

After you're in production, SES automatically increases your sending quota over time based on your sending volume and reputation. You don't need to request increases manually - just gradually ramp up your volume, maintain good metrics, and the limits will grow.

If you need a faster increase, you can request one through the AWS Support Center, but in most cases the automatic scaling is sufficient.

Getting out of the SES sandbox is a one-time hurdle. Put in the effort to write a detailed request, set up proper authentication and bounce handling beforehand, and you'll be approved quickly. After that, it's all about maintaining your sender reputation - which is really just about sending emails people actually want to receive.
