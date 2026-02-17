# How to Deploy an Azure Bot Service Bot to Microsoft Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Bot Service, Microsoft Teams, Bot Framework, Deployment, Teams Apps, Conversational AI, Azure

Description: Complete guide to deploying an Azure Bot Service bot to Microsoft Teams including app manifest configuration and admin approval.

---

Microsoft Teams is where many organizations spend their working hours, making it an ideal channel for deploying chatbots. With Azure Bot Service, you can take any bot you have built and connect it to Teams with relatively little effort. The bot appears as a contact in Teams that users can chat with one-on-one or add to group channels.

This guide covers the full deployment process, from enabling the Teams channel in Azure Bot Service to creating the Teams app manifest, testing, and rolling out to your organization.

## Prerequisites

Before starting, make sure you have:

- A working bot deployed to Azure App Service (or any publicly accessible endpoint)
- An Azure Bot Service resource already created and pointing to your bot endpoint
- A Microsoft 365 tenant with Teams enabled
- Admin access to the Teams Admin Center (for organization-wide deployment)
- The Teams Toolkit extension for VS Code (optional but helpful)

## Step 1: Enable the Teams Channel

The first step is to tell Azure Bot Service that your bot should be available on Microsoft Teams.

Go to the Azure portal, open your Azure Bot resource, and navigate to "Channels." You will see a list of available channels including Web Chat, Teams, Slack, and others. Click on "Microsoft Teams."

You will be presented with the Teams channel configuration page. For most bots, the default settings work fine:

- **Messaging**: Enable this to allow the bot to send and receive text messages
- **Calling**: Enable only if your bot handles voice calls (most do not)
- **Tab applications**: Enable if you want to embed web content in Teams tabs through the bot

Click "Apply" to save the configuration. Azure Bot Service will validate the setup and activate the Teams channel.

## Step 2: Test with the Teams Web Client

Before building a full app manifest, do a quick smoke test. In the Azure portal, under the Teams channel configuration, you will find a link that says "Open in Teams." Click it, and Teams will open with a chat to your bot. Send a test message and verify that the bot responds correctly.

If this works, your bot is successfully connected to Teams at the protocol level. The remaining steps are about packaging it as a proper Teams app for distribution.

## Step 3: Create the Teams App Manifest

Teams apps are defined by a JSON manifest file and two icon files. The manifest tells Teams everything about your app - what it is called, what it can do, and how to connect to it.

Create a directory for your Teams app package:

```bash
# Create the Teams app package structure
mkdir teams-app
cd teams-app
```

Create the manifest file:

```json
{
    "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
    "manifestVersion": "1.16",
    "version": "1.0.0",
    "id": "your-microsoft-app-id-here",
    "developer": {
        "name": "Your Company",
        "websiteUrl": "https://yourcompany.com",
        "privacyUrl": "https://yourcompany.com/privacy",
        "termsOfUseUrl": "https://yourcompany.com/terms"
    },
    "name": {
        "short": "Support Bot",
        "full": "OneUptime Support Bot"
    },
    "description": {
        "short": "Get help with monitoring and alerting",
        "full": "A conversational support bot that helps you with OneUptime monitoring setup, alert configuration, incident management, and troubleshooting. Ask questions in natural language and get instant answers."
    },
    "icons": {
        "outline": "outline.png",
        "color": "color.png"
    },
    "accentColor": "#5C2D91",
    "bots": [
        {
            "botId": "your-microsoft-app-id-here",
            "scopes": [
                "personal",
                "team",
                "groupChat"
            ],
            "supportsFiles": false,
            "isNotificationOnly": false,
            "commandLists": [
                {
                    "scopes": ["personal"],
                    "commands": [
                        {
                            "title": "help",
                            "description": "Show available commands and topics"
                        },
                        {
                            "title": "status",
                            "description": "Check the status of your monitors"
                        },
                        {
                            "title": "incidents",
                            "description": "List recent incidents"
                        }
                    ]
                }
            ]
        }
    ],
    "permissions": [
        "identity",
        "messageTeamMembers"
    ],
    "validDomains": [
        "your-bot-app.azurewebsites.net"
    ]
}
```

The `id` and `botId` fields must match the Microsoft App ID from your Azure Bot resource registration. The `scopes` array defines where the bot can be used - `personal` for 1:1 chats, `team` for channel conversations, and `groupChat` for group chats.

## Step 4: Create the App Icons

Teams requires two icon files:

- **color.png**: A 192x192 pixel full-color icon
- **outline.png**: A 32x32 pixel outline icon (transparent background with a single color)

Place both icons in the same directory as your manifest.json file.

## Step 5: Package the App

The Teams app package is simply a ZIP file containing the manifest and icons:

```bash
# Create the Teams app package as a ZIP file
zip support-bot.zip manifest.json color.png outline.png
```

## Step 6: Sideload the App for Testing

Before distributing to the whole organization, test the app by sideloading it. In Teams, click the "Apps" icon in the sidebar, then "Manage your apps," and select "Upload a custom app." Choose your ZIP file.

If sideloading is disabled in your tenant, a Teams admin needs to enable it in the Teams Admin Center under "Teams apps" then "Setup policies."

After uploading, you should see your bot appear in your Apps list. Click on it and start a conversation. Test all the scenarios you care about:

- Sending a simple text message
- Checking that conversation context is maintained across multiple messages
- Testing in a team channel (mention the bot with @SupportBot)
- Testing in a group chat

## Step 7: Handle Teams-Specific Events

Teams sends additional events that your bot should handle, like being added to a team or a user installing the app. Update your bot to handle these:

```python
# teams_bot.py - Bot with Teams-specific event handlers
from botbuilder.core import ActivityHandler, TurnContext
from botbuilder.schema import ChannelAccount

class TeamsSupportBot(ActivityHandler):
    """Bot that handles Teams-specific events in addition to messages."""

    async def on_message_activity(self, turn_context: TurnContext):
        """Handle regular messages - same as before."""
        # Check if the bot was mentioned in a channel
        # Teams channel messages include the bot mention in the text
        text = turn_context.activity.text
        if turn_context.activity.channel_data:
            # Remove the bot mention from the message text
            text = self._remove_mention(turn_context)

        # Process the cleaned message text
        response = await self._get_ai_response(text, turn_context)
        await turn_context.send_activity(response)

    async def on_teams_members_added(self, members_added, team_info, turn_context):
        """Called when the bot is added to a team."""
        for member in members_added:
            if member.id != turn_context.activity.recipient.id:
                # A user was added to the team, optionally greet them
                pass
            else:
                # The bot itself was added to the team
                await turn_context.send_activity(
                    "Hello! I'm the support bot. Mention me with "
                    "@SupportBot followed by your question, and I'll help out."
                )

    async def on_teams_members_removed(self, members_removed, team_info, turn_context):
        """Called when members are removed from a team."""
        # Clean up any stored state for removed members
        pass

    async def on_installation_update_activity(self, turn_context: TurnContext):
        """Called when the bot is installed or uninstalled."""
        action = turn_context.activity.action
        if action == "add":
            await turn_context.send_activity(
                "Thanks for installing me! Type 'help' to see what I can do."
            )

    def _remove_mention(self, turn_context: TurnContext) -> str:
        """Remove the bot @mention from the message text."""
        text = turn_context.activity.text or ""
        mentions = turn_context.activity.entities or []
        for mention in mentions:
            if mention.type == "mention":
                mentioned = mention.additional_properties.get("mentioned", {})
                if mentioned.get("id") == turn_context.activity.recipient.id:
                    # Remove the mention text from the message
                    mention_text = mention.additional_properties.get("text", "")
                    text = text.replace(mention_text, "").strip()
        return text
```

## Step 8: Use Adaptive Cards for Rich Responses

Plain text works, but Teams supports Adaptive Cards for much richer interactions. Here is how to send an adaptive card from your bot:

```python
# Send an Adaptive Card response in Teams
from botbuilder.core import CardFactory
from botbuilder.schema import Activity, ActivityTypes, Attachment

async def send_status_card(self, turn_context: TurnContext):
    """Send a rich status card using Adaptive Cards."""
    card = {
        "type": "AdaptiveCard",
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.4",
        "body": [
            {
                "type": "TextBlock",
                "text": "Monitor Status",
                "weight": "Bolder",
                "size": "Large"
            },
            {
                "type": "FactSet",
                "facts": [
                    {"title": "API Server", "value": "Operational"},
                    {"title": "Database", "value": "Operational"},
                    {"title": "CDN", "value": "Degraded Performance"}
                ]
            },
            {
                "type": "TextBlock",
                "text": "Last checked: 2 minutes ago",
                "isSubtle": True,
                "size": "Small"
            }
        ],
        "actions": [
            {
                "type": "Action.OpenUrl",
                "title": "View Dashboard",
                "url": "https://oneuptime.com/dashboard"
            }
        ]
    }

    # Create the attachment and send it
    attachment = CardFactory.adaptive_card(card)
    message = Activity(
        type=ActivityTypes.message,
        attachments=[attachment]
    )
    await turn_context.send_activity(message)
```

## Step 9: Publish to the Organization

Once testing is complete, publish the app to your organization's Teams app catalog. Go to the Teams Admin Center, navigate to "Teams apps" then "Manage apps," and click "Upload new app." Upload your ZIP package.

After uploading, you can control who has access to the app through app setup policies. You can:

- Make it available to everyone by default
- Pin it to the Teams sidebar for specific user groups
- Require admin approval before users can install it

## Troubleshooting Common Issues

**Bot does not respond in Teams**: Check that the messaging endpoint in your Azure Bot resource matches your deployed bot URL. The endpoint must use HTTPS.

**Authentication errors**: Verify that the Microsoft App ID and password in your bot code match the Azure Bot resource registration.

**Bot works in personal chat but not in channels**: Make sure the `team` scope is included in the manifest and that your bot handles the `@mention` properly.

**Cards not rendering**: Teams has specific Adaptive Card version requirements. Stick to version 1.4 or earlier for maximum compatibility.

## Summary

Deploying a bot to Microsoft Teams through Azure Bot Service involves enabling the Teams channel, creating an app manifest, packaging it, testing through sideloading, and publishing to the organization's app catalog. The process is well documented but has several moving parts. The payoff is significant - your bot becomes available right where your users work, reducing context switching and making support or automation tools instantly accessible.
