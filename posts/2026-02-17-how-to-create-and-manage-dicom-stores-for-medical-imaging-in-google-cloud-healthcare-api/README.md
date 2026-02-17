# How to Create and Manage DICOM Stores for Medical Imaging in Google Cloud Healthcare API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Healthcare API, DICOM, Medical Imaging, Cloud Healthcare

Description: Create and manage DICOM stores in Google Cloud Healthcare API for storing, retrieving, and processing medical imaging data like X-rays, CT scans, and MRIs.

---

Medical imaging generates enormous amounts of data. A single CT scan can produce hundreds of image slices, each stored as a DICOM (Digital Imaging and Communications in Medicine) file. Managing this data on-premises means buying and maintaining expensive PACS (Picture Archiving and Communication System) servers. Google Cloud Healthcare API provides a managed DICOM store that handles storage, retrieval, and the standard DICOMweb API, letting you build imaging applications without managing storage infrastructure.

In this guide, I will set up a DICOM store, upload imaging studies, query them using DICOMweb, and integrate with analytics tools.

## What DICOM Stores Provide

The Healthcare API DICOM store supports:

- **DICOMweb standard API**: STOW-RS (store), WADO-RS (retrieve), QIDO-RS (query)
- **Automatic DICOM tag parsing**: Study, series, and instance metadata is indexed for search
- **De-identification**: Built-in tools to remove patient information from DICOM headers
- **BigQuery export**: Export metadata for analytics
- **Pub/Sub notifications**: Events when new studies arrive
- **IAM integration**: Fine-grained access control

## Prerequisites

- GCP project with Healthcare API enabled
- DICOM files to test with (you can use the TCIA public dataset)
- Python 3.8+

```bash
gcloud services enable healthcare.googleapis.com
pip install google-api-python-client pydicom requests
```

## Step 1: Create a DICOM Store

```bash
# Create a healthcare dataset
gcloud healthcare datasets create imaging-data \
  --location=us-central1

# Create Pub/Sub topic for notifications
gcloud pubsub topics create dicom-notifications

# Create the DICOM store
gcloud healthcare dicom-stores create radiology-images \
  --dataset=imaging-data \
  --location=us-central1 \
  --notification-config=pubsubTopic=projects/your-project/topics/dicom-notifications
```

For more configuration options:

```python
# create_dicom_store.py - Creates a DICOM store with full configuration

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
DATASET_ID = "imaging-data"

def create_dicom_store(store_id):
    """Creates a DICOM store with Pub/Sub notifications
    and streaming export to BigQuery for metadata analytics."""

    client = get_client()
    parent = f"projects/{PROJECT_ID}/locations/{LOCATION}/datasets/{DATASET_ID}"

    body = {
        "notificationConfig": {
            "pubsubTopic": f"projects/{PROJECT_ID}/topics/dicom-notifications",
            "sendForBulkImport": True,
        },
        "streamConfigs": [
            {
                # Stream DICOM metadata to BigQuery in real time
                "bigqueryDestination": {
                    "tableUri": f"bq://{PROJECT_ID}.imaging_analytics.dicom_metadata",
                    "force": True,
                }
            }
        ],
    }

    result = (
        client.projects()
        .locations()
        .datasets()
        .dicomStores()
        .create(parent=parent, body=body, dicomStoreId=store_id)
        .execute()
    )

    print(f"DICOM store created: {result['name']}")
    return result

create_dicom_store("radiology-images")
```

## Step 2: Upload DICOM Files (STOW-RS)

Upload DICOM instances using the DICOMweb STOW-RS (Store Over the Web) endpoint:

```python
# upload_dicom.py - Uploads DICOM files to the Healthcare API

import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

DICOM_STORE_PATH = (
    f"projects/{PROJECT_ID}/locations/{LOCATION}/"
    f"datasets/{DATASET_ID}/dicomStores/radiology-images"
)
BASE_URL = f"https://healthcare.googleapis.com/v1/{DICOM_STORE_PATH}"

def get_auth_token():
    """Gets an OAuth2 access token for Healthcare API requests."""
    credentials = service_account.Credentials.from_service_account_file(
        "service-account-key.json",
        scopes=["https://www.googleapis.com/auth/cloud-healthcare"],
    )
    credentials.refresh(Request())
    return credentials.token

def upload_dicom_file(dicom_file_path):
    """Uploads a single DICOM file using the DICOMweb STOW-RS endpoint.

    Args:
        dicom_file_path: Path to a .dcm file on disk
    """

    token = get_auth_token()
    url = f"{BASE_URL}/dicomWeb/studies"

    # Read the DICOM file
    with open(dicom_file_path, "rb") as f:
        dicom_data = f.read()

    # STOW-RS requires multipart/related content type
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/dicom",
        "Accept": "application/dicom+json",
    }

    response = requests.post(url, headers=headers, data=dicom_data)

    if response.status_code == 200:
        print(f"Uploaded successfully: {dicom_file_path}")
    else:
        print(f"Upload failed ({response.status_code}): {response.text}")

    return response

def upload_directory(directory_path):
    """Uploads all DICOM files from a directory."""
    import os

    count = 0
    for filename in os.listdir(directory_path):
        if filename.endswith(".dcm"):
            filepath = os.path.join(directory_path, filename)
            upload_dicom_file(filepath)
            count += 1

    print(f"Uploaded {count} DICOM files")

# Upload a single file
upload_dicom_file("/path/to/image.dcm")

# Upload all files in a directory
upload_directory("/path/to/dicom-files/")
```

## Step 3: Import from Cloud Storage

For bulk imports, use GCS:

```bash
# Upload DICOM files to GCS first
gsutil -m cp /path/to/dicom-files/*.dcm gs://your-dicom-bucket/import/

# Import from GCS into the DICOM store
gcloud healthcare dicom-stores import gcs radiology-images \
  --dataset=imaging-data \
  --location=us-central1 \
  --gcs-uri=gs://your-dicom-bucket/import/*.dcm
```

## Step 4: Query Studies (QIDO-RS)

Search for studies using DICOMweb QIDO-RS:

```python
def search_studies(patient_name=None, modality=None, study_date=None):
    """Searches for DICOM studies using QIDO-RS parameters.
    Returns matching studies with their metadata.

    Args:
        patient_name: Patient name to search for (supports wildcards)
        modality: Imaging modality (CT, MR, CR, US, etc.)
        study_date: Study date or range (YYYYMMDD or YYYYMMDD-YYYYMMDD)
    """

    token = get_auth_token()
    url = f"{BASE_URL}/dicomWeb/studies"

    # Build query parameters using DICOM tag keywords
    params = {}
    if patient_name:
        params["PatientName"] = patient_name
    if modality:
        params["ModalitiesInStudy"] = modality
    if study_date:
        params["StudyDate"] = study_date

    # Request specific fields to reduce response size
    params["includefield"] = "all"

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/dicom+json",
    }

    response = requests.get(url, headers=headers, params=params)

    if response.status_code == 200:
        studies = response.json()
        print(f"Found {len(studies)} studies")

        for study in studies:
            # Extract common DICOM tags
            study_uid = study.get("0020000D", {}).get("Value", [""])[0]
            patient = study.get("00100010", {}).get("Value", [{}])[0]
            patient_name_str = patient.get("Alphabetic", "Unknown")
            modality_val = study.get("00080061", {}).get("Value", ["Unknown"])[0]
            study_date_val = study.get("00080020", {}).get("Value", ["Unknown"])[0]
            description = study.get("00081030", {}).get("Value", [""])[0]

            print(f"\n  Study UID: {study_uid}")
            print(f"  Patient: {patient_name_str}")
            print(f"  Modality: {modality_val}")
            print(f"  Date: {study_date_val}")
            print(f"  Description: {description}")

        return studies
    else:
        print(f"Search failed ({response.status_code}): {response.text}")
        return []

# Search for all CT studies
search_studies(modality="CT")

# Search by patient name
search_studies(patient_name="Smith*")

# Search by date range
search_studies(study_date="20260101-20260217")
```

## Step 5: Retrieve Imaging Data (WADO-RS)

```python
def retrieve_study(study_uid):
    """Retrieves all instances in a study using WADO-RS.
    Returns the DICOM files as binary data."""

    token = get_auth_token()
    url = f"{BASE_URL}/dicomWeb/studies/{study_uid}"

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "multipart/related; type=application/dicom",
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        print(f"Retrieved study {study_uid}")
        print(f"Response size: {len(response.content) / 1024 / 1024:.1f} MB")
        return response.content
    else:
        print(f"Retrieval failed: {response.status_code}")
        return None

def retrieve_rendered_instance(study_uid, series_uid, instance_uid):
    """Retrieves a rendered (PNG/JPEG) version of a DICOM instance.
    This is useful for displaying images in web applications
    without a DICOM viewer."""

    token = get_auth_token()
    url = (
        f"{BASE_URL}/dicomWeb/studies/{study_uid}/"
        f"series/{series_uid}/instances/{instance_uid}/rendered"
    )

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "image/png",
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        # Save the rendered image
        output_path = f"rendered_{instance_uid}.png"
        with open(output_path, "wb") as f:
            f.write(response.content)
        print(f"Rendered image saved to {output_path}")
        return output_path
    else:
        print(f"Render failed: {response.status_code}")
        return None
```

## Step 6: De-identify DICOM Data

For research or sharing, you need to remove patient information:

```python
def deidentify_dicom_store(source_store_id, destination_store_id):
    """Creates a de-identified copy of a DICOM store.
    Removes patient names, IDs, dates, and other PHI from DICOM tags."""

    client = get_client()

    source_path = (
        f"projects/{PROJECT_ID}/locations/{LOCATION}/"
        f"datasets/{DATASET_ID}/dicomStores/{source_store_id}"
    )
    destination_path = (
        f"projects/{PROJECT_ID}/locations/{LOCATION}/"
        f"datasets/{DATASET_ID}/dicomStores/{destination_store_id}"
    )

    body = {
        "destinationStore": destination_path,
        "config": {
            "dicom": {
                "filterProfile": "DEIDENTIFY_TAG_CONTENTS",
            },
            "image": {
                # Also redact text burned into the image pixels
                "textRedactionMode": "REDACT_ALL_TEXT",
            },
        },
    }

    operation = (
        client.projects()
        .locations()
        .datasets()
        .dicomStores()
        .deidentify(sourceStore=source_path, body=body)
        .execute()
    )

    print(f"De-identification started: {operation['name']}")
    return operation

# Create a de-identified copy
deidentify_dicom_store("radiology-images", "radiology-images-deidentified")
```

## Step 7: Export Metadata to BigQuery

Export DICOM metadata for SQL-based analytics:

```bash
# Export DICOM metadata to BigQuery
gcloud healthcare dicom-stores export bq radiology-images \
  --dataset=imaging-data \
  --location=us-central1 \
  --bq-table=bq://your-project.imaging_analytics.dicom_metadata
```

Query the exported metadata:

```sql
-- Find studies by modality and count instances per study
SELECT
  StudyInstanceUID,
  PatientName,
  Modality,
  StudyDate,
  COUNT(*) as instance_count,
  SUM(CAST(Rows AS INT64) * CAST(Columns AS INT64)) as total_pixels
FROM
  `your-project.imaging_analytics.dicom_metadata`
WHERE
  Modality = 'CT'
  AND StudyDate >= '20260101'
GROUP BY
  StudyInstanceUID, PatientName, Modality, StudyDate
ORDER BY
  instance_count DESC
LIMIT 20
```

## Storage and Cost Considerations

Medical imaging data is large:

- A single chest X-ray: 10-30 MB
- A CT scan: 50-500 MB
- An MRI study: 100 MB - 2 GB

For cost optimization:

- Use lifecycle policies on the underlying storage to move old studies to cheaper storage classes
- De-identify and delete source data after processing when possible
- Use QIDO-RS queries to retrieve only the metadata you need before downloading full studies
- Consider using the rendered endpoint for thumbnails instead of downloading full DICOM files

## Wrapping Up

The Healthcare API DICOM store gives you a standards-compliant PACS in the cloud. It speaks DICOMweb natively, so any DICOM-compatible viewer or application can connect to it directly. The built-in de-identification is particularly valuable for research workflows where you need to share imaging data without exposing patient information. Combined with BigQuery for metadata analytics and Pub/Sub for event-driven processing, you have a complete medical imaging platform that scales from a small clinic to a multi-hospital health system.
