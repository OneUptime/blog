# How to Deploy Firebase Extensions That Interact with GCP Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Firebase, GCP, Extension, Cloud Function, Integration

Description: A hands-on guide to installing and configuring Firebase Extensions that connect with broader GCP services like BigQuery, Cloud Storage, and Pub/Sub.

---

Firebase Extensions are prebuilt packages of Cloud Functions that handle common tasks. What makes them particularly powerful is their ability to bridge Firebase and the broader GCP ecosystem. Want to automatically export Firestore data to BigQuery? There is an extension for that. Need to resize images uploaded to Cloud Storage? Extension. Send transactional emails when a document changes? Extension.

The tricky part is often the configuration and permissions setup, especially when an extension needs to interact with GCP services outside the Firebase bubble. This guide walks through deploying and configuring several popular extensions that span the Firebase-GCP boundary.

## Understanding Extension Architecture

Every Firebase Extension is a bundle containing:

- One or more Cloud Functions (triggered by Firestore, Storage, Auth, etc.)
- A service account with specific IAM roles
- Configuration parameters you set during installation
- Optional resources like Firestore collections or Storage buckets

When an extension interacts with GCP services, its service account needs appropriate roles for those services. Firebase usually handles this during installation, but sometimes things need manual adjustment.

## Extension 1: Firestore to BigQuery Export

This is one of the most popular extensions. It streams Firestore document changes to a BigQuery dataset in real time, letting you run SQL analytics on your Firestore data.

### Installing the Extension

Use the Firebase CLI to install it:

```bash
# Install the Firestore BigQuery Export extension

firebase ext:install firebase/firestore-bigquery-export \
  --project YOUR_PROJECT_ID
```

During installation, you will be prompted for configuration parameters.

Key parameters to set:

```text
Collection path: users
Dataset ID: firestore_export
Table ID: users
BigQuery project ID: YOUR_PROJECT_ID
```

### Verifying BigQuery Setup

After installation, check that the BigQuery dataset and table were created:

```bash
# List datasets in your project
bq ls --project_id YOUR_PROJECT_ID

# Check the table schema
bq show YOUR_PROJECT_ID:firestore_export.users_raw_changelog
```

### Querying Your Firestore Data in BigQuery

Once data starts flowing, you can query it with SQL:

```sql
-- Query recent user signups from the past 7 days
SELECT
  document_id,
  JSON_VALUE(data, '$.email') AS email,
  JSON_VALUE(data, '$.displayName') AS name,
  timestamp
FROM
  `YOUR_PROJECT_ID.firestore_export.users_raw_changelog`
WHERE
  operation = 'CREATE'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY
  timestamp DESC
LIMIT 100;
```

### Backfilling Existing Data

The extension only captures changes going forward. To backfill existing data, use the included import script:

```bash
# Run the backfill script
npx @firebaseextensions/fs-bq-import-collection \
  --non-interactive \
  --project YOUR_PROJECT_ID \
  --source-collection-path users \
  --dataset firestore_export \
  --table-name-prefix users \
  --query-collection-group false
```

## Extension 2: Resize Images

The Resize Images extension automatically creates resized versions of images uploaded to Cloud Storage. This is useful for generating thumbnails, avatars, and responsive image sizes.

### Installing and Configuring

```bash
firebase ext:install firebase/storage-resize-images \
  --project YOUR_PROJECT_ID
```

Configure it with these settings:

```text
Cloud Storage bucket: YOUR_PROJECT_ID.appspot.com
Sizes of resized images: 200x200,800x600,1200x1200
Deletion of original file: No
Make resized file public: No
Output images to a different bucket: No
Cache-Control header: max-age=86400
Convert image to preferred type: webp
```

### How It Works with Cloud Storage

The extension watches for new file uploads in the specified bucket. When an image is uploaded, the extension's Cloud Function triggers, creates resized versions, and stores them alongside the original.

The output file naming pattern looks like:

```text
Original: images/photo.jpg
Resized:  images/photo_200x200.webp
          images/photo_800x600.webp
          images/photo_1200x1200.webp
```

### Integrating with Your Application

Update your application to use the resized versions:

```javascript
import { useEffect, useState } from "react";
import { getDownloadURL, getStorage, ref } from "firebase/storage";

// Helper to get the resized image URL
function getResizedImageUrl(originalPath, size) {
  // Remove the file extension
  const lastDot = originalPath.lastIndexOf(".");
  const pathWithoutExt = originalPath.substring(0, lastDot);

  // Construct the resized image path
  return `${pathWithoutExt}_${size}.webp`;
}

// Usage in a React component
function UserAvatar({ imagePath }) {
  const thumbnailPath = getResizedImageUrl(imagePath, "200x200");
  const [url, setUrl] = useState(null);

  useEffect(() => {
    const storage = getStorage();

    getDownloadURL(ref(storage, thumbnailPath))
      .then(setUrl)
      .catch(() => {
        // Fall back to original if resized version is not ready yet
        getDownloadURL(ref(storage, imagePath)).then(setUrl);
      });
  }, [imagePath, thumbnailPath]);

  return url ? <img src={url} alt="avatar" /> : <div>Loading...</div>;
}
```

## Extension 3: Trigger Email from Firestore

This extension sends emails when documents are created in a specified Firestore collection. It works with any SMTP service or SendGrid.

### Installation

```bash
firebase ext:install firebase/firestore-send-email \
  --project YOUR_PROJECT_ID
```

Configuration parameters:

```text
SMTP connection URI: smtps://username:password@smtp.sendgrid.net:465
Email documents collection: mail
Default FROM address: noreply@yourdomain.com
Templates collection: mail_templates
```

### Sending an Email

To send an email, create a document in the `mail` collection:

```javascript
// Send a welcome email when a user signs up
import { getFirestore, collection, addDoc } from "firebase/firestore";

async function sendWelcomeEmail(userEmail, userName) {
  const db = getFirestore();

  await addDoc(collection(db, "mail"), {
    to: [userEmail],
    message: {
      subject: "Welcome to Our App",
      html: `
        <h1>Welcome, ${userName}!</h1>
        <p>Thanks for signing up. Here are some things to get you started...</p>
      `
    }
  });
}
```

### Using Email Templates

For more complex emails, use Handlebars templates stored in Firestore:

```javascript
// First, create a template document in the configured templates collection
await setDoc(doc(db, "mail_templates", "welcome"), {
  subject: "Welcome to {{appName}}, {{userName}}!",
  html: `
    <h1>Hello {{userName}}</h1>
    <p>Welcome to {{appName}}. Your account is ready.</p>
    <a href="{{dashboardUrl}}">Go to Dashboard</a>
  `
});

// Then send an email using the template
await addDoc(collection(db, "mail"), {
  to: [userEmail],
  template: {
    name: "welcome",
    data: {
      userName: "Alice",
      appName: "MyApp",
      dashboardUrl: "https://myapp.com/dashboard"
    }
  }
});
```

## Extension 4: Stream Collections to Pub/Sub

There is not currently an official Firebase Extension named `firebase/firestore-pubsub`. To publish Firestore document changes to a Cloud Pub/Sub topic, use a Firestore-triggered Cloud Function. This is incredibly useful for event-driven architectures where multiple downstream services need to react to data changes.

### Publishing Firestore Changes

Install the Pub/Sub client in your functions package:

```bash
npm install @google-cloud/pubsub
```

Create the Pub/Sub topic:

```bash
gcloud pubsub topics create firestore-changes \
  --project YOUR_PROJECT_ID
```

```javascript
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { PubSub } from "@google-cloud/pubsub";

const pubsub = new PubSub();
const topicName = "firestore-changes";

export const publishUserChanges = onDocumentWritten("users/{userId}", async (event) => {
  await pubsub.topic(topicName).publishMessage({
    json: {
      documentPath: event.document,
      params: event.params,
      before: event.data?.before.exists ? event.data.before.data() : null,
      after: event.data?.after.exists ? event.data.after.data() : null,
    },
  });
});
```

### Setting Up Downstream Subscribers

After deploying the function, create Pub/Sub subscribers to consume the events:

```bash
# Create a subscription for order processing
gcloud pubsub subscriptions create order-processor \
  --topic=firestore-changes \
  --push-endpoint=https://order-service-xxx.run.app/process \
  --ack-deadline=60

# Create a subscription for analytics
gcloud pubsub subscriptions create analytics-ingester \
  --topic=firestore-changes \
  --push-endpoint=https://analytics-xxx.run.app/ingest \
  --ack-deadline=30
```

## Managing Extensions

After installation, you can manage extensions through the CLI.

These commands help you list, update, and configure installed extensions:

```bash
# List all installed extensions
firebase ext:list --project YOUR_PROJECT_ID

# Update an extension to the latest version
firebase ext:update INSTANCE_ID --project YOUR_PROJECT_ID

# Reconfigure an installed extension
firebase ext:configure INSTANCE_ID --project YOUR_PROJECT_ID

# Uninstall an extension
firebase ext:uninstall INSTANCE_ID --project YOUR_PROJECT_ID
```

## Monitoring Extension Health

Extensions are Cloud Functions under the hood, so you can monitor them through Cloud Monitoring and Cloud Logging.

```bash
# View logs for a specific extension
firebase functions:log \
  --only ext-firestore-bigquery-export-syncBigQuery \
  --project YOUR_PROJECT_ID
```

Set up alerts in Cloud Monitoring for extension function errors to catch problems early.

## Summary

Firebase Extensions that interact with GCP services bridge the gap between Firebase's developer-friendly APIs and GCP's enterprise capabilities. The Firestore-to-BigQuery extension opens up SQL analytics on your document data. The Resize Images extension offloads image processing to Cloud Functions automatically. The email extension integrates with any SMTP provider through Firestore triggers. And a small Firestore-triggered Cloud Function can connect Firestore changes to Pub/Sub-based event-driven architectures. Install extensions through the CLI, verify the service account permissions, and monitor through Cloud Logging - the extensions handle the rest.
