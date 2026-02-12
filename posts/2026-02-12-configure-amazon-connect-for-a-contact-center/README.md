# How to Configure Amazon Connect for a Contact Center

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Connect, Contact Center, Cloud, Telephony

Description: Set up a cloud-based contact center with Amazon Connect, including phone number provisioning, contact flows, agent configuration, queues, and integration with other AWS services.

---

Amazon Connect is AWS's cloud-based contact center service. You can spin up a fully functional call center without buying any hardware, signing any telecom contracts, or dealing with PBX systems. It's pay-per-minute, scales automatically, and integrates with the rest of AWS.

The setup is more involved than most AWS services because you're building an entire phone system, but the flexibility you get is worth it.

## Creating a Connect Instance

Your Connect instance is the top-level container for everything - phone numbers, agents, queues, and contact flows.

```bash
# Create an instance
# Note: This is typically done through the AWS Console because
# it requires accepting terms of service. But the API works too.
aws connect create-instance \
  --identity-management-type CONNECT_MANAGED \
  --instance-alias my-contact-center \
  --inbound-calls-enabled \
  --outbound-calls-enabled
```

Most people create the instance through the console on their first time because it walks you through the configuration options. You'll need to choose:

- **Identity management** - CONNECT_MANAGED (Connect handles users), SAML, or link to an existing directory
- **Administrator** - The first admin user
- **Telephony** - Enable inbound calls, outbound calls, or both
- **Data storage** - Where call recordings and reports go (S3)

## Claiming a Phone Number

Once your instance is ready, claim a phone number.

```bash
# List available phone numbers
aws connect search-available-phone-numbers \
  --target-arn arn:aws:connect:us-east-1:123456789:instance/INSTANCE_ID \
  --phone-number-country-code US \
  --phone-number-type TOLL_FREE

# Claim a number
aws connect claim-phone-number \
  --target-arn arn:aws:connect:us-east-1:123456789:instance/INSTANCE_ID \
  --phone-number-country-code US \
  --phone-number-type TOLL_FREE
```

You can get toll-free numbers, DID (direct inward dialing) numbers, or port existing numbers from another provider.

## Setting Up Queues

Queues hold callers until an agent is available. You'll typically have different queues for different departments or issues.

```bash
# Create a support queue
aws connect create-queue \
  --instance-id INSTANCE_ID \
  --name "Technical Support" \
  --hours-of-operation-id HOURS_ID \
  --description "Queue for technical support calls"

# Create a billing queue
aws connect create-queue \
  --instance-id INSTANCE_ID \
  --name "Billing" \
  --hours-of-operation-id HOURS_ID \
  --description "Queue for billing inquiries"
```

## Configuring Hours of Operation

Define when your contact center is open.

```bash
aws connect create-hours-of-operation \
  --instance-id INSTANCE_ID \
  --name "Business Hours" \
  --time-zone "America/New_York" \
  --config '[
    {
      "Day": "MONDAY",
      "StartTime": {"Hours": 9, "Minutes": 0},
      "EndTime": {"Hours": 17, "Minutes": 0}
    },
    {
      "Day": "TUESDAY",
      "StartTime": {"Hours": 9, "Minutes": 0},
      "EndTime": {"Hours": 17, "Minutes": 0}
    },
    {
      "Day": "WEDNESDAY",
      "StartTime": {"Hours": 9, "Minutes": 0},
      "EndTime": {"Hours": 17, "Minutes": 0}
    },
    {
      "Day": "THURSDAY",
      "StartTime": {"Hours": 9, "Minutes": 0},
      "EndTime": {"Hours": 17, "Minutes": 0}
    },
    {
      "Day": "FRIDAY",
      "StartTime": {"Hours": 9, "Minutes": 0},
      "EndTime": {"Hours": 17, "Minutes": 0}
    }
  ]'
```

## Creating Routing Profiles

Routing profiles determine which queues an agent can handle and the priority order.

```bash
aws connect create-routing-profile \
  --instance-id INSTANCE_ID \
  --name "Support Agent" \
  --default-outbound-queue-id SUPPORT_QUEUE_ID \
  --description "Profile for support agents" \
  --media-concurrencies '[
    {
      "Channel": "VOICE",
      "Concurrency": 1
    },
    {
      "Channel": "CHAT",
      "Concurrency": 3
    }
  ]' \
  --queue-configs '[
    {
      "QueueReference": {
        "QueueId": "SUPPORT_QUEUE_ID",
        "Channel": "VOICE"
      },
      "Priority": 1,
      "Delay": 0
    }
  ]'
```

## Building Contact Flows

Contact flows are the heart of Connect. They define what happens when someone calls - IVR menus, queue routing, greetings, and more. Think of them as visual flowcharts for phone calls.

While you'd typically build these in the Connect console's visual editor, you can also create them via the API.

Here's a simplified flow structure.

```json
{
  "Version": "2019-10-30",
  "StartAction": "greeting",
  "Actions": [
    {
      "Identifier": "greeting",
      "Type": "MessageParticipant",
      "Parameters": {
        "Text": "Thank you for calling. Press 1 for technical support, press 2 for billing."
      },
      "Transitions": {
        "NextAction": "get-input"
      }
    },
    {
      "Identifier": "get-input",
      "Type": "GetParticipantInput",
      "Parameters": {
        "Text": "Please make your selection.",
        "Timeout": "5"
      },
      "Transitions": {
        "NextAction": "default-queue",
        "Conditions": [
          {
            "NextAction": "route-support",
            "Condition": {
              "Operand": "1",
              "Operator": "Equals"
            }
          },
          {
            "NextAction": "route-billing",
            "Condition": {
              "Operand": "2",
              "Operator": "Equals"
            }
          }
        ],
        "Errors": [
          {
            "NextAction": "default-queue",
            "ErrorType": "NoMatchingError"
          }
        ]
      }
    },
    {
      "Identifier": "route-support",
      "Type": "TransferToQueue",
      "Parameters": {
        "QueueId": "SUPPORT_QUEUE_ARN"
      },
      "Transitions": {
        "NextAction": "disconnect"
      }
    },
    {
      "Identifier": "route-billing",
      "Type": "TransferToQueue",
      "Parameters": {
        "QueueId": "BILLING_QUEUE_ARN"
      },
      "Transitions": {
        "NextAction": "disconnect"
      }
    },
    {
      "Identifier": "disconnect",
      "Type": "DisconnectParticipant",
      "Parameters": {},
      "Transitions": {}
    }
  ]
}
```

```bash
# Create the contact flow
aws connect create-contact-flow \
  --instance-id INSTANCE_ID \
  --name "Main IVR" \
  --type CONTACT_FLOW \
  --content file://contact-flow.json
```

## Adding Agents

Create agent accounts so people can take calls.

```bash
# Create a user (agent)
aws connect create-user \
  --instance-id INSTANCE_ID \
  --username "jdoe" \
  --password "TempPassword123!" \
  --identity-info '{
    "FirstName": "Jane",
    "LastName": "Doe",
    "Email": "jane@yourdomain.com"
  }' \
  --phone-config '{
    "PhoneType": "SOFT_PHONE",
    "AutoAccept": false
  }' \
  --security-profile-ids AGENT_SECURITY_PROFILE_ID \
  --routing-profile-id SUPPORT_ROUTING_PROFILE_ID
```

Agents use the Connect CCP (Contact Control Panel) - a web-based softphone that runs in the browser. No software installation needed.

## Integrating with Lambda

You can invoke Lambda functions from contact flows to look up customer data, check account status, or perform any custom logic.

```python
# Lambda function invoked from a Connect contact flow
def lambda_handler(event, context):
    """Look up customer info based on their phone number."""

    # Connect passes the caller's phone number
    phone = event['Details']['ContactData']['CustomerEndpoint']['Address']

    # Look up the customer in your database
    customer = lookup_customer(phone)

    if customer:
        return {
            'CustomerName': customer['name'],
            'AccountType': customer['plan'],
            'AccountStatus': customer['status'],
            'IsVIP': 'true' if customer['plan'] == 'enterprise' else 'false'
        }
    else:
        return {
            'CustomerName': 'Unknown',
            'AccountType': 'none',
            'AccountStatus': 'not_found',
            'IsVIP': 'false'
        }

def lookup_customer(phone):
    """Placeholder - look up customer in your database."""
    import boto3
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('customers')
    response = table.get_item(Key={'phone': phone})
    return response.get('Item')
```

The Lambda return values become contact attributes that you can use in subsequent steps of the contact flow - for example, routing VIP customers to a priority queue.

## Enabling Call Recording

Call recording is built in and stores to S3.

```bash
# Recordings are configured at the instance level
# Enable through the console or API
aws connect update-instance-storage-config \
  --instance-id INSTANCE_ID \
  --resource-type CALL_RECORDINGS \
  --association-id STORAGE_CONFIG_ID \
  --storage-config '{
    "StorageType": "S3",
    "S3Config": {
      "BucketName": "my-connect-recordings",
      "BucketPrefix": "recordings/"
    }
  }'
```

## Real-Time and Historical Metrics

Connect provides both real-time and historical metrics through the API.

```python
import boto3

connect = boto3.client('connect', region_name='us-east-1')

# Get current queue metrics
response = connect.get_current_metric_data(
    InstanceId='INSTANCE_ID',
    Filters={
        'Queues': ['SUPPORT_QUEUE_ID'],
        'Channels': ['VOICE']
    },
    CurrentMetrics=[
        {'Name': 'AGENTS_ONLINE', 'Unit': 'COUNT'},
        {'Name': 'AGENTS_AVAILABLE', 'Unit': 'COUNT'},
        {'Name': 'CONTACTS_IN_QUEUE', 'Unit': 'COUNT'},
        {'Name': 'OLDEST_CONTACT_AGE', 'Unit': 'SECONDS'}
    ]
)

for result in response['MetricResults']:
    for metric in result['Collections']:
        name = metric['Metric']['Name']
        value = metric['Value']
        print(f"{name}: {value}")
```

## Summary

Amazon Connect turns a complex telecommunications project into a software configuration task. No hardware, no contracts, no capacity planning - just API calls and configuration. The contact flow system is flexible enough to build anything from a simple IVR to a sophisticated routing engine. Start with a basic setup (one queue, one flow, a few agents) and expand as your needs grow. The pay-per-minute pricing means you're not paying for capacity you don't use, which is perfect for growing teams.
