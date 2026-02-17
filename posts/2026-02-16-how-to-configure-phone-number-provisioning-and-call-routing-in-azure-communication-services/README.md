# How to Configure Phone Number Provisioning and Call Routing in Azure Communication Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Communication Services, Phone Numbers, Call Routing, PSTN, VoIP, Telephony, Cloud Communications

Description: Learn how to provision phone numbers and configure call routing in Azure Communication Services for building voice-enabled cloud applications.

---

Building voice capabilities into your application used to require dedicated telephony infrastructure, SIP trunks, and PBX systems. Azure Communication Services (ACS) simplifies this by providing phone number provisioning, PSTN connectivity, and call routing as cloud APIs. You can buy phone numbers, receive inbound calls, make outbound calls, and route calls between users and PSTN endpoints - all through code. This guide covers phone number provisioning, inbound call routing, and outbound calling configuration.

## What Azure Communication Services Offers for Voice

ACS provides several voice-related capabilities:

- **Phone number provisioning**: Buy toll-free and local phone numbers in supported countries
- **PSTN calling**: Make and receive calls to/from regular phone numbers
- **VoIP calling**: Voice over IP between ACS users (no phone number needed)
- **Call routing**: Direct inbound calls to specific endpoints, queues, or applications
- **Call recording**: Record calls for compliance and quality assurance
- **Call automation**: Build IVR systems and automated call flows

## Prerequisites

- An Azure Communication Services resource
- Azure CLI installed
- A supported country for phone number provisioning (US, UK, Canada, and others)
- Node.js 18+ or Python 3.8+ for the SDK examples

## Step 1: Create an Azure Communication Services Resource

```bash
# Create the ACS resource
RESOURCE_GROUP="rg-communications"
ACS_NAME="acs-voice-prod"
LOCATION="unitedstates"

az group create --name $RESOURCE_GROUP --location eastus

az communication create \
    --name $ACS_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --data-location "unitedstates"

# Get the connection string
ACS_CONNECTION=$(az communication list-key \
    --name $ACS_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "primaryConnectionString" -o tsv)
```

## Step 2: Search and Purchase Phone Numbers

Phone number provisioning starts with a search to see what numbers are available:

```python
# provision_numbers.py
# Search for and purchase phone numbers from Azure Communication Services
from azure.communication.phonenumbers import (
    PhoneNumbersClient,
    PhoneNumberType,
    PhoneNumberAssignmentType,
    PhoneNumberCapabilities,
    PhoneNumberCapabilityType,
)
import os

connection_string = os.environ["ACS_CONNECTION_STRING"]
client = PhoneNumbersClient.from_connection_string(connection_string)

# Search for available toll-free numbers with voice and SMS capabilities
search_poller = client.begin_search_available_phone_numbers(
    country_code="US",
    phone_number_type=PhoneNumberType.TOLL_FREE,
    assignment_type=PhoneNumberAssignmentType.APPLICATION,
    capabilities=PhoneNumberCapabilities(
        calling=PhoneNumberCapabilityType.INBOUND_OUTBOUND,
        sms=PhoneNumberCapabilityType.INBOUND_OUTBOUND,
    ),
    quantity=1,  # How many numbers to search for
)

# Wait for the search to complete
search_result = search_poller.result()
print(f"Found numbers: {[n.phone_number for n in search_result.phone_numbers]}")
print(f"Search ID: {search_result.search_id}")
print(f"Monthly cost: ${search_result.cost.amount} {search_result.cost.currency_code}")

# Purchase the number (this charges your account)
purchase_poller = client.begin_purchase_phone_numbers(search_result.search_id)
purchase_poller.result()

print(f"Number purchased: {search_result.phone_numbers[0].phone_number}")
```

For local numbers (with area codes), modify the search:

```python
# Search for local numbers in a specific area code
search_poller = client.begin_search_available_phone_numbers(
    country_code="US",
    phone_number_type=PhoneNumberType.GEOGRAPHIC,
    assignment_type=PhoneNumberAssignmentType.APPLICATION,
    capabilities=PhoneNumberCapabilities(
        calling=PhoneNumberCapabilityType.INBOUND_OUTBOUND,
        sms=PhoneNumberCapabilityType.NONE,
    ),
    area_code="206",  # Seattle area code
    quantity=1,
)
```

## Step 3: List and Manage Your Phone Numbers

```python
# list_numbers.py
# List all phone numbers in your ACS resource
from azure.communication.phonenumbers import PhoneNumbersClient
import os

connection_string = os.environ["ACS_CONNECTION_STRING"]
client = PhoneNumbersClient.from_connection_string(connection_string)

# List all purchased numbers
numbers = client.list_purchased_phone_numbers()
for number in numbers:
    print(f"Number: {number.phone_number}")
    print(f"  Type: {number.phone_number_type}")
    print(f"  Capabilities: Calling={number.capabilities.calling}, SMS={number.capabilities.sms}")
    print(f"  Assignment: {number.assignment_type}")
    print()
```

## Step 4: Configure Inbound Call Routing

When someone calls your ACS phone number, you need to tell ACS where to route the call. This is done through Event Grid events and the Call Automation SDK.

### Set Up Event Grid for Incoming Calls

```bash
# Create an Event Grid subscription for incoming calls
# This routes call events to your webhook endpoint
ACS_RESOURCE_ID=$(az communication show \
    --name $ACS_NAME \
    --resource-group $RESOURCE_GROUP \
    --query id -o tsv)

az eventgrid event-subscription create \
    --name incoming-calls \
    --source-resource-id $ACS_RESOURCE_ID \
    --endpoint "https://myapp.example.com/api/calls/incoming" \
    --endpoint-type webhook \
    --included-event-types \
        "Microsoft.Communication.IncomingCall"
```

### Handle Incoming Calls with Call Automation

```python
# call_handler.py
# Flask app that handles incoming ACS calls
from flask import Flask, request, jsonify
from azure.communication.callautomation import (
    CallAutomationClient,
    CallInvite,
    PhoneNumberIdentifier,
    CommunicationUserIdentifier,
)
import os

app = Flask(__name__)

connection_string = os.environ["ACS_CONNECTION_STRING"]
callback_url = os.environ["CALLBACK_URL"]
call_client = CallAutomationClient.from_connection_string(connection_string)


@app.route("/api/calls/incoming", methods=["POST"])
def handle_incoming_call():
    """Handle an incoming call event from Event Grid."""
    events = request.json

    for event in events:
        # Handle Event Grid validation
        if event.get("eventType") == "Microsoft.EventGrid.SubscriptionValidationEvent":
            validation_code = event["data"]["validationCode"]
            return jsonify({"validationResponse": validation_code})

        # Handle incoming call
        if event.get("eventType") == "Microsoft.Communication.IncomingCall":
            incoming_context = event["data"]["incomingCallContext"]
            caller = event["data"]["from"]["phoneNumber"]["value"]

            print(f"Incoming call from: {caller}")

            # Answer the call
            call_connection = call_client.answer_call(
                incoming_call_context=incoming_context,
                callback_url=f"{callback_url}/api/calls/events",
            )

            print(f"Call answered: {call_connection.call_connection_id}")

    return "", 200


@app.route("/api/calls/events", methods=["POST"])
def handle_call_events():
    """Handle call state events (connected, disconnected, etc.)."""
    events = request.json

    for event in events:
        event_type = event.get("type")

        if event_type == "Microsoft.Communication.CallConnected":
            call_connection_id = event["data"]["callConnectionId"]
            print(f"Call connected: {call_connection_id}")

            # Get the call connection to interact with the call
            call_connection = call_client.get_call_connection(call_connection_id)

            # Play a welcome message
            play_source = FileSource(url="https://myapp.example.com/audio/welcome.wav")
            call_connection.play_media(play_source)

        elif event_type == "Microsoft.Communication.CallDisconnected":
            print(f"Call disconnected")

    return "", 200
```

## Step 5: Make Outbound Calls

```python
# outbound_call.py
# Make an outbound PSTN call using Azure Communication Services
from azure.communication.callautomation import (
    CallAutomationClient,
    CallInvite,
    PhoneNumberIdentifier,
)
import os

connection_string = os.environ["ACS_CONNECTION_STRING"]
callback_url = os.environ["CALLBACK_URL"]
source_number = "+18005551234"  # Your ACS phone number
target_number = "+12065559876"  # The number to call

client = CallAutomationClient.from_connection_string(connection_string)

# Create the call invite
call_invite = CallInvite(
    target=PhoneNumberIdentifier(target_number),
    source_caller_id_number=PhoneNumberIdentifier(source_number),
)

# Place the call
call_result = client.create_call(
    target_participant=call_invite,
    callback_url=f"{callback_url}/api/calls/events",
)

print(f"Call placed. Connection ID: {call_result.call_connection_id}")
```

## Step 6: Build an IVR (Interactive Voice Response) System

Combine call automation with DTMF tone recognition to build an IVR:

```python
# ivr_handler.py
# Simple IVR system using ACS Call Automation
from azure.communication.callautomation import (
    CallAutomationClient,
    DtmfTone,
    RecognizeInputType,
    TextSource,
    PhoneNumberIdentifier,
)

def handle_call_connected(call_connection):
    """When the call connects, play the IVR menu and listen for input."""
    # Play the IVR menu using text-to-speech
    menu_text = TextSource(
        text="Welcome to Contoso Support. "
             "Press 1 for billing. "
             "Press 2 for technical support. "
             "Press 3 to speak with an operator.",
        voice_name="en-US-JennyNeural"
    )

    # Start recognizing DTMF input
    call_connection.start_recognizing_media(
        input_type=RecognizeInputType.DTMF,
        target_participant=PhoneNumberIdentifier(caller_number),
        play_prompt=menu_text,
        dtmf_inter_tone_timeout=10,
        dtmf_max_tones_to_collect=1,
        dtmf_stop_tones=[DtmfTone.POUND],
    )


def handle_recognize_completed(event, call_connection):
    """Handle the DTMF input from the caller."""
    tones = event["data"]["dtmfResult"]["tones"]

    if not tones:
        # No input received, replay the menu
        handle_call_connected(call_connection)
        return

    selection = tones[0]

    if selection == "one":
        # Transfer to billing queue
        transfer_target = PhoneNumberIdentifier("+18005551001")
        call_connection.transfer_call_to_participant(transfer_target)

    elif selection == "two":
        # Transfer to tech support queue
        transfer_target = PhoneNumberIdentifier("+18005551002")
        call_connection.transfer_call_to_participant(transfer_target)

    elif selection == "three":
        # Transfer to operator
        transfer_target = PhoneNumberIdentifier("+18005551003")
        call_connection.transfer_call_to_participant(transfer_target)

    else:
        # Invalid selection, replay menu
        invalid_text = TextSource(
            text="Invalid selection. Please try again.",
            voice_name="en-US-JennyNeural"
        )
        call_connection.play_media(invalid_text)
        handle_call_connected(call_connection)
```

## Step 7: Monitor Call Quality and Usage

Track call metrics for billing and quality monitoring:

```bash
# Enable diagnostic settings for call analytics
ACS_RESOURCE_ID=$(az communication show \
    --name $ACS_NAME \
    --resource-group $RESOURCE_GROUP \
    --query id -o tsv)

az monitor diagnostic-settings create \
    --name call-analytics \
    --resource "$ACS_RESOURCE_ID" \
    --workspace law-communications \
    --logs '[
        {"category": "CallSummaryLogs", "enabled": true},
        {"category": "CallDiagnosticLogs", "enabled": true},
        {"category": "CallAutomationMediaSummary", "enabled": true}
    ]'
```

Query call data in Log Analytics:

```kusto
// Summarize call volume and duration over the last 7 days
ACSCallSummary
| where TimeGenerated > ago(7d)
| summarize
    TotalCalls = count(),
    AvgDurationSeconds = avg(CallDuration),
    TotalMinutes = sum(CallDuration) / 60
    by bin(TimeGenerated, 1d), CallType
| order by TimeGenerated asc
```

## Pricing Considerations

ACS phone number pricing has several components:
- Monthly number rental (varies by country and number type)
- Per-minute charges for inbound and outbound PSTN calls
- No charge for VoIP-to-VoIP calls between ACS users

For US toll-free numbers, expect roughly $2/month for the number plus $0.013/minute for inbound and $0.013/minute for outbound calls. Local numbers are cheaper to rent but may have higher per-minute rates depending on the destination.

## Summary

Azure Communication Services gives you cloud-based telephony without the infrastructure overhead. Phone number provisioning, inbound call routing, outbound calling, and IVR systems are all available through APIs and SDKs. The setup involves creating an ACS resource, purchasing phone numbers, configuring Event Grid for inbound call notifications, and building call handlers with the Call Automation SDK. For production deployments, add diagnostic logging to monitor call quality and track usage for billing purposes. This platform lets you build voice features into any application without dealing with SIP trunks, PBX hardware, or traditional telecom contracts.
