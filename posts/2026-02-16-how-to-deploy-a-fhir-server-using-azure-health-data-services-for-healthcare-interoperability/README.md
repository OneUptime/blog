# How to Deploy a FHIR Server Using Azure Health Data Services for Healthcare Interoperability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Health Data Services, FHIR, Healthcare, Interoperability, HL7, API, Clinical Data

Description: A practical guide to deploying a FHIR server using Azure Health Data Services to enable healthcare data interoperability and standards-based clinical data exchange.

---

Healthcare data interoperability has been a problem for decades. Different hospitals, clinics, and systems store patient data in incompatible formats, making it difficult to share information when patients move between providers. FHIR (Fast Healthcare Interoperability Resources) is the modern standard that solves this. It defines a RESTful API for exchanging healthcare data in a consistent format. Azure Health Data Services provides a managed FHIR server that you can deploy in minutes, and this guide walks through the process from start to finish.

## What Is FHIR and Why It Matters

FHIR is an HL7 standard that represents clinical data as resources - things like Patient, Observation, MedicationRequest, Condition, and Encounter. Each resource has a defined structure and is accessible through a REST API. Instead of writing custom integrations between every pair of healthcare systems, you expose and consume data through a standardized FHIR API.

Azure Health Data Services gives you a fully managed FHIR R4 server. You do not need to worry about database management, scaling, security patching, or FHIR specification compliance. Microsoft handles all of that. You focus on building applications that read and write FHIR data.

## Prerequisites

- An Azure subscription
- Azure CLI installed
- An Azure AD tenant for authentication
- Basic familiarity with REST APIs and JSON

## Step 1: Create the Azure Health Data Services Workspace

The workspace is the top-level container for all health data services:

```bash
# Set up variables
RESOURCE_GROUP="rg-health-data"
WORKSPACE_NAME="healthworkspace01"
LOCATION="eastus"

# Create the resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create the Health Data Services workspace
az healthcareapis workspace create \
    --name $WORKSPACE_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION
```

## Step 2: Deploy the FHIR Service

Within the workspace, create a FHIR service instance:

```bash
# Create the FHIR service
FHIR_SERVICE_NAME="fhir-clinical"

az healthcareapis fhir-service create \
    --name $FHIR_SERVICE_NAME \
    --workspace-name $WORKSPACE_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --kind "fhir-R4" \
    --authority "https://login.microsoftonline.com/<tenant-id>" \
    --audience "https://${WORKSPACE_NAME}-${FHIR_SERVICE_NAME}.fhir.azurehealthcareapis.com"
```

The deployment takes a few minutes. Once complete, your FHIR server is accessible at:
`https://<workspace-name>-<fhir-service-name>.fhir.azurehealthcareapis.com`

## Step 3: Configure Authentication

Azure Health Data Services uses Azure AD for authentication. You need to register an application and assign the appropriate FHIR roles.

### Register an Azure AD Application

```bash
# Register an application in Azure AD for FHIR access
APP_NAME="fhir-client-app"

# Create the app registration
APP_ID=$(az ad app create \
    --display-name $APP_NAME \
    --sign-in-audience AzureADMyOrg \
    --query appId -o tsv)

# Create a client secret
CLIENT_SECRET=$(az ad app credential reset \
    --id $APP_ID \
    --query password -o tsv)

# Create a service principal for the app
az ad sp create --id $APP_ID

echo "Client ID: $APP_ID"
echo "Client Secret: $CLIENT_SECRET"
```

### Assign FHIR Roles

Azure Health Data Services has built-in roles for FHIR access:

```bash
# Get the FHIR service resource ID
FHIR_ID=$(az healthcareapis fhir-service show \
    --name $FHIR_SERVICE_NAME \
    --workspace-name $WORKSPACE_NAME \
    --resource-group $RESOURCE_GROUP \
    --query id -o tsv)

# Assign the FHIR Data Contributor role to the service principal
# This role allows read and write access to FHIR data
az role assignment create \
    --role "FHIR Data Contributor" \
    --assignee $APP_ID \
    --scope $FHIR_ID

# For read-only access, use "FHIR Data Reader" instead
# For admin operations, use "FHIR Data Exporter" or "FHIR Data Importer"
```

## Step 4: Test the FHIR Server

Now let us verify the FHIR server is working by performing basic operations.

### Get an Access Token

```bash
# Get an OAuth2 access token for the FHIR server
TENANT_ID=$(az account show --query tenantId -o tsv)
FHIR_URL="https://${WORKSPACE_NAME}-${FHIR_SERVICE_NAME}.fhir.azurehealthcareapis.com"

TOKEN=$(curl -s -X POST \
    "https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token" \
    -d "grant_type=client_credentials" \
    -d "client_id=${APP_ID}" \
    -d "client_secret=${CLIENT_SECRET}" \
    -d "scope=${FHIR_URL}/.default" \
    | jq -r '.access_token')
```

### Check the FHIR Metadata Endpoint

Every FHIR server exposes a metadata endpoint that describes its capabilities:

```bash
# Query the FHIR capability statement
curl -s -H "Authorization: Bearer $TOKEN" \
    "${FHIR_URL}/metadata" | jq '.fhirVersion, .status'
```

### Create a Patient Resource

```bash
# Create a Patient resource using the FHIR REST API
curl -s -X POST \
    "${FHIR_URL}/Patient" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/fhir+json" \
    -d '{
        "resourceType": "Patient",
        "name": [{
            "use": "official",
            "family": "Smith",
            "given": ["John", "Michael"]
        }],
        "gender": "male",
        "birthDate": "1985-07-15",
        "address": [{
            "use": "home",
            "line": ["123 Main Street"],
            "city": "Seattle",
            "state": "WA",
            "postalCode": "98101"
        }],
        "telecom": [{
            "system": "phone",
            "value": "555-0123",
            "use": "mobile"
        }],
        "identifier": [{
            "system": "http://hospital.example.org/mrn",
            "value": "MRN-12345"
        }]
    }' | jq '.id, .meta.versionId'
```

### Search for Patients

FHIR search is powerful. You can query patients by name, identifier, birthdate, and many other parameters:

```bash
# Search for patients by last name
curl -s -H "Authorization: Bearer $TOKEN" \
    "${FHIR_URL}/Patient?family=Smith" | jq '.total, .entry[].resource.name'

# Search by identifier (medical record number)
curl -s -H "Authorization: Bearer $TOKEN" \
    "${FHIR_URL}/Patient?identifier=MRN-12345" | jq '.entry[].resource.id'

# Search with multiple criteria
curl -s -H "Authorization: Bearer $TOKEN" \
    "${FHIR_URL}/Patient?family=Smith&birthdate=1985-07-15" | jq '.total'
```

## Step 5: Create Clinical Resources

A patient record alone is not very useful. Let us add some clinical data.

### Create an Observation (Lab Result)

```bash
# Create a blood pressure observation linked to the patient
# Replace PATIENT_ID with the actual patient ID from the creation step
PATIENT_ID="<patient-id>"

curl -s -X POST \
    "${FHIR_URL}/Observation" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/fhir+json" \
    -d '{
        "resourceType": "Observation",
        "status": "final",
        "category": [{
            "coding": [{
                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                "code": "vital-signs",
                "display": "Vital Signs"
            }]
        }],
        "code": {
            "coding": [{
                "system": "http://loinc.org",
                "code": "85354-9",
                "display": "Blood pressure panel"
            }]
        },
        "subject": {
            "reference": "Patient/'"$PATIENT_ID"'"
        },
        "effectiveDateTime": "2026-02-16T10:30:00Z",
        "component": [{
            "code": {
                "coding": [{
                    "system": "http://loinc.org",
                    "code": "8480-6",
                    "display": "Systolic blood pressure"
                }]
            },
            "valueQuantity": {
                "value": 120,
                "unit": "mmHg",
                "system": "http://unitsofmeasure.org",
                "code": "mm[Hg]"
            }
        }, {
            "code": {
                "coding": [{
                    "system": "http://loinc.org",
                    "code": "8462-4",
                    "display": "Diastolic blood pressure"
                }]
            },
            "valueQuantity": {
                "value": 80,
                "unit": "mmHg",
                "system": "http://unitsofmeasure.org",
                "code": "mm[Hg]"
            }
        }]
    }'
```

### Query a Patient's Clinical History

```bash
# Get all observations for a specific patient
curl -s -H "Authorization: Bearer $TOKEN" \
    "${FHIR_URL}/Observation?subject=Patient/${PATIENT_ID}" \
    | jq '.entry[].resource | {code: .code.coding[0].display, date: .effectiveDateTime}'

# Use _include to get the patient resource along with observations
curl -s -H "Authorization: Bearer $TOKEN" \
    "${FHIR_URL}/Observation?subject=Patient/${PATIENT_ID}&_include=Observation:subject" \
    | jq '.entry[] | {type: .resource.resourceType, id: .resource.id}'
```

## Step 6: Configure CORS for Web Applications

If you are building a web application that accesses the FHIR API directly, you need to configure CORS:

```bash
# Update FHIR service with CORS settings
az healthcareapis fhir-service update \
    --name $FHIR_SERVICE_NAME \
    --workspace-name $WORKSPACE_NAME \
    --resource-group $RESOURCE_GROUP \
    --cors-origins "https://myapp.example.com" \
    --cors-headers "Authorization,Content-Type,Accept" \
    --cors-methods "GET,POST,PUT,DELETE" \
    --cors-max-age 600
```

## Networking and Security

For production deployments, restrict network access to your FHIR server:

```bash
# Enable private endpoints for the FHIR service
az network private-endpoint create \
    --name pe-fhir \
    --resource-group $RESOURCE_GROUP \
    --vnet-name vnet-health \
    --subnet subnet-private-endpoints \
    --private-connection-resource-id $FHIR_ID \
    --group-id fhirservices \
    --connection-name fhir-connection
```

This ensures that FHIR API traffic stays on your private network and is not exposed to the public internet.

## Monitoring and Auditing

Azure Health Data Services integrates with Azure Monitor for logging and auditing. Enable diagnostic settings to track who accessed what data:

```bash
# Enable diagnostic logging for FHIR audit trails
az monitor diagnostic-settings create \
    --name fhir-audit-logs \
    --resource $FHIR_ID \
    --workspace law-health-monitoring \
    --logs '[{"category": "AuditLogs", "enabled": true}]'
```

Audit logs are critical in healthcare. Regulations like HIPAA require that you track access to protected health information (PHI). The audit logs record every FHIR API call, including who made it, when, and what resources were accessed.

## Summary

Deploying a FHIR server with Azure Health Data Services gives you a managed, standards-compliant platform for healthcare data exchange. The setup involves creating a workspace, deploying the FHIR service, configuring Azure AD authentication, and assigning appropriate roles. From there, you can create and query FHIR resources through a standard REST API. For production, add private networking, audit logging, and CORS configuration for web clients. The FHIR standard combined with Azure's managed infrastructure lets you focus on building healthcare applications instead of managing database servers and worrying about specification compliance.
