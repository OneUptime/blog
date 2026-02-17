# How to Set Up Device Authentication for IoT Workloads on Google Cloud Using Service Accounts and JWT Tokens

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IoT, Authentication, JWT, Service Accounts

Description: Implement secure device authentication for IoT workloads on Google Cloud using service accounts, JWT tokens, and certificate-based identity.

---

With IoT Core retired, you need to handle device authentication yourself when connecting IoT devices to Google Cloud services. The most robust approach combines GCP service accounts with JWT tokens, giving each device (or group of devices) a cryptographically verifiable identity that grants access only to the specific resources it needs.

This guide walks through setting up a complete device authentication system that works with Pub/Sub, Cloud Storage, and other GCP services.

## Authentication Strategies for IoT Devices

There are several ways to authenticate IoT devices to GCP:

1. **Per-device service account keys** - each device gets its own key file. Most secure but hardest to manage at scale.
2. **Shared service account per device group** - devices in the same fleet share credentials. Easier to manage but less granular.
3. **Custom JWT tokens** - devices authenticate to your own token service, which issues short-lived GCP access tokens. Most flexible.
4. **Workload Identity Federation** - devices authenticate using their own identity provider and exchange tokens for GCP credentials.

For most IoT deployments, option 3 (custom JWT with a token exchange service) offers the best balance of security and manageability.

## Prerequisites

- GCP project with IAM and Pub/Sub APIs enabled
- OpenSSL for certificate generation
- Python 3.8+ on both the server and device side
- A Cloud Run or Cloud Functions deployment for the token service

## Step 1: Create the Device Service Account

Create a service account with minimal permissions that devices will use:

```bash
# Create a service account for IoT devices
gcloud iam service-accounts create iot-devices \
  --display-name="IoT Device Service Account"

# Grant only Pub/Sub publisher permissions
# This limits what devices can do even if credentials are compromised
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:iot-devices@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

# Also allow reading from command topics (for cloud-to-device messages)
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:iot-devices@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.subscriber"
```

## Step 2: Generate Device Certificates

Each device needs a public/private key pair. The private key stays on the device, and the public key is registered with your authentication service.

```bash
# Generate an EC256 private key for the device
# EC256 is preferred over RSA for IoT because the keys and signatures are smaller
openssl ecparam -genkey -name prime256v1 -noout -out device-001-private.pem

# Extract the public key
openssl ec -in device-001-private.pem -pubout -out device-001-public.pem

# Generate a self-signed certificate (optional, but useful for mTLS)
openssl req -new -x509 -key device-001-private.pem \
  -out device-001-cert.pem -days 365 \
  -subj "/CN=device-001/O=YourOrg"
```

## Step 3: Build the Token Exchange Service

This Cloud Function acts as your authentication server. Devices send a JWT signed with their private key, and the service validates it and returns a short-lived GCP access token.

```python
# token_service.py - Cloud Function that validates device JWTs
# and returns short-lived GCP access tokens

import json
import jwt
import time
from google.cloud import firestore
from google.auth import credentials
from google.oauth2 import service_account
import google.auth.transport.requests
import functions_framework

# Initialize Firestore for device registry
db = firestore.Client()

# The service account whose identity devices will assume
# This service account has the Pub/Sub permissions
TARGET_SA_EMAIL = "iot-devices@YOUR_PROJECT_ID.iam.gserviceaccount.com"

def get_device_public_key(device_id):
    """Retrieves the registered public key for a device from Firestore.
    Returns None if the device is not registered."""
    doc = db.collection("device_registry").document(device_id).get()
    if doc.exists:
        return doc.to_dict().get("public_key")
    return None

def generate_access_token():
    """Generates a short-lived OAuth2 access token for the device service account.
    The token expires in 1 hour."""
    # Load the service account credentials
    sa_credentials = service_account.Credentials.from_service_account_file(
        "service-account-key.json",
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    # Use the credentials to get an access token
    request = google.auth.transport.requests.Request()
    sa_credentials.refresh(request)
    return sa_credentials.token, sa_credentials.expiry.isoformat()

@functions_framework.http
def authenticate_device(request):
    """HTTP Cloud Function that authenticates devices.

    Devices send a POST with a JWT signed by their private key.
    The function validates the JWT against the registered public key
    and returns a GCP access token if authentication succeeds.
    """
    try:
        # Extract the device JWT from the request
        body = request.get_json()
        device_jwt = body.get("token")

        if not device_jwt:
            return json.dumps({"error": "Missing token"}), 400

        # Decode the JWT header to get the device ID (without verification first)
        unverified = jwt.decode(device_jwt, options={"verify_signature": False})
        device_id = unverified.get("sub")

        if not device_id:
            return json.dumps({"error": "Missing device ID in token"}), 400

        # Look up the device's public key from our registry
        public_key_pem = get_device_public_key(device_id)
        if not public_key_pem:
            return json.dumps({"error": "Device not registered"}), 403

        # Now verify the JWT signature with the registered public key
        payload = jwt.verify(
            device_jwt,
            public_key_pem,
            algorithms=["ES256"],
            options={
                "verify_exp": True,
                "verify_iat": True,
            },
        )

        # Authentication successful - generate a GCP access token
        access_token, expiry = generate_access_token()

        return json.dumps({
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_at": expiry,
            "device_id": device_id,
        }), 200

    except jwt.ExpiredSignatureError:
        return json.dumps({"error": "Token expired"}), 401
    except jwt.InvalidTokenError as e:
        return json.dumps({"error": f"Invalid token: {str(e)}"}), 401
    except Exception as e:
        return json.dumps({"error": f"Authentication failed: {str(e)}"}), 500
```

Deploy the token service:

```bash
# Deploy the authentication service as a Cloud Function
gcloud functions deploy authenticate-device \
  --runtime=python311 \
  --trigger-http \
  --allow-unauthenticated \
  --region=us-central1 \
  --source=. \
  --entry-point=authenticate_device
```

## Step 4: Register Devices

Store device public keys in Firestore:

```python
from google.cloud import firestore

db = firestore.Client()

def register_device(device_id, public_key_pem):
    """Registers a new device by storing its public key in Firestore.
    This public key is used to verify JWTs from the device."""

    db.collection("device_registry").document(device_id).set({
        "public_key": public_key_pem,
        "registered_at": firestore.SERVER_TIMESTAMP,
        "status": "active",
        "metadata": {
            "firmware_version": "1.0.0",
            "hardware_model": "sensor-v2",
        },
    })
    print(f"Registered device: {device_id}")

# Read the public key and register the device
with open("device-001-public.pem", "r") as f:
    public_key = f.read()

register_device("device-001", public_key)
```

## Step 5: Device-Side Authentication

Here is the code that runs on the IoT device to authenticate and get a GCP access token:

```python
# device_auth.py - Runs on the IoT device to handle authentication

import jwt
import time
import requests
import json

# Device identity
DEVICE_ID = "device-001"
PRIVATE_KEY_PATH = "/secure/device-001-private.pem"
TOKEN_SERVICE_URL = "https://us-central1-YOUR_PROJECT.cloudfunctions.net/authenticate-device"

class DeviceAuth:
    """Handles device authentication and token refresh.
    Caches the access token and refreshes it before expiry."""

    def __init__(self, device_id, private_key_path, token_service_url):
        self.device_id = device_id
        self.token_service_url = token_service_url
        self.access_token = None
        self.token_expiry = 0

        # Load the device's private key
        with open(private_key_path, "r") as f:
            self.private_key = f.read()

    def _create_device_jwt(self):
        """Creates a short-lived JWT signed with the device's private key.
        This JWT is sent to the token service to prove device identity."""
        now = int(time.time())
        payload = {
            "sub": self.device_id,
            "iat": now,
            "exp": now + 300,  # JWT valid for 5 minutes
            "aud": "gcp-iot-auth",
        }
        return jwt.encode(payload, self.private_key, algorithm="ES256")

    def get_access_token(self):
        """Returns a valid GCP access token, refreshing if necessary."""
        # Return cached token if still valid (with 60-second buffer)
        if self.access_token and time.time() < self.token_expiry - 60:
            return self.access_token

        # Create a device JWT and exchange it for a GCP access token
        device_jwt = self._create_device_jwt()
        response = requests.post(
            self.token_service_url,
            json={"token": device_jwt},
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            self.access_token = data["access_token"]
            self.token_expiry = time.time() + 3500  # Roughly 1 hour
            return self.access_token
        else:
            raise Exception(f"Auth failed: {response.text}")

# Usage with Pub/Sub
from google.cloud import pubsub_v1
from google.oauth2.credentials import Credentials

auth = DeviceAuth(DEVICE_ID, PRIVATE_KEY_PATH, TOKEN_SERVICE_URL)

def publish_telemetry(data):
    """Publishes telemetry data to Pub/Sub using the device's access token."""
    token = auth.get_access_token()
    creds = Credentials(token=token)

    publisher = pubsub_v1.PublisherClient(credentials=creds)
    topic = publisher.topic_path("YOUR_PROJECT_ID", "device-telemetry")

    future = publisher.publish(
        topic,
        data=json.dumps(data).encode("utf-8"),
        device_id=DEVICE_ID,
    )
    return future.result()
```

## Security Best Practices

- Store device private keys in secure hardware (TPM or secure enclave) when available
- Use short-lived JWTs (5 minutes or less) for the device-to-service exchange
- Rotate access tokens every hour
- Implement device revocation by removing the public key from Firestore
- Monitor for unusual authentication patterns using Cloud Logging
- Use VPC Service Controls to restrict Pub/Sub access to your project's network

## Wrapping Up

Building your own device authentication gives you more control than IoT Core ever provided. The JWT-based token exchange pattern is well-established in the industry and works with any MQTT broker or direct API access. The most important thing is to keep the attack surface small - give devices the minimum permissions they need and rotate credentials frequently.
