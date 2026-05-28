# How to Import FHIR Bundles into Google Cloud Healthcare API from Cloud Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Healthcare API, FHIR, Data Import, Cloud Storage

Description: Import FHIR bundles and NDJSON files from Cloud Storage into Google Cloud Healthcare API FHIR stores for bulk data loading.

---

When you are migrating from another FHIR server, loading test data, or ingesting data from a partner, you often have FHIR resources in bulk format - either as FHIR Bundles (JSON files containing multiple resources) or as NDJSON files (one resource per line). The Healthcare API supports importing these directly from Cloud Storage, which is much faster than creating resources one at a time through the API.

This guide covers importing FHIR data in various formats, handling errors, and validating the import results.

## Import Formats

The Healthcare API accepts several formats for bulk import:

1. **FHIR Bundle JSON**: A standard FHIR Bundle resource containing multiple entries in a single JSON file. Use `BUNDLE_PRETTY` for this format.
2. **NDJSON (Newline-Delimited JSON)**: One FHIR resource per line. More efficient for large datasets because it can be processed in parallel.
3. **FHIR Bundle NDJSON**: Each line is a FHIR Bundle. Use `BUNDLE` for this format.
4. **Single-resource JSON**: One FHIR resource in a JSON file. Use `RESOURCE_PRETTY` for this format.

## Prerequisites

- A FHIR R4 store already created in the Healthcare API
- FHIR data files in Cloud Storage
- Python 3.8+

```bash
pip install google-api-python-client google-auth
```

## Step 1: Prepare FHIR Bundle Files

Here is an example of a FHIR Bundle containing Patient resources:

```python
# prepare_bundle.py - Creates FHIR bundle files for import

import random
import json

def create_patient_bundle(num_patients=100):
    """Creates a FHIR Transaction Bundle with patient resources.
    Each patient has a unique MRN identifier and basic demographics."""

    bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [],
    }

    first_names = ["John", "Jane", "Robert", "Maria", "James", "Patricia",
                   "Michael", "Linda", "William", "Barbara"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones",
                  "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]

    for i in range(num_patients):
        patient_id = f"patient-{10000 + i}"
        patient = {
            "resourceType": "Patient",
            "id": patient_id,
            "identifier": [
                {
                    "system": "http://hospital.example.com/mrn",
                    "value": f"MRN-{10000 + i}",
                }
            ],
            "name": [
                {
                    "use": "official",
                    "family": random.choice(last_names),
                    "given": [random.choice(first_names)],
                }
            ],
            "gender": random.choice(["male", "female"]),
            "birthDate": f"{random.randint(1940, 2005)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
        }

        # fhirStores.import uses the resource id and ignores Bundle.entry.request.
        # The request block is used only when executing this as a transaction bundle.
        entry = {
            "resource": patient,
            "request": {
                "method": "PUT",
                "url": f"Patient/{patient_id}",
            },
        }
        bundle["entry"].append(entry)

    return bundle

def create_ndjson_file(resources):
    """Converts a list of FHIR resources into NDJSON format.
    Each resource is serialized as a single line of JSON."""

    lines = []
    for resource in resources:
        lines.append(json.dumps(resource, separators=(",", ":")))
    return "\n".join(lines)

# Create a bundle and save it

bundle = create_patient_bundle(100)
with open("patients_bundle.json", "w") as f:
    json.dump(bundle, f, indent=2)

# Create NDJSON format
patients = [entry["resource"] for entry in bundle["entry"]]
ndjson_content = create_ndjson_file(patients)
with open("patients.ndjson", "w") as f:
    f.write(ndjson_content)

print(f"Created bundle with {len(bundle['entry'])} patients")
print(f"Created NDJSON file with {len(patients)} patients")
```

Upload the files to Cloud Storage:

```bash
# Upload FHIR data files to Cloud Storage
gsutil cp patients_bundle.json gs://your-healthcare-bucket/import/
gsutil cp patients.ndjson gs://your-healthcare-bucket/import/
```

## Step 2: Import Using the gcloud CLI

The simplest way to import is using the gcloud command:

```bash
# Import a FHIR Bundle JSON file
gcloud healthcare fhir-stores import gcs my-fhir-store \
  --dataset=my-health-dataset \
  --location=us-central1 \
  --gcs-uri=gs://your-healthcare-bucket/import/patients_bundle.json \
  --content-structure=BUNDLE_PRETTY

# Import NDJSON files (one resource per line)
gcloud healthcare fhir-stores import gcs my-fhir-store \
  --dataset=my-health-dataset \
  --location=us-central1 \
  --gcs-uri=gs://your-healthcare-bucket/import/patients.ndjson \
  --content-structure=RESOURCE
```

## Step 3: Import Programmatically

For automated pipelines, use the Python client:

```python
# import_fhir.py - Programmatic FHIR data import from GCS

from googleapiclient import discovery
from google.oauth2 import service_account
import time

def get_healthcare_client():
    """Creates an authenticated Healthcare API client."""
    credentials = service_account.Credentials.from_service_account_file(
        "service-account-key.json",
        scopes=["https://www.googleapis.com/auth/cloud-healthcare"],
    )
    return discovery.build("healthcare", "v1", credentials=credentials)

PROJECT_ID = "your-project"
LOCATION = "us-central1"
DATASET_ID = "my-health-dataset"
FHIR_STORE_ID = "my-fhir-store"

def import_fhir_resources(gcs_uri, content_structure="RESOURCE"):
    """Imports FHIR resources from Cloud Storage into the FHIR store.

    Args:
        gcs_uri: GCS path to the import file(s). Supports wildcards.
        content_structure: One of RESOURCE, BUNDLE, BUNDLE_PRETTY, or RESOURCE_PRETTY.
            RESOURCE means each line is a single FHIR resource (NDJSON).
            BUNDLE means each line is a FHIR Bundle.
            BUNDLE_PRETTY means the entire file is one FHIR Bundle.
    """

    client = get_healthcare_client()

    fhir_store_path = (
        f"projects/{PROJECT_ID}/locations/{LOCATION}/"
        f"datasets/{DATASET_ID}/fhirStores/{FHIR_STORE_ID}"
    )

    # Build the import request body
    body = {
        "gcsSource": {
            "uri": gcs_uri,
        },
        "contentStructure": content_structure,
    }

    # Start the import operation
    request = (
        client.projects()
        .locations()
        .datasets()
        .fhirStores()
        .import_(name=fhir_store_path, body=body)
    )

    operation = request.execute()
    operation_name = operation["name"]
    print(f"Import started: {operation_name}")

    return operation_name

def wait_for_operation(operation_name):
    """Polls the operation until it completes and returns the result."""

    client = get_healthcare_client()

    while True:
        result = (
            client.projects()
            .locations()
            .datasets()
            .operations()
            .get(name=operation_name)
            .execute()
        )

        if "done" in result and result["done"]:
            if "error" in result:
                print(f"Import failed: {result['error']}")
            else:
                print("Import completed successfully")
                if "response" in result:
                    print(f"Response: {result['response']}")
            return result

        print("Import in progress...")
        time.sleep(10)

# Import NDJSON files using a wildcard pattern
operation = import_fhir_resources(
    gcs_uri="gs://your-healthcare-bucket/import/*.ndjson",
    content_structure="RESOURCE",
)
result = wait_for_operation(operation)
```

## Step 4: Handle Import Errors

Imports can partially succeed. Some resources might fail validation while others succeed. Check the operation metadata and Cloud Logging for error details:

```python
def import_with_error_handling(gcs_uri, content_structure="RESOURCE"):
    """Imports FHIR resources and prints operation counters.
    Detailed import errors are available in Cloud Logging."""

    client = get_healthcare_client()

    fhir_store_path = (
        f"projects/{PROJECT_ID}/locations/{LOCATION}/"
        f"datasets/{DATASET_ID}/fhirStores/{FHIR_STORE_ID}"
    )

    body = {
        "gcsSource": {
            "uri": gcs_uri,
        },
        "contentStructure": content_structure,
    }

    operation = (
        client.projects()
        .locations()
        .datasets()
        .fhirStores()
        .import_(name=fhir_store_path, body=body)
        .execute()
    )

    result = wait_for_operation(operation["name"])

    # Check the operation metadata for import counters
    if "metadata" in result:
        metadata = result["metadata"]
        counter = metadata.get("counter", {})
        print(f"Import summary:")
        print(f"  Success count: {counter.get('success', 0)}")
        print(f"  Failure count: {counter.get('failure', 0)}")
        if metadata.get("logsUrl"):
            print(f"  Error logs: {metadata['logsUrl']}")

    return result

# Import with error tracking
result = import_with_error_handling(
    "gs://your-healthcare-bucket/import/patients.ndjson"
)
```

## Step 5: Validate Imported Data

After import, verify the data is correct:

```python
def validate_import(expected_count, resource_type="Patient"):
    """Validates the import by counting resources and spot-checking data."""

    client = get_healthcare_client()

    fhir_store_path = (
        f"projects/{PROJECT_ID}/locations/{LOCATION}/"
        f"datasets/{DATASET_ID}/fhirStores/{FHIR_STORE_ID}"
    )

    # Search for all resources of the given type
    result = (
        client.projects()
        .locations()
        .datasets()
        .fhirStores()
        .fhir()
        .search(
            parent=fhir_store_path,
            resourceType=resource_type,
            body={},
        )
        .execute()
    )

    total = result.get("total", 0)
    entries = result.get("entry", [])

    print(f"Validation for {resource_type}:")
    print(f"  Expected: {expected_count}")
    print(f"  Found: {total}")
    print(f"  Match: {'YES' if total >= expected_count else 'NO'}")

    # Spot check first few entries
    print(f"\nSample resources:")
    for entry in entries[:3]:
        resource = entry["resource"]
        print(f"  ID: {resource['id']}")
        if resource_type == "Patient":
            name = resource.get("name", [{}])[0]
            print(f"  Name: {name.get('family', 'N/A')}, "
                  f"{' '.join(name.get('given', []))}")

    return total

validate_import(expected_count=100, resource_type="Patient")
```

## Step 6: Bulk Import with Transaction Bundles

For imports where you need atomicity (all-or-nothing), use transaction bundles:

```python
def execute_transaction_bundle(bundle):
    """Executes a FHIR transaction bundle against the FHIR store.
    All resources in the bundle are created atomically.
    If any resource fails validation, the entire transaction is rolled back."""

    import json
    from google.auth.transport import requests
    from google.oauth2 import service_account

    credentials = service_account.Credentials.from_service_account_file(
        "service-account-key.json",
        scopes=["https://www.googleapis.com/auth/cloud-healthcare"],
    )
    session = requests.AuthorizedSession(credentials)

    fhir_store_path = (
        f"projects/{PROJECT_ID}/locations/{LOCATION}/"
        f"datasets/{DATASET_ID}/fhirStores/{FHIR_STORE_ID}"
    )

    url = f"https://healthcare.googleapis.com/v1/{fhir_store_path}/fhir"
    response = session.post(
        url,
        headers={"Content-Type": "application/fhir+json;charset=utf-8"},
        data=json.dumps(bundle),
    )
    response.raise_for_status()
    result = response.json()

    # Count successful entries
    entries = result.get("entry", [])
    created = sum(1 for e in entries if e.get("response", {}).get("status", "").startswith("201"))
    updated = sum(1 for e in entries if e.get("response", {}).get("status", "").startswith("200"))

    print(f"Transaction complete: {created} created, {updated} updated")
    return result
```

## Performance Tips for Large Imports

- **Use NDJSON format**: It processes faster than Bundle format because resources can be imported in parallel.
- **Split large files**: Keep individual files under 1 GB. The import can handle wildcards to process multiple files.
- **Validate references after import**: The import process does not enforce referential integrity, so invalid references can be imported if the source data contains them.
- **Use content-structure=RESOURCE**: For NDJSON files, this is the most efficient import mode.
- **Use executeBundle when you need FHIR semantics**: `fhirStores.import` treats bundles as collections of resources and does not apply transaction or conditional-create semantics.

## Wrapping Up

Bulk importing FHIR data is essential for migrations, data loads, and testing. The Healthcare API's GCS import capability handles the heavy lifting - you just need to get your data into the right format and upload it to Cloud Storage. For ongoing data integration, use Cloud Storage or pipeline notifications to trigger downstream processing when new files arrive; FHIR store Pub/Sub notifications are not sent for `fhirStores.import`. The key is getting the data format right (NDJSON for large datasets, transaction bundles through `executeBundle` when you need atomic writes) and validating the import results before putting the data into production use.
