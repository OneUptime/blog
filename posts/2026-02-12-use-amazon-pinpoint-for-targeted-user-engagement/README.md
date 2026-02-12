# How to Use Amazon Pinpoint for Targeted User Engagement

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Pinpoint, User Engagement, Push Notifications, Email, SMS, Marketing

Description: Use Amazon Pinpoint to send targeted push notifications, emails, and SMS messages to your users based on segments, behavior, and real-time events.

---

Getting the right message to the right user at the right time is the core challenge of user engagement. Blast everyone with the same notification and you get unsubscribes. Send nothing and you lose engagement. Amazon Pinpoint sits in the middle, giving you the tools to segment your users, design multi-channel campaigns, and trigger messages based on user behavior.

Pinpoint handles email, SMS, push notifications, voice messages, and custom channels. It is not just a messaging service - it includes analytics, segmentation, campaign orchestration, and A/B testing. Think of it as a marketing automation platform built into AWS.

## Architecture Overview

```mermaid
graph LR
    A[User Events] --> B[Pinpoint Analytics]
    B --> C[Segments]
    C --> D[Campaigns]
    C --> E[Journeys]
    D --> F[Email]
    D --> G[SMS]
    D --> H[Push Notification]
    E --> F
    E --> G
    E --> H
    I[Transactional API] --> F
    I --> G
    I --> H
```

Pinpoint has two modes of sending messages:

1. **Campaign/Journey mode** - scheduled or triggered messages to segments of users
2. **Transactional mode** - one-off messages sent via API (password resets, order confirmations, etc.)

## Step 1: Create a Pinpoint Project

```bash
# Create a Pinpoint application (project)
aws pinpoint create-app \
  --create-application-request '{
    "Name": "MyApp-UserEngagement",
    "tags": {
      "Environment": "production",
      "Team": "growth"
    }
  }'
```

Note the Application ID from the response. You will need it for everything else.

## Step 2: Configure Channels

Enable the channels you want to use for communication.

### Email Channel

```bash
# Enable email channel (requires a verified identity in SES)
aws pinpoint update-email-channel \
  --application-id "APP_ID" \
  --email-channel-request '{
    "FromAddress": "notifications@yourapp.com",
    "Identity": "arn:aws:ses:us-east-1:123456789012:identity/yourapp.com",
    "Enabled": true
  }'
```

### SMS Channel

```bash
# Enable SMS channel
aws pinpoint update-sms-channel \
  --application-id "APP_ID" \
  --sms-channel-request '{
    "Enabled": true,
    "SenderId": "MyApp"
  }'
```

### Push Notification Channel

For push notifications, you need to configure the platform credentials for each mobile platform:

```bash
# Configure APNs (Apple Push Notification service)
aws pinpoint update-apns-channel \
  --application-id "APP_ID" \
  --apns-channel-request '{
    "BundleId": "com.yourapp.ios",
    "Certificate": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
    "PrivateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
    "Enabled": true
  }'

# Configure FCM (Firebase Cloud Messaging) for Android
aws pinpoint update-gcm-channel \
  --application-id "APP_ID" \
  --gcm-channel-request '{
    "ApiKey": "your-fcm-server-key",
    "Enabled": true
  }'
```

## Step 3: Import or Create Endpoints

In Pinpoint, an "endpoint" is a destination you can send messages to - a device, email address, or phone number. Each endpoint is associated with a user and can have custom attributes.

```bash
# Add or update an endpoint (user's device/contact info)
aws pinpoint update-endpoint \
  --application-id "APP_ID" \
  --endpoint-id "user123-iphone" \
  --endpoint-request '{
    "Address": "device-token-from-apns",
    "ChannelType": "APNS",
    "User": {
      "UserId": "user123",
      "UserAttributes": {
        "Plan": ["premium"],
        "SignupDate": ["2026-01-15"],
        "Interests": ["monitoring", "devops"]
      }
    },
    "Attributes": {
      "DeviceOS": ["iOS"],
      "AppVersion": ["3.2.1"]
    },
    "Demographic": {
      "AppVersion": "3.2.1",
      "Platform": "iOS",
      "Make": "Apple",
      "Model": "iPhone 15"
    },
    "Location": {
      "Country": "US",
      "City": "Seattle"
    }
  }'

# Add the same user's email endpoint
aws pinpoint update-endpoint \
  --application-id "APP_ID" \
  --endpoint-id "user123-email" \
  --endpoint-request '{
    "Address": "user123@example.com",
    "ChannelType": "EMAIL",
    "User": {
      "UserId": "user123",
      "UserAttributes": {
        "Plan": ["premium"],
        "SignupDate": ["2026-01-15"]
      }
    },
    "OptOut": "NONE"
  }'
```

For bulk imports, use the import job API:

```bash
# Import endpoints from S3
aws pinpoint create-import-job \
  --application-id "APP_ID" \
  --import-job-request '{
    "Format": "JSON",
    "S3Url": "s3://my-pinpoint-data/endpoints/users.json",
    "RoleArn": "arn:aws:iam::123456789012:role/PinpointImportRole",
    "RegisterEndpoints": true
  }'
```

## Step 4: Create Segments

Segments define which users receive your campaigns. You can create segments based on endpoint attributes, user attributes, and behavior.

```bash
# Create a segment of premium users who signed up in the last 30 days
aws pinpoint create-segment \
  --application-id "APP_ID" \
  --write-segment-request '{
    "Name": "New Premium Users",
    "SegmentGroups": {
      "Groups": [
        {
          "Dimensions": [
            {
              "UserAttributes": {
                "Plan": {
                  "AttributeType": "INCLUSIVE",
                  "Values": ["premium"]
                }
              }
            }
          ],
          "SourceType": "ALL",
          "Type": "ALL"
        }
      ],
      "Include": "ALL"
    }
  }'
```

## Step 5: Create a Campaign

Campaigns send messages to a segment on a schedule or immediately.

```bash
# Create an email campaign targeting new premium users
aws pinpoint create-campaign \
  --application-id "APP_ID" \
  --write-campaign-request '{
    "Name": "Premium Onboarding Tips",
    "SegmentId": "SEGMENT_ID",
    "MessageConfiguration": {
      "EmailMessage": {
        "Title": "Get the most out of your premium plan",
        "HtmlBody": "<html><body><h1>Welcome to Premium!</h1><p>Here are 5 tips to get started...</p></body></html>",
        "FromAddress": "team@yourapp.com"
      }
    },
    "Schedule": {
      "StartTime": "2026-02-13T10:00:00Z",
      "Frequency": "ONCE",
      "Timezone": "America/Los_Angeles"
    },
    "Limits": {
      "Daily": 1,
      "MaximumDuration": 60,
      "Total": 1
    }
  }'
```

## Step 6: Build a Journey for Multi-Step Engagement

Journeys are multi-step, multi-channel engagement workflows. They are more powerful than campaigns because they can branch based on user behavior.

```bash
# Create a journey for onboarding new users
aws pinpoint create-journey \
  --application-id "APP_ID" \
  --write-journey-request '{
    "Name": "New User Onboarding",
    "StartCondition": {
      "SegmentStartCondition": {
        "SegmentId": "new-users-segment-id"
      }
    },
    "Activities": {
      "WelcomeEmail": {
        "EMAIL": {
          "MessageConfig": {
            "FromAddress": "welcome@yourapp.com"
          },
          "TemplateName": "welcome-email-template",
          "TemplateVersion": "1"
        },
        "NextActivity": "Wait3Days"
      },
      "Wait3Days": {
        "Wait": {
          "WaitTime": {
            "WaitFor": "3d"
          }
        },
        "NextActivity": "CheckEngagement"
      },
      "CheckEngagement": {
        "ConditionalSplit": {
          "Condition": {
            "Conditions": [
              {
                "EventCondition": {
                  "MessageActivity": "WelcomeEmail",
                  "Dimensions": {
                    "EventType": {
                      "Values": ["email.open"],
                      "DimensionType": "INCLUSIVE"
                    }
                  }
                }
              }
            ]
          },
          "EvaluationWaitTime": {
            "WaitFor": "1d"
          },
          "TrueActivity": "EngagedFollowUp",
          "FalseActivity": "ReengagePush"
        }
      }
    },
    "State": "ACTIVE"
  }'
```

This journey sends a welcome email, waits 3 days, then checks if the user opened it. Engaged users get a follow-up with advanced tips. Users who did not open the email get a push notification instead.

## Step 7: Send Transactional Messages

For one-off messages like password resets or order confirmations:

```bash
# Send a transactional email
aws pinpoint send-messages \
  --application-id "APP_ID" \
  --message-request '{
    "Addresses": {
      "user@example.com": {
        "ChannelType": "EMAIL"
      }
    },
    "MessageConfiguration": {
      "EmailMessage": {
        "SimpleEmail": {
          "Subject": {"Data": "Your password has been reset"},
          "HtmlPart": {"Data": "<p>Your password was successfully reset. If you did not make this change, contact support immediately.</p>"},
          "TextPart": {"Data": "Your password was successfully reset."}
        }
      }
    }
  }'
```

## Tracking Events and Analytics

Record user events to feed into Pinpoint analytics and segment targeting:

```bash
# Record a user event
aws pinpoint put-events \
  --application-id "APP_ID" \
  --events-request '{
    "BatchItem": {
      "user123-iphone": {
        "Endpoint": {},
        "Events": {
          "event1": {
            "EventType": "feature_used",
            "Timestamp": "2026-02-12T10:30:00Z",
            "Attributes": {
              "FeatureName": "dashboard",
              "Action": "viewed"
            },
            "Metrics": {
              "Duration": 120
            }
          }
        }
      }
    }
  }'
```

These events show up in Pinpoint analytics and can be used to trigger journeys or define segments.

## Wrapping Up

Amazon Pinpoint gives you a full user engagement platform within AWS. The combination of multi-channel messaging, behavioral segmentation, journey orchestration, and analytics means you can build sophisticated engagement workflows without stitching together multiple third-party tools. Start with transactional messaging for immediate use, then layer on campaigns and journeys as you understand your users' behavior patterns.
