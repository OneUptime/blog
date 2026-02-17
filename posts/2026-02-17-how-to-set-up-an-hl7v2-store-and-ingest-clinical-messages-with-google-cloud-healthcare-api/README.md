# How to Set Up an HL7v2 Store and Ingest Clinical Messages with Google Cloud Healthcare API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Healthcare API, HL7v2, Clinical Messages, Health Data

Description: Set up an HL7v2 store in Google Cloud Healthcare API and ingest clinical messages from hospital systems for processing and analytics.

---

HL7v2 is the workhorse of healthcare data exchange. Despite being decades old, it is still the primary protocol used by hospitals, labs, and clinical systems to send messages about patient admissions, lab results, orders, and more. If you are building an integration with a hospital's EHR system, you will almost certainly need to handle HL7v2 messages.

Google Cloud Healthcare API provides a managed HL7v2 store that can receive, parse, validate, and store these messages. It also supports Pub/Sub notifications so you can trigger processing pipelines when new messages arrive.

In this guide, I will set up an HL7v2 store, configure message parsing, ingest messages, and build a processing pipeline.

## Understanding HL7v2 Messages

HL7v2 messages are pipe-delimited text (not JSON or XML). Here is what an ADT (Admit, Discharge, Transfer) message looks like:

```
MSH|^~\&|EPIC|HOSPITAL|CLOUD|GCP|20260217120000||ADT^A01|MSG00001|P|2.5.1
EVN|A01|20260217120000
PID|1||MRN12345^^^HOSPITAL||Smith^John^J||19850315|M
PV1|1|I|ICU^101^A||||||1234^Jones^Sarah|||||||||||V001
```

Each line is a segment (MSH, EVN, PID, PV1), and fields within each segment are separated by pipes. The MSH segment is the header that identifies the message type and version.

## Prerequisites

- GCP project with Healthcare API enabled
- Understanding of HL7v2 message types your systems send
- Python 3.8+

```bash
gcloud services enable healthcare.googleapis.com
pip install google-api-python-client google-cloud-pubsub
```

## Step 1: Create the HL7v2 Store

```bash
# Create a healthcare dataset if you do not have one
gcloud healthcare datasets create clinical-data \
  --location=us-central1

# Create a Pub/Sub topic for message notifications
gcloud pubsub topics create hl7v2-notifications

# Create the HL7v2 store
gcloud healthcare hl7v2-stores create clinical-messages \
  --dataset=clinical-data \
  --location=us-central1 \
  --notification-config=pubsubTopic=projects/your-project/topics/hl7v2-notifications
```

For detailed configuration, use the API:

```python
# create_hl7v2_store.py - Creates an HL7v2 store with parsing configuration

from googleapiclient import discovery
from google.oauth2 import service_account

def get_client():
    """Creates an authenticated Healthcare API client."""
    credentials = service_account.Credentials.from_service_account_file(
        "service-account-key.json",
        scopes=["https://www.googleapis.com/auth/cloud-healthcare"],
    )
    return discovery.build("healthcare", "v1", credentials=credentials)

PROJECT_ID = "your-project"
LOCATION = "us-central1"
DATASET_ID = "clinical-data"

def create_hl7v2_store(store_id):
    """Creates an HL7v2 store with parser configuration and notifications.
    The parser config tells the store how to handle different message versions."""

    client = get_client()
    parent = f"projects/{PROJECT_ID}/locations/{LOCATION}/datasets/{DATASET_ID}"

    body = {
        "parserConfig": {
            # Schema defines how to parse specific message types
            "version": "V2",
            # Allow null header to handle messages with incomplete MSH segments
            "allowNullHeader": False,
        },
        "notificationConfigs": [
            {
                "pubsubTopic": f"projects/{PROJECT_ID}/topics/hl7v2-notifications",
                # Filter to only notify on specific message types
                "filter": "",  # Empty filter means all messages
            }
        ],
    }

    result = (
        client.projects()
        .locations()
        .datasets()
        .hl7V2Stores()
        .create(parent=parent, body=body, hl7V2StoreId=store_id)
        .execute()
    )

    print(f"HL7v2 store created: {result['name']}")
    return result

create_hl7v2_store("clinical-messages")
```

## Step 2: Ingest HL7v2 Messages

Send messages to the store using the API:

```python
import base64
import json

HL7V2_STORE_PATH = (
    f"projects/{PROJECT_ID}/locations/{LOCATION}/"
    f"datasets/{DATASET_ID}/hl7V2Stores/clinical-messages"
)

def ingest_hl7v2_message(message_text):
    """Ingests a single HL7v2 message into the store.
    The message must be a valid HL7v2 formatted string.

    Args:
        message_text: Raw HL7v2 message string with segments separated by \\r
    """

    client = get_client()

    # The message data must be base64 encoded
    encoded_message = base64.b64encode(message_text.encode("utf-8")).decode("utf-8")

    body = {
        "message": {
            "data": encoded_message,
        }
    }

    result = (
        client.projects()
        .locations()
        .datasets()
        .hl7V2Stores()
        .messages()
        .ingest(parent=HL7V2_STORE_PATH, body=body)
        .execute()
    )

    message_name = result.get("message", {}).get("name", "")
    print(f"Message ingested: {message_name}")
    return result

# Example: Ingest an ADT A01 (patient admission) message
adt_message = (
    "MSH|^~\\&|EPIC|HOSPITAL|CLOUD|GCP|20260217120000||ADT^A01|MSG00001|P|2.5.1\r"
    "EVN|A01|20260217120000\r"
    "PID|1||MRN12345^^^HOSPITAL||Smith^John^J||19850315|M|||"
    "123 Main St^^Springfield^IL^62701\r"
    "PV1|1|I|ICU^101^A||||||1234^Jones^Sarah|||||||||||V001"
)

ingest_hl7v2_message(adt_message)
```

## Step 3: Ingest Lab Result Messages

```python
def ingest_lab_result():
    """Ingests an ORU R01 message (lab result observation)."""

    oru_message = (
        "MSH|^~\\&|LAB|HOSPITAL|CLOUD|GCP|20260217140000||ORU^R01|MSG00002|P|2.5.1\r"
        "PID|1||MRN12345^^^HOSPITAL||Smith^John^J||19850315|M\r"
        "OBR|1||LAB20260001|CBC^Complete Blood Count^LOCAL|||20260217130000\r"
        "OBX|1|NM|WBC^White Blood Cell Count^LOCAL||7.5|10*3/uL|4.5-11.0|N|||F\r"
        "OBX|2|NM|RBC^Red Blood Cell Count^LOCAL||4.8|10*6/uL|4.2-5.9|N|||F\r"
        "OBX|3|NM|HGB^Hemoglobin^LOCAL||14.2|g/dL|12.0-17.5|N|||F\r"
        "OBX|4|NM|HCT^Hematocrit^LOCAL||42.1|%|36.0-51.0|N|||F\r"
        "OBX|5|NM|PLT^Platelet Count^LOCAL||250|10*3/uL|150-400|N|||F"
    )

    return ingest_hl7v2_message(oru_message)

ingest_lab_result()
```

## Step 4: Read and Parse Stored Messages

```python
def get_message(message_name):
    """Retrieves a stored HL7v2 message and its parsed content.
    The API returns both the raw message and a parsed JSON representation."""

    client = get_client()

    result = (
        client.projects()
        .locations()
        .datasets()
        .hl7V2Stores()
        .messages()
        .get(name=message_name)
        .execute()
    )

    # Decode the raw message
    raw_data = base64.b64decode(result["data"]).decode("utf-8")
    print(f"Raw message:\n{raw_data}\n")

    # The parsed content is available as a JSON structure
    parsed = result.get("parsedData", {})
    if parsed:
        print("Parsed segments:")
        for segment_name, segment_data in parsed.items():
            print(f"  {segment_name}: {json.dumps(segment_data, indent=2)[:200]}")

    # Message metadata
    print(f"\nMessage type: {result.get('messageType', 'Unknown')}")
    print(f"Send time: {result.get('sendTime', 'Unknown')}")
    print(f"Create time: {result.get('createTime', 'Unknown')}")

    return result

def list_messages(message_type=None):
    """Lists messages in the HL7v2 store, optionally filtered by type."""

    client = get_client()

    filter_str = ""
    if message_type:
        filter_str = f'messageType="{message_type}"'

    result = (
        client.projects()
        .locations()
        .datasets()
        .hl7V2Stores()
        .messages()
        .list(parent=HL7V2_STORE_PATH, filter=filter_str)
        .execute()
    )

    messages = result.get("hl7V2Messages", [])
    print(f"Found {len(messages)} messages")

    for msg in messages:
        print(f"  {msg['name']} - Type: {msg.get('messageType', 'Unknown')}")

    return messages
```

## Step 5: Build a Message Processing Pipeline

Use Pub/Sub to trigger processing when messages arrive:

```python
# process_hl7v2/main.py - Cloud Function that processes incoming HL7v2 messages

import json
import base64
from googleapiclient import discovery
from google.oauth2 import service_account
from google.cloud import firestore
import functions_framework

db = firestore.Client()

def get_client():
    """Creates Healthcare API client."""
    credentials = service_account.Credentials.from_service_account_file(
        "service-account-key.json",
        scopes=["https://www.googleapis.com/auth/cloud-healthcare"],
    )
    return discovery.build("healthcare", "v1", credentials=credentials)

def parse_pid_segment(raw_message):
    """Extracts patient information from the PID segment.
    Returns a dictionary with patient demographics."""

    lines = raw_message.split("\r")
    for line in lines:
        if line.startswith("PID|"):
            fields = line.split("|")
            patient_info = {
                "mrn": fields[3].split("^")[0] if len(fields) > 3 else "",
                "last_name": fields[5].split("^")[0] if len(fields) > 5 else "",
                "first_name": fields[5].split("^")[1] if len(fields) > 5 and "^" in fields[5] else "",
                "dob": fields[7] if len(fields) > 7 else "",
                "gender": fields[8] if len(fields) > 8 else "",
            }
            return patient_info
    return None

def parse_obx_segments(raw_message):
    """Extracts observation results from OBX segments.
    Returns a list of lab results with values and reference ranges."""

    results = []
    lines = raw_message.split("\r")
    for line in lines:
        if line.startswith("OBX|"):
            fields = line.split("|")
            if len(fields) >= 8:
                result = {
                    "code": fields[3].split("^")[0] if len(fields) > 3 else "",
                    "name": fields[3].split("^")[1] if "^" in fields[3] else fields[3],
                    "value": fields[5] if len(fields) > 5 else "",
                    "unit": fields[6] if len(fields) > 6 else "",
                    "reference_range": fields[7] if len(fields) > 7 else "",
                    "abnormal_flag": fields[8] if len(fields) > 8 else "",
                    "status": fields[11] if len(fields) > 11 else "",
                }
                results.append(result)
    return results

@functions_framework.cloud_event
def process_message(cloud_event):
    """Processes incoming HL7v2 messages from the Pub/Sub notification.
    Routes to different handlers based on message type."""

    data = json.loads(base64.b64decode(cloud_event.data["message"]["data"]))
    message_name = data.get("name", "")

    if not message_name:
        return

    # Retrieve the full message from the HL7v2 store
    client = get_client()
    message = (
        client.projects()
        .locations()
        .datasets()
        .hl7V2Stores()
        .messages()
        .get(name=message_name)
        .execute()
    )

    raw_data = base64.b64decode(message["data"]).decode("utf-8")
    message_type = message.get("messageType", "")

    print(f"Processing {message_type} message: {message_name}")

    # Route based on message type
    if message_type == "ADT^A01":
        # Patient admission
        patient = parse_pid_segment(raw_data)
        if patient:
            db.collection("patients").document(patient["mrn"]).set({
                "mrn": patient["mrn"],
                "name": f"{patient['first_name']} {patient['last_name']}",
                "dob": patient["dob"],
                "gender": patient["gender"],
                "status": "admitted",
                "admitted_at": firestore.SERVER_TIMESTAMP,
            }, merge=True)
            print(f"Patient admitted: {patient['mrn']}")

    elif message_type == "ORU^R01":
        # Lab result
        patient = parse_pid_segment(raw_data)
        results = parse_obx_segments(raw_data)

        if patient and results:
            # Store lab results
            for result in results:
                db.collection("lab_results").add({
                    "patient_mrn": patient["mrn"],
                    "test_code": result["code"],
                    "test_name": result["name"],
                    "value": result["value"],
                    "unit": result["unit"],
                    "reference_range": result["reference_range"],
                    "abnormal_flag": result["abnormal_flag"],
                    "received_at": firestore.SERVER_TIMESTAMP,
                })

            print(f"Stored {len(results)} lab results for patient {patient['mrn']}")

    elif message_type == "ADT^A03":
        # Patient discharge
        patient = parse_pid_segment(raw_data)
        if patient:
            db.collection("patients").document(patient["mrn"]).update({
                "status": "discharged",
                "discharged_at": firestore.SERVER_TIMESTAMP,
            })
            print(f"Patient discharged: {patient['mrn']}")
```

Deploy the processing function:

```bash
# Deploy the HL7v2 message processor
gcloud functions deploy process-hl7v2 \
  --gen2 \
  --runtime=python311 \
  --trigger-topic=hl7v2-notifications \
  --region=us-central1 \
  --memory=256MB \
  --timeout=120s \
  --entry-point=process_message
```

## Step 6: Set Up MLLP Adapter for Hospital Connectivity

Hospitals typically send HL7v2 over MLLP (Minimal Lower Layer Protocol), not HTTP. Google provides an MLLP adapter that bridges MLLP to the Healthcare API:

```bash
# Deploy the MLLP adapter as a container on GKE
# The adapter listens for MLLP connections and forwards to the Healthcare API
docker pull gcr.io/cloud-healthcare-containers/mllp-adapter:latest

# Run the adapter
docker run -p 2575:2575 \
  -e HL7_V2_PROJECT_ID=your-project \
  -e HL7_V2_LOCATION_ID=us-central1 \
  -e HL7_V2_DATASET_ID=clinical-data \
  -e HL7_V2_STORE_ID=clinical-messages \
  gcr.io/cloud-healthcare-containers/mllp-adapter:latest
```

The adapter listens on port 2575 (standard MLLP port) and forwards messages to the Healthcare API HL7v2 store.

## Wrapping Up

The HL7v2 store in the Healthcare API bridges the gap between legacy hospital systems and modern cloud infrastructure. It accepts messages in the format hospitals already send, stores them durably, and triggers event-driven processing through Pub/Sub. The MLLP adapter makes it possible to connect directly to hospital interfaces without custom protocol handling. For most healthcare integrations, this setup handles the ingestion layer so you can focus on building the clinical workflows and analytics on top.
