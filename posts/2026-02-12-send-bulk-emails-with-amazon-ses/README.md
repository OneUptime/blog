# How to Send Bulk Emails with Amazon SES

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SES, Email, Bulk Email, Cloud

Description: Learn how to send bulk emails using Amazon Simple Email Service (SES), including setup, templates, sending strategies, and best practices for deliverability.

---

Sending bulk emails is something most growing companies need to do eventually - whether it's newsletters, product updates, or transactional notifications. Amazon SES (Simple Email Service) is one of the most cost-effective ways to handle this. At roughly $0.10 per 1,000 emails, it beats most competitors by a wide margin.

But cheap doesn't mean simple. There's a right way and a wrong way to send bulk emails through SES, and getting it wrong can land your emails in spam folders or get your account suspended. Let's walk through the entire process.

## Getting Started with SES

Before you send a single email, you need to verify your sending domain. This tells Amazon (and receiving mail servers) that you actually own the domain you're sending from.

Head to the SES console and add your domain. You'll need to add some DNS records.

```bash
# You can also verify via the AWS CLI
aws ses verify-domain-identity --domain yourdomain.com

# Check verification status
aws ses get-identity-verification-attributes \
  --identities yourdomain.com
```

SES will give you a TXT record for domain verification, plus DKIM CNAME records. Add all of them to your DNS provider. DKIM signing is crucial for deliverability - it proves your emails haven't been tampered with in transit.

## Moving Out of the SES Sandbox

New SES accounts start in a sandbox. This means you can only send to verified email addresses, with a limit of 200 emails per day. That's obviously not going to work for bulk sending.

To get out of the sandbox, you need to request production access through the AWS console. Amazon will ask about your use case, how you collect email addresses, and your bounce/complaint handling process. Be specific and honest - vague answers get rejected.

A few tips for getting approved faster:
- Explain that you have an opt-in process for subscribers
- Mention that you handle bounces and complaints (more on this later)
- Describe your unsubscribe mechanism
- Keep your expected sending volume realistic

## Building Email Templates

For bulk emails, you don't want to construct each email from scratch. SES templates let you define the structure once and fill in personalized data for each recipient.

Here's how to create a template.

```json
{
  "Template": {
    "TemplateName": "MonthlyNewsletter",
    "SubjectPart": "{{name}}, here's your {{month}} update",
    "HtmlPart": "<html><body><h1>Hi {{name}}</h1><p>Here's what happened in {{month}}:</p><p>{{content}}</p><p><a href='{{unsubscribe_link}}'>Unsubscribe</a></p></body></html>",
    "TextPart": "Hi {{name}}\n\nHere's what happened in {{month}}:\n\n{{content}}\n\nUnsubscribe: {{unsubscribe_link}}"
  }
}
```

Save that as a JSON file and create the template with the CLI.

```bash
# Create the template
aws ses create-template --cli-input-json file://newsletter-template.json

# Verify it was created
aws ses list-templates
```

The double-brace syntax (`{{name}}`) marks replacement variables. Each recipient can get personalized content without you having to build individual emails.

## Sending Bulk Templated Emails

Now for the actual sending. The `SendBulkTemplatedEmail` API is designed exactly for this. It takes a template name and a list of destinations, each with their own replacement data.

```python
import boto3
import json

ses_client = boto3.client('ses', region_name='us-east-1')

# Define your recipient list with personalization data
destinations = []
for subscriber in subscriber_list:
    destinations.append({
        'Destination': {
            'ToAddresses': [subscriber['email']]
        },
        'ReplacementTemplateData': json.dumps({
            'name': subscriber['name'],
            'month': 'February',
            'content': 'Your personalized content here',
            'unsubscribe_link': f'https://yourdomain.com/unsubscribe?id={subscriber["id"]}'
        })
    })

# Send in batches of 50 (SES limit per API call)
batch_size = 50
for i in range(0, len(destinations), batch_size):
    batch = destinations[i:i + batch_size]

    response = ses_client.send_bulk_templated_email(
        Source='newsletter@yourdomain.com',
        Template='MonthlyNewsletter',
        DefaultTemplateData=json.dumps({
            'name': 'Subscriber',
            'month': 'February',
            'content': 'General content',
            'unsubscribe_link': 'https://yourdomain.com/unsubscribe'
        }),
        Destinations=batch
    )

    # Check for failures in this batch
    for j, status in enumerate(response['Status']):
        if status['Status'] != 'Success':
            print(f"Failed: {batch[j]['Destination']['ToAddresses'][0]}")
            print(f"Error: {status.get('Error', 'Unknown')}")
```

A few important notes here. The `SendBulkTemplatedEmail` API accepts a maximum of 50 destinations per call. If you've got 10,000 subscribers, that's 200 API calls. The `DefaultTemplateData` is a fallback - if any recipient is missing a replacement variable, it uses the default instead of failing.

## Rate Limiting and Throttling

SES has sending limits, and they're not just daily. You've also got a per-second sending rate. If you're on production access with a rate of 14 emails per second, trying to blast 50,000 emails as fast as possible will get you throttled.

Here's a simple rate limiter.

```python
import time

# Respect the per-second sending rate
SEND_RATE = 14  # emails per second (check your account's actual limit)
BATCH_SIZE = 50
DELAY = BATCH_SIZE / SEND_RATE  # seconds to wait between batches

for i in range(0, len(destinations), BATCH_SIZE):
    batch = destinations[i:i + BATCH_SIZE]

    ses_client.send_bulk_templated_email(
        Source='newsletter@yourdomain.com',
        Template='MonthlyNewsletter',
        DefaultTemplateData=json.dumps(default_data),
        Destinations=batch
    )

    # Wait to stay within rate limits
    time.sleep(DELAY)

    # Log progress
    sent = min(i + BATCH_SIZE, len(destinations))
    print(f"Sent {sent}/{len(destinations)} emails")
```

You can request higher sending limits as your reputation builds. Start slow, maintain good metrics, and Amazon will generally increase your limits automatically.

## Configuration Sets for Tracking

Configuration sets let you track what happens to your emails after they leave SES. You can monitor opens, clicks, bounces, and complaints.

```bash
# Create a configuration set
aws sesv2 create-configuration-set \
  --configuration-set-name BulkEmailTracking

# Add event tracking
aws sesv2 create-configuration-set-event-destination \
  --configuration-set-name BulkEmailTracking \
  --event-destination-name CloudWatchMetrics \
  --event-destination '{
    "Enabled": true,
    "MatchingEventTypes": ["SEND", "DELIVERY", "BOUNCE", "COMPLAINT", "OPEN", "CLICK"],
    "CloudWatchDestination": {
      "DimensionConfigurations": [{
        "DimensionName": "Campaign",
        "DimensionValueSource": "MESSAGE_TAG",
        "DefaultDimensionValue": "default"
      }]
    }
  }'
```

Then reference the configuration set when sending.

```python
response = ses_client.send_bulk_templated_email(
    Source='newsletter@yourdomain.com',
    Template='MonthlyNewsletter',
    ConfigurationSetName='BulkEmailTracking',
    DefaultTemplateData=json.dumps(default_data),
    DefaultTags=[
        {'Name': 'Campaign', 'Value': 'february-newsletter'}
    ],
    Destinations=batch
)
```

## Deliverability Best Practices

Sending bulk email is only useful if it actually reaches inboxes. Here are the things that matter most:

**Warm up your sending.** Don't go from zero to 100,000 emails overnight. Start with your most engaged subscribers and gradually increase volume over days or weeks.

**Clean your list regularly.** Remove addresses that haven't opened an email in six months. Every bounce hurts your reputation.

**Include an unsubscribe link.** It's not just best practice - it's legally required in most jurisdictions. Make it easy to find and make it work immediately.

**Monitor your metrics.** Keep your bounce rate below 5% and your complaint rate below 0.1%. If either goes above those thresholds, SES may pause your sending. For monitoring these metrics, check out [monitoring SES with CloudWatch](https://oneuptime.com/blog/post/2026-02-12-monitor-ses-sending-with-cloudwatch/view).

**Handle bounces and complaints programmatically.** Set up SNS notifications so you automatically remove bad addresses. See our guide on [handling SES bounces and complaints](https://oneuptime.com/blog/post/2026-02-12-handle-ses-bounces-and-complaints-with-sns/view) for the details.

## Costs at Scale

Let's talk numbers. SES charges $0.10 per 1,000 emails. If you're sending from EC2, the first 62,000 emails per month are free.

For 100,000 subscribers with weekly emails:
- 400,000 emails per month
- Cost: roughly $40/month (or less with the EC2 free tier)

Compare that to Mailchimp or SendGrid at similar volumes, and you're saving hundreds of dollars monthly. The trade-off is that SES gives you less hand-holding - you manage templates, lists, and deliverability yourself.

## Wrapping Up

Amazon SES is a powerful tool for bulk email, but it rewards careful planning. Verify your domain, set up proper authentication, handle bounces, and respect sending limits. Start small, build your reputation, and scale up gradually.

The biggest mistake people make is treating SES like a fire-and-forget system. It's not. You need to monitor your sending metrics, maintain your subscriber list, and stay on top of bounces and complaints. Do that, and you'll have a reliable, affordable bulk email system that scales to millions of messages.
